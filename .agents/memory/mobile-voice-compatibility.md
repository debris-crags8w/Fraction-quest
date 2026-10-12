---
name: Mobile voice API compatibility
description: Partial iOS speech APIs and playback completion safeguards.
---

Treat browser APIs as partially implemented on mobile Safari and embedded browsers. Older WebViews may lack `String.prototype.matchAll()`, which can crash lesson generation and math/text rendering; use the shared regex-execution helper instead. Kokoro playback also crashes in the iOS preview when selected, while the iOS device voice works; route iOS through its device voice. SpeechSynthesis event methods may be missing, and the available device voice list may appear asynchronously without an event. `HTMLAudioElement.play()` may not return a Promise.

**Why:** an embedded iPhone browser produced an `undefined is not a function` runtime error from lesson generation when `String.prototype.matchAll()` was unavailable, and a separate report confirmed Kokoro alone crashes after Listen on iOS while device speech does not. Preview testing also showed partial speech APIs and `audio.play()` differences that desktop Chromium did not reproduce.

**How to apply:** avoid relying on `String.prototype.matchAll()` in app code. Keep Kokoro off on iOS and clearly explain the device-voice fallback; feature-detect and guard speech event registration, briefly poll for device voices when needed, and handle audio completion through media events plus bounded timeouts. Test missing text/speech APIs and non-Promise `play()` results. Validate actual audio separately on real iOS and Android devices.
