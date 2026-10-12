---
name: Mobile voice API compatibility
description: Partial iOS speech APIs and playback completion safeguards.
---

Treat browser speech APIs as partially implemented on mobile Safari and embedded browsers. SpeechSynthesis event methods may be missing, and the available device voice list may appear asynchronously without an event. `HTMLAudioElement.play()` may not return a Promise.

**Why:** a mobile voice preview produced an `undefined is not a function` runtime error and could remain stuck on “Playing,” while desktop Chromium did not reproduce those API differences.

**How to apply:** feature-detect and guard speech event registration, briefly poll for device voices when needed, and handle audio completion through media events plus bounded timeouts. Keep a clear fallback path and test missing event methods and non-Promise `play()` results. Validate actual audio separately on real iOS and Android devices.
