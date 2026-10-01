import SwiftUI

/// The three tabs at the bottom of the app.
struct MainTabView: View {
    @EnvironmentObject private var store: AppStore
    var body: some View {
        ZStack {
            TabView(selection: $store.selectedTab) {
                LearnView()
                    .tabItem { Label("Learn", systemImage: "book.fill") }
                    .tag(0)
                WorkshopView()
                    .tabItem { Label("Workshop", systemImage: "wrench.and.screwdriver.fill") }
                    .tag(1)
                ProfileView()
                    .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                    .tag(2)
            }
            .tint(Theme.navy)
            .toolbarBackground(Theme.card, for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)
            .blur(radius: store.showPaywall ? 8 : 0)
            .disabled(store.showPaywall)

            if store.showPaywall {
                PaywallOverlay()
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: store.showPaywall)
    }
}
