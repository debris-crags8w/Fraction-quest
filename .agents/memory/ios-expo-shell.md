---
name: The iPhone app is an Expo shell
description: The iOS app is the Expo WebView shell around the live website; the Capacitor project is retired.
---

The iPhone app is `artifacts/fraction-quest-ios`: an Expo app whose one screen is a WebView of the published website (`EXPO_PUBLIC_WEB_APP_URL`). Every lesson, the voice and every screen come from the website over the network, so web changes reach the app without a rebuild. The shell only adds native extras: haptics, the print sheet, external links in Safari, and `window.fractionQuestShell` (platform, Wi-Fi) for the page.

The Capacitor iOS project (`artifacts/fraction-quest/ios`, `capacitor.config.ts`, the `ios-local-icloud` branch) is retired. There is no Xcode build to plan for. Inside the Expo shell, `Capacitor.isNativePlatform()` is false and the page behaves like iPhone Safari.

**Why:** A voice-bundling change was built for the Capacitor project and had to be reworked, because the real iOS app never runs Capacitor code.

**How to apply:** For anything "in the iOS app", change the website (it runs inside the shell), and detect the app with `appShell()` (`src/lib/app-shell.ts`), never Capacitor. Native-only needs go in the Expo shell (`app/index.tsx`), and new native modules need an Expo build. The app needs a network connection to load lessons; making it work offline would mean bundling the website into the shell, which is a separate project.
