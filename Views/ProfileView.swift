import SwiftUI

/// Profile: stats, the learner's onboarding answers, and test tools.
struct ProfileView: View {
    @EnvironmentObject private var store: AppStore
    @State private var confirmReset = false

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    BundleImage(name: store.progress.currentForm.moodImage(.wink))
                        .frame(width: 96, height: 110)
                        .accessibilityHidden(true)
                    Text("Your profile")
                        .font(Theme.heading(28))
                        .accessibilityAddTraits(.isHeader)
                }
                .frame(maxWidth: .infinity)

                LazyVGrid(columns: columns, spacing: 12) {
                    stat("Day streak", value: "\(store.displayStreak)", icon: "flame.fill", color: Theme.orange)
                    stat("Lessons done", value: "\(store.progress.completedLessons.count)", icon: "checkmark.circle.fill", color: Theme.lime)
                    stat("Bolts", value: "\(store.progress.bolts)", icon: "bolt.fill", color: Theme.sky)
                    Button {
                        store.selectedTab = 1   // open the Workshop tab
                    } label: {
                        stat("Robot forms", value: "\(store.progress.unlockedForms.count)", icon: "cpu", color: Theme.navy)
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Opens the Workshop")
                }

                VStack(spacing: 0) {
                    row("Age", store.progress.age >= 70 ? "70+" : "\(store.progress.age)")
                    Divider().overlay(Theme.navy.opacity(0.2))
                    row("Education", store.progress.education)
                    Divider().overlay(Theme.navy.opacity(0.2))
                    row("Area of study", store.progress.studyArea)
                }
                .card(radius: 16)

                Button("Edit my answers") { store.editAnswers() }
                    .buttonStyle(ChunkyButtonStyle(fill: Theme.card))

                Button("Reset all progress") { confirmReset = true }
                    .buttonStyle(ChunkyButtonStyle(fill: Theme.missSheet))

                Button("Subscriptions") {
                    store.paywallTier = .premium
                    store.showPaywall = true
                }
                .buttonStyle(ChunkyButtonStyle(fill: Theme.sky))

                Text("Sign in and account deletion come in a later build. Progress is saved on this phone only.")
                    .font(Theme.body(13))
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
            }
            .padding(20)
        }
        .foregroundStyle(Theme.navy)
        .background(Theme.cream.ignoresSafeArea())
        .confirmationDialog("Reset all progress?", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("Reset progress", role: .destructive) { store.resetProgress() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This clears lessons, bolts, streak and robot forms on this phone.")
        }
    }

    private func stat(_ label: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon).foregroundStyle(color)
            Text(value).font(Theme.heading(24))
            Text(label).font(Theme.body(13)).foregroundStyle(Theme.muted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(radius: 16, shadow: true)
        .accessibilityElement(children: .combine)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(Theme.body(15))
            Spacer()
            Text(value).font(Theme.body(15, weight: .bold))
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 48)
        .accessibilityElement(children: .combine)
    }
}
