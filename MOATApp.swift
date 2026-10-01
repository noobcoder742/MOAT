import SwiftUI
import RevenueCat

@main
struct MOATApp: App {
    @StateObject private var store = AppStore()

    init() {
        FontLoader.registerFonts()
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey:  RevenueCatKeys.active)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.light)
        }
    }
}

/// Decides which screen to show: splash first, then onboarding or the main app.
struct RootView: View {
    @EnvironmentObject private var store: AppStore
    @State private var showSplash = true

    var body: some View {
        ZStack {
            if showSplash {
                SplashView()
                    .transition(.opacity)
            } else if !store.progress.hasOnboarded {
                OnboardingView()
                    .transition(.opacity)
            } else {
                MainTabView()
                    .transition(.opacity)
            }
        }
        .task {
            store.startObservingPurchases()
            // Check for new lessons in the background so the splash never waits on the network.
            Task { await store.refreshLessonsFromBackend() }
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            withAnimation(.easeOut(duration: 0.35)) {
                showSplash = false
            }
        }
    }
}
