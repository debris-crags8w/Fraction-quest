# Native printing for an iOS build

`window.print()` does nothing inside an iOS web view. All printing in the app goes through
`printPage()` (`src/lib/print.ts`):

- On the web it calls `window.print()`, the same as before.
- Inside a Capacitor app it calls the `Printing` plugin in `Printing.swift`. That opens Apple's print
  sheet for the web view, using the page's print CSS. The sheet also offers "Save to Files" as a PDF.
  Afterwards it fires `afterprint`, so screens waiting for it (the answer key, the family guide) return.

When the iOS project is created (`npx cap add ios`), wire it up:

1. Copy `Printing.swift` into `ios/App/App/` and add it to the App target in Xcode.
2. Register it in a `CAPBridgeViewController` subclass, and set that class on the main storyboard's view controller:

   ```swift
   class AppViewController: CAPBridgeViewController {
       override open func capacitorDidLoad() {
           bridge?.registerPluginInstance(PrintingPlugin())
       }
   }
   ```
3. On a device, test printing a worksheet, an answer key from the grown-ups' page, and the report.

For subscription text, `courseCounts([1])` in `src/game.ts` gives the locked units and lessons
(13 units and 65 lessons today), so the numbers stay right as lessons are added.

# Bundled voice (read-aloud works offline)

The app reads lessons and the story aloud in Heart's voice. The iOS app ships every clip inside it as Opus
(16 kbps, in `.caf` files, about 60% of the MP3 size), so reading starts at once and works without a network.
The website keeps streaming the MP3 versions from App Storage.

Build steps, after `pnpm run build` and before `npx cap sync ios`:

```sh
VOICE_PACK_SOURCE_URL=https://<your-app>.replit.app pnpm --filter @workspace/fraction-quest run fetch-voice-pack
npx cap sync ios
```

`fetch-voice-pack` downloads each sentence in `public/voice/index.json` as `af_heart/<key>.caf` from the app's
public voice route into `dist/public/voice/`. Clips are cached in `.voice-pack-cache/` between builds, so only new
sentences are downloaded. It stops with an error if App Storage lacks any clip: run the Voice pack workflow by hand
with **rerender** (once, after the Opus switch) so every sentence has both formats. The clips are never committed.
