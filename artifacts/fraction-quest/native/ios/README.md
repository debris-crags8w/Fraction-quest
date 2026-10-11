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
