---
name: Mobile voice API compatibility
description: Partial iOS speech APIs and playback completion safeguards.
---

Treat browser APIs as partially implemented on mobile Safari and embedded browsers. Older WebViews may lack `String.prototype.matchAll()`, which can crash lesson generation and math/text rendering; use the shared regex-execution helper instead. Kokoro still fails during model initialization in Safari on iOS 26.6, while ordinary iOS lesson audio should continue using the device voice. A desktop Chromium run with an iPhone user agent is not evidence of real iOS support. SpeechSynthesis event methods may be missing, and the available device voice list may appear asynchronously without an event. `HTMLAudioElement.play()` may not return a Promise.

**Why:** an embedded iPhone browser produced an `undefined is not a function` runtime error from lesson generation when `String.prototype.matchAll()` was unavailable, and a separate report confirmed Kokoro alone crashes after Listen on iOS while device speech does not. A real Safari 26.6 Kokoro test still crashed during model initialization despite single-threaded WASM settings. The previously reported iOS SIMD regression was fixed in Safari 16.5.1, so do not assume it explains modern iPhone failures.

**Root cause found (2026-10-12):** Transformers.js 3.8 imports the default `onnxruntime-web` entry, which is the WebGPU-enabled JSEP build, and points `wasmPaths` at its own jsDelivr copy of the 1.22-dev JSEP binary. So the 1.30.0 override changed only the JS layer; iOS still ran the old JSEP wasm. ONNX Runtime issue #26827: JSEP has severe CPU/memory problems in Safari/WebKit 26 and crashes on iOS, while the plain WASM build works. Fix: `vite.config.ts` aliases `onnxruntime-web` → `onnxruntime-web/wasm`, and `src/lib/onnx-runtime.ts` sets `env.wasm.wasmPaths` to the app's own bundled `ort-wasm-simd-threaded.{wasm,mjs}` before kokoro-js loads. The diagnostic saves a breadcrumb per step in localStorage so a Safari out-of-memory reload reports the last step reached. Still needs a real iPhone run before lifting the iOS lesson guard.

**Decision (2026-10-12): Kokoro runs on the server now.** The in-browser model kept failing on iPhone 17 / Safari 26 (`undefined is not a function (near '...A4 of e3...')` inside the minified ONNX/Transformers code) even on the plain-WASM build, so the user chose server-side Kokoro. `artifacts/api-server/src/lib/voice.ts` loads kokoro-js (onnxruntime-node) once, makes 16-bit WAVs, queues one sentence at a time, caches by sha256 in memory (300) and on disk (`VOICE_CACHE_DIR`, default tmp). Routes: `GET /api/voice/status` (also starts the model load) and `GET /api/voice/speech?voice=&text=` (≤400 chars, voices whitelisted, 60 new sentences/min per IP, cache hits free, `immutable` caching). The browser no longer depends on kokoro-js/onnxruntime-web; `natural-voice.ts` fetches audio, polls status while the server loads, and plays through one shared `Audio` element unlocked on the Listen tap (iOS needs a gesture). App startup pings the status so the first Listen is natural. Device voice remains the fallback when the server is unreachable. The API server can download the model from Hugging Face and synthesize the configured voices.

**Server Kokoro runtime:** pnpm strict isolation needs an explicit `onnxruntime-common` package extension for Transformers.js 3.8.1. Also, the API build's global `__dirname` makes kokoro-js resolve voice embeddings relative to the API bundle rather than its installed package, so the build must stage the selected `.bin` voice files at the path the Node loader expects. Model status reaching `ready` does not prove a voice can synthesize.

**Why:** status returned `ready` while speech requests failed with a missing voice-file error; exercising the actual speech route exposed both packaging issues.

**How to apply:** after Kokoro, Transformers, or API build changes, verify actual WAV synthesis for every enabled voice, not just module import or `/api/voice/status`; keep the staged voice list aligned with the UI's choices.

**How to apply:** avoid relying on `String.prototype.matchAll()` in app code. Keep Kokoro off for normal iOS lessons and clearly explain the device-voice fallback; only an explicit adult diagnostic may temporarily bypass that guard, without changing the saved voice. Use the current stable ONNX Runtime and one WASM thread for the diagnostic, but leave SIMD feature detection enabled. Verify model loading and audio generation on real Safari; desktop Chromium is only a smoke test. Feature-detect and guard speech event registration, briefly poll for device voices when needed, and handle audio completion through media events plus bounded timeouts. Test missing text/speech APIs and non-Promise `play()` results. Validate actual audio separately on real iOS and Android devices.

### Replit Expo DevTools on Nix

React Native 0.86.3's optional Linux DevTools binary needs the `glib` system package (`libglib-2.0.so.0`). Expo can continue starting Metro without it, but logs a DevTools installation error.

**Why:** the warning persisted through an Expo restart until the Nix environment included GLib; after installation Metro started without the warning.

**How to apply:** add `glib` with the system-dependency installer when this exact missing-library warning appears; do not change Expo app code or disable DevTools as a workaround.
