# App shell, speed and offline review

First written as a static review; refreshed from the code on 2026-10-29 (`main` at 2e44adc3 plus the release fixes of that day). Paths are relative to `artifacts/`; `fq` = `fraction-quest`. The web numbers below were measured by building the web app (`vite build`); nothing was run on a device.

## Findings (most serious first)

1. **Major, partly fixed: the app (iPhone and Android) is not yet store-ready.** Done: `fraction-quest-ios/app.json` sets `ios.bundleIdentifier` and `android.package` to `com.fractionquest.app`, `ios.buildNumber` 1 and `android.versionCode` 1; `eas.json` has development, preview and production profiles (no secrets); the unused `expo-location` and `expo-image-picker` were removed (no import, config plugin or permission used them). Still open (assets and owner decisions, none of which code can invent): the Android adaptive icon (a foreground image with a transparent background), the splash image, the iOS privacy manifest (`ios.privacyManifests` in `app.json`, listing what the app and its modules collect), the store listing and the in-app product IDs (the app reads them from the store; none is set in the repository), the production web-app URL for builds (`EXPO_PUBLIC_WEB_APP_URL`, also what `app.config.ts` turns into `WKAppBoundDomains`), the Apple team and App Store Connect app ID for `eas submit`, and a signing choice (EAS-managed or own).
2. **Fixed in the web app, one gap in the shell: offline and slow loads.** The web app has a service worker (`fq/src/sw.ts`, built by the plugin in `fq/vite.config.ts`): it saves the page and every built file (12 scripts, 5 style sheets, 6 fonts, the privacy and terms pages and the voice index), so the app opens and plays offline after one visit (`fq/e2e/offline.spec.ts`). The page open waits 3 seconds for the network, then uses the saved page, so a weak connection no longer waits on a hung request (`pageFromNetworkOrSaved` in `fq/src/lib/offline-routes.ts`). `app.config.ts` lists the web app's domain as an app-bound domain, which iOS needs before a web view runs a service worker. Still open: the shell itself (`fraction-quest-ios/app/index.tsx`) has a retry screen for load errors and server errors (`onError`, `onHttpError`) but no load timeout of its own, so a first-ever load that stalls shows the spinner until the web view gives up. A shell-side timeout is a small change if wanted.
3. **Mostly fixed: bundle and fonts.** Screens most visits never open load on first use (`React.lazy` in `fq/src/App.tsx`). The two fonts are self-hosted (`@fontsource`), not fetched from Google Fonts, so text does not jump and the fonts work offline. Still large: the main script is 1,684 KB (478 KB gzip) and the main style sheet 421 KB (76 KB gzip), because the lessons are in the main script (the build warns about it); the whole build is 2.9 MB. A first visit on a slow phone connection is the cost; later visits and offline use come from the saved copy. Splitting the lesson text out of the main script would help the first visit and has not been done.
4. **Fixed: the voice pack "downloaded" flag is checked.** `downloadWholeVoicePack()` in `fq/src/lib/natural-voice.ts` stores clips in Cache Storage, and the flag is in `localStorage`. It now trusts the flag only while the last clip of the pack is really in Cache Storage; if the browser cleared the cache and kept the flag, the pack is downloaded again (test in `fq/src/voice-pack.test.ts`). A browser (not the iPhone or Android app) still keeps only the clips a child has heard.
5. **Minor, open: unused shell font, unguarded haptics.** `fraction-quest-ios/app/_layout.tsx` holds the splash for Bricolage Grotesque, which the web page does not use. `app/index.tsx` (`onMessage`) calls `Haptics.*` without a try/catch around the call and with no throttle.
6. **Minor, open: possible double safe-area inset.** The app uses `SafeAreaView` (`app/index.tsx`) and the page also pads `env(safe-area-inset-bottom)` (`fq/src/theme-pop.css`). One of them should own the inset; check on a device with a home indicator.
7. **Minor, open: stale Capacitor wrapper** in `fq/ios/App/App/` and `fq/native/ios` (`@capacitor/core` in `fq/package.json`), with a committed built bundle (`fq/ios/App/App/public/assets/index-DiZYSq3g.js`, 705 KB). The Expo shell in `fraction-quest-ios` is the app that ships; the Capacitor files can be deleted or documented.

## What still needs assets or owner decisions (release list)

- Android adaptive icon (foreground and background) and the splash image.
- iOS privacy manifest, and the App Store privacy answers (no location, no photos, notifications for reminders, in-app purchase).
- Store IDs: App Store Connect app ID, Apple team ID, Google Play service account, and the subscription product IDs. None is invented here.
- The production address of the web app for the build profiles.
- A decision on the shell load timeout (finding 2) and on deleting the Capacitor wrapper (finding 7).
- A real-phone check of offline use with Wi-Fi switched off, and of the voice pack download on Wi-Fi.

## Checked and fine

Voice pack cache headers (`api-server/src/routes/storage.ts`, `voice-pack-store.ts`); resumable, Wi-Fi-gated download; outside links open in Safari; retry screen, missing-URL guard, portrait lock; validated haptic and print messages (`fraction-quest-ios/lib/web-app.ts`) and no-op haptics in browsers (`fq/src/lib/native-shell.ts`).

## Not covered

Cold start on a device, Slow 4G and 4x CPU runs, and on-device safe areas.
