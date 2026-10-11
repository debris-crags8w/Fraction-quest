import Foundation
import Capacitor

/// Saves the family's Fraction Quest progress in the user's own iCloud (key-value storage).
/// No account or server: Apple syncs it between the devices signed in to the same Apple ID.
/// iCloud key-value storage holds up to 1 MB per app; the web side checks the size before saving.
@objc(ICloudSyncPlugin)
public class ICloudSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudSyncPlugin"
    public let jsName = "ICloudSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]
    private let store = NSUbiquitousKeyValueStore.default
    private static let maxBytes = 1_000_000

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(changedExternally(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: store
        )
        store.synchronize()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    /// True when the device is signed in to iCloud (otherwise data stays on this device only).
    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": FileManager.default.ubiquityIdentityToken != nil])
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        store.synchronize()
        if let value = store.string(forKey: key) {
            call.resolve(["value": value])
        } else {
            call.resolve([:])
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        if value.utf8.count > ICloudSyncPlugin.maxBytes {
            call.reject("Too large for iCloud key-value storage")
            return
        }
        store.set(value, forKey: key)
        store.synchronize()
        call.resolve()
    }

    /// Another device saved: tell the web side so it can merge.
    @objc private func changedExternally(_ note: Notification) {
        let reason = note.userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int ?? -1
        if reason == NSUbiquitousKeyValueStoreQuotaViolationChange {
            notifyListeners("quotaExceeded", data: [:])
            return
        }
        let keys = note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        notifyListeners("changed", data: ["keys": keys])
    }
}

/// The app's web view controller, with the in-app iCloud plugin registered.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ICloudSyncPlugin())
    }
}
