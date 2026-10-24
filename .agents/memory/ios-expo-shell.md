---
name: The app is an Expo shell (iPhone and Android)
description: The phone app is the Expo WebView shell around the live website, for iPhone and Android; the Capacitor project is retired.
---

The phone app is `artifacts/fraction-quest-ios`: an Expo app (iPhone first, Android from the same code) whose one screen is a WebView of the published website (`EXPO_PUBLIC_WEB_APP_URL`). Every lesson, the voice and every screen come from the website over the network, so web changes reach the app without a rebuild. The shell only adds native extras: haptics, the print sheet, external links in the system browser, and `window.fractionQuestShell` (platform, Wi-Fi) for the page.

The Capacitor iOS project (`artifacts/fraction-quest/ios`, `capacitor.config.ts`, the `ios-local-icloud` branch) is retired. There is no Xcode build to plan for. Inside the Expo shell, `Capacitor.isNativePlatform()` is false and the page behaves like iPhone Safari.

**Why:** A voice-bundling change was built for the Capacitor project and had to be reworked, because the real iOS app never runs Capacitor code.

**How to apply:** Say "the app (iPhone and Android)", not "the iPhone app": nothing in the shell or the page checks the platform except the audio format (Opus where it plays, MP3 elsewhere). The user wants both platforms (iOS is the current focus). For anything "in the app", change the website (it runs inside the shell), and detect the app with `appShell()` (`src/lib/app-shell.ts`), never Capacitor. Native-only needs go in the Expo shell (`app/index.tsx`), and new native modules need an Expo build. The app needs a network connection to load lessons; making it work offline would mean bundling the website into the shell, which is a separate project.

## Expo dependency recovery

When Expo reports a declared package missing from the artifact's local `node_modules` even though it is in the lockfile, restore the workspace install with `pnpm install --filter @workspace/fraction-quest-ios... --frozen-lockfile` before editing package versions. Then rerun Expo's compatibility checks from the app directory.

**Why:** The lockfile can be correct while an artifact-local package link is missing, which breaks Expo config or Metro startup. Expo may also recommend a just-published SDK patch that the package registry's minimum-release-age guard has not admitted yet.

**How to apply:** Restore from the lockfile, restart the managed Expo workflow, and verify the preview. Do not bypass the release-age guard to silence a patch warning; report that warning separately if the app starts with the currently installed versions.
