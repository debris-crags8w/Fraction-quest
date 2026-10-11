import UIKit
import Capacitor

/// Printing for the worksheets, answer keys and grown-ups' report. `window.print()` does nothing in an
/// iOS web view, so the web side calls this instead. It prints the web view itself (with its print CSS)
/// through Apple's print sheet, which also offers "Save to Files" as a PDF.
@objc(PrintingPlugin)
public class PrintingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintingPlugin"
    public let jsName = "Printing"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    @objc func print(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView, let view = self?.bridge?.viewController?.view else {
                call.reject("The page is not ready to print yet.")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = call.getString("jobName") ?? "Fraction Quest"
            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()
            let done: UIPrintInteractionController.CompletionHandler = { _, completed, error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve(["completed": completed]) }
            }
            if UIDevice.current.userInterfaceIdiom == .pad {
                // On iPad the print sheet is a popover; anchor it at the top center of the screen.
                let anchor = CGRect(x: view.bounds.midX, y: view.safeAreaInsets.top + 8, width: 1, height: 1)
                controller.present(from: anchor, in: view, animated: true, completionHandler: done)
            } else {
                controller.present(animated: true, completionHandler: done)
            }
        }
    }
}
