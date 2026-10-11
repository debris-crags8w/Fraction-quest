import Foundation
import Capacitor
import StoreKit

/// The monthly subscription, using StoreKit 2 directly (no third-party SDK, nothing sent to us).
/// The web side asks for the product, buys it, checks the entitlement, restores, and opens
/// Apple's "manage subscription" sheet. StoreKit 2 needs iOS 15 (the app's minimum).
@objc(SubscriptionsPlugin)
public class SubscriptionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionsPlugin"
    public let jsName = "Subscriptions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlement", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]
    private var updates: Task<Void, Never>?

    override public func load() {
        // Renewals, refunds, Ask to Buy approvals and purchases made on other devices arrive here.
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                self?.notifyListeners("entitlementChanged", data: [:])
            }
        }
    }

    deinit {
        updates?.cancel()
    }

    @objc func getProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.resolve(["available": false])
                    return
                }
                var result: [String: Any] = [
                    "available": true,
                    "productId": product.id,
                    "displayPrice": product.displayPrice
                ]
                if let subscription = product.subscription {
                    result["period"] = SubscriptionsPlugin.periodName(subscription.subscriptionPeriod)
                    if let intro = subscription.introductoryOffer, intro.paymentMode == .freeTrial {
                        let eligible = await subscription.isEligibleForIntroOffer
                        result["introOffer"] = ["days": SubscriptionsPlugin.days(intro.period), "eligible": eligible]
                    }
                }
                call.resolve(result)
            } catch {
                call.reject("The App Store could not be reached.")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("The subscription is not available right now.")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        call.reject("The purchase could not be verified.")
                        return
                    }
                    await transaction.finish()
                    let entitlement = await SubscriptionsPlugin.entitlement(for: [productId])
                    call.resolve(["status": "purchased", "entitlement": entitlement])
                case .pending:
                    // Ask to Buy: a parent must approve. The approval arrives later through Transaction.updates.
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.resolve(["status": "cancelled"])
                }
            } catch {
                call.reject("The purchase did not go through.")
            }
        }
    }

    @objc func getEntitlement(_ call: CAPPluginCall) {
        let ids = Set(call.getArray("productIds", String.self) ?? [])
        Task {
            call.resolve(await SubscriptionsPlugin.entitlement(for: ids))
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        let ids = Set(call.getArray("productIds", String.self) ?? [])
        Task {
            do {
                try await AppStore.sync()
            } catch {
                // The user may cancel the Apple ID sign-in; still report what this device knows.
            }
            call.resolve(await SubscriptionsPlugin.entitlement(for: ids))
        }
    }

    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.reject("No window to show the subscription settings in.")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("Could not open the subscription settings.")
            }
        }
    }

    /// The best active, verified, unrevoked subscription among `ids` (any of them if `ids` is empty).
    static func entitlement(for ids: Set<String>) async -> [String: Any] {
        var best: Transaction?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result,
                  ids.isEmpty || ids.contains(transaction.productID),
                  transaction.revocationDate == nil else { continue }
            if let expires = transaction.expirationDate, expires <= Date() { continue }
            if best == nil || (transaction.expirationDate ?? .distantFuture) > (best?.expirationDate ?? .distantFuture) {
                best = transaction
            }
        }
        guard let transaction = best else { return ["active": false] }
        var out: [String: Any] = [
            "active": true,
            "productId": transaction.productID,
            "inTrial": transaction.offerType == .introductory
        ]
        if let expires = transaction.expirationDate {
            out["expiresAt"] = expires.timeIntervalSince1970 * 1000
        }
        if let product = try? await Product.products(for: [transaction.productID]).first,
           let statuses = try? await product.subscription?.status {
            for status in statuses {
                if case .verified(let renewal) = status.renewalInfo, renewal.currentProductID == transaction.productID {
                    out["willRenew"] = renewal.willAutoRenew
                }
            }
        }
        return out
    }

    static func periodName(_ period: Product.SubscriptionPeriod) -> String {
        switch period.unit {
        case .day: return period.value == 7 ? "week" : "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default: return "period"
        }
    }

    static func days(_ period: Product.SubscriptionPeriod) -> Int {
        switch period.unit {
        case .day: return period.value
        case .week: return period.value * 7
        case .month: return period.value * 30
        case .year: return period.value * 365
        @unknown default: return period.value
        }
    }
}
