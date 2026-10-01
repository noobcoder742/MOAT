import Foundation

/// Where the app's RevenueCat API keys live, and which entitlement unlocks Premium.
///
/// Get these from app.revenuecat.com > Project settings > API keys.
/// - testStoreAPIKey: lets you demo real purchases with no App Store Connect setup
///   and no paid Apple Developer account. Use this for the shipathon demo.
/// - appleAPIKey: the real key, used once you have App Store Connect products set up.
///   NEVER ship a build to the App Store with the Test Store key — RevenueCat will
///   refuse the purchase in production.
enum RevenueCatKeys {
    static let testStoreAPIKey = "test_ejGOWLHFWvvIVLsrjgdwGFFNcHp"
    static let appleAPIKey = "appl_YOUR_APPLE_KEY_HERE"

    /// Flip this to false once you've moved to real App Store Connect products.
    static let useTestStore = true

    static var active: String { useTestStore ? testStoreAPIKey : appleAPIKey }

    /// The entitlement identifier configured in the RevenueCat dashboard.
    static let premiumEntitlement = "premium"
}
