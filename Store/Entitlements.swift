import Foundation
import RevenueCat

/// Everything AppStore needs to talk to RevenueCat: loading the offering,
/// checking the premium entitlement, and making a purchase.
extension AppStore {
    /// Call once, right after Purchases.configure(...) in MOATApp.
    func startObservingPurchases() {
        Purchases.shared.delegate = PurchasesDelegateHandler.shared
        PurchasesDelegateHandler.shared.onUpdate = { [weak self] info in
            Task { @MainActor in self?.applyCustomerInfo(info) }
        }
        Task {
            await refreshEntitlements()
            await loadOffering()
        }
    }

    /// Re-checks whether the signed-in user currently has Premium.
    func refreshEntitlements() async {
        do {
            let info = try await Purchases.shared.customerInfo()
            applyCustomerInfo(info)
        } catch {
            #if DEBUG
            print("RevenueCat: couldn't fetch customerInfo: \(error)")
            #endif
        }
    }

    private func applyCustomerInfo(_ info: CustomerInfo) {
        isPremium = info.entitlements[RevenueCatKeys.premiumEntitlement]?.isActive == true
    }

    /// Fetches the packages configured on the RevenueCat dashboard (Test Store or real store).
    func loadOffering() async {
        do {
            let offerings = try await Purchases.shared.offerings()
            currentOffering = offerings.current
        } catch {
            #if DEBUG
            print("RevenueCat: couldn't fetch offerings: \(error)")
            #endif
        }
    }

    /// Buys a package. Returns true if the purchase went through and Premium is now active.
    @discardableResult
    func purchase(_ package: Package) async -> Bool {
        do {
            let result = try await Purchases.shared.purchase(package: package)
            applyCustomerInfo(result.customerInfo)
            return isPremium
        } catch {
            #if DEBUG
            print("RevenueCat: purchase failed: \(error)")
            #endif
            return false
        }
    }

    /// Brings back Premium on a new device/reinstall, without paying again.
    @discardableResult
    func restorePurchases() async -> Bool {
        do {
            let info = try await Purchases.shared.restorePurchases()
            applyCustomerInfo(info)
            return isPremium
        } catch {
            return false
        }
    }
}

/// A tiny bridge: RevenueCat's delegate uses the old completion-handler style,
/// so this forwards each update to the async-friendly closure above.
private final class PurchasesDelegateHandler: NSObject, PurchasesDelegate {
    static let shared = PurchasesDelegateHandler()
    var onUpdate: ((CustomerInfo) -> Void)?

    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        onUpdate?(customerInfo)
    }
}
