# App shell, speed and offline review

Static review only (dependencies were not installed, so nothing was timed or run on a device).
Paths are relative to `artifacts/`; `fq` = `fraction-quest`.

## Findings (most serious first)

1. **Major: not store-ready.** `fraction-quest-ios/app.json` has no `ios.bundleIdentifier`, `android.package`, build/version codes, adaptive icon, splash image or privacy manifest, and there is no `eas.json`. `expo-location` and `expo-image-picker` are dependencies (`fraction-quest-ios/package.json`) but unused in `app/`, `components/`, `lib/`. Fix: set identifiers (e.g. `com.fractionquest.app`), add `eas.json`, icons, splash and privacy manifest; remove unused native modules.
2. **Major: web-view only, blank offline, no load timeout.** `fraction-quest-ios/app/index.tsx:84` loads a remote URL; there is no service worker (`fq/index.html`, `fq/src/main.tsx`). A stalled load shows the spinner (`:106`) forever. Fix: bundle or precache the web app and add a load timeout to the retry screen.
3. **Major: unsplit bundle and font swap.** No `React.lazy`/`import()` in `fq/src`; `fq/vite.config.ts:50-53` has no `manualChunks`. Committed build `fq/ios/App/App/public/assets/index-DiZYSq3g.js` is 705 KB (217 KB gzip), CSS 228 KB (41 KB gzip). Fonts come from Google Fonts with `display=swap` (`fq/index.html:16-18`, `fq/src/theme-pop.css:22-23`), so text jumps, and never loads offline. Fix: lazy-load heavy screens, self-host and preload the two fonts.
4. **Major: voice pack cache can be evicted.** `fq/src/lib/natural-voice.ts:85-147` stores clips in Cache Storage, but the "downloaded" marker is in `localStorage` (`:103`, `:144`). If the cache is cleared and the marker survives, clips are fetched one by one and offline Listen falls back to a device voice (breaks rule 9). Fix: verify a cached clip before trusting the marker.
5. **Minor: unused shell font, unguarded haptics.** `fraction-quest-ios/app/_layout.tsx:25-41` holds the splash for Bricolage Grotesque, which the web page does not use (`fq/src/index.css:49`, `fq/src/FamilyControls.css:13`). `app/index.tsx:45-54` calls `Haptics.*` without a try/catch around the synchronous call and has no throttle.
6. **Minor: possible double safe-area inset.** Shell uses `SafeAreaView` (`app/index.tsx:76`) and the page also pads `env(safe-area-inset-bottom)` (`fq/src/theme-pop.css:874`, `:2089-2091`). Fix: one owner for insets.
7. **Minor: stale Capacitor wrapper** in `fq/ios/App/App/` and `fq/native/ios` (`@capacitor/core` at `fq/package.json:85`) with a committed built bundle. Fix: delete or document which wrapper ships.

## Checked and fine

Voice pack cache headers (`api-server/src/routes/storage.ts:20-22`, `voice-pack-store.ts:11`); resumable, Wi-Fi-gated download (`natural-voice.ts:110-147`, `App.tsx:1340`, `index.tsx:28`); outside links open in Safari (`index.tsx:70`); retry screen, missing-URL guard, portrait lock; validated haptic/print messages (`fraction-quest-ios/lib/web-app.ts:27-36`) and no-op haptics in browsers (`fq/src/lib/native-shell.ts:20-22`).

## Not covered

Cold start, real chunk sizes, Slow 4G / 4x CPU runs and on-device safe areas.
