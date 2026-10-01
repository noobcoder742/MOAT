import SwiftUI

/// The Workshop: see your robot, switch forms you have earned, and see parts.
struct WorkshopView: View {
    @EnvironmentObject private var store: AppStore

    private struct Part: Identifiable {
        let id: String
        let name: String
        let unlocked: Bool
    }

    private let parts = [
        Part(id: "antennas", name: "Antennas", unlocked: true),
        Part(id: "wheels", name: "Wheels", unlocked: false),
        Part(id: "hands", name: "Hands", unlocked: false),
    ]

    private let columns = [GridItem(.adaptive(minimum: 100), spacing: 12)]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 20) {
                Text("Workshop")
                    .font(Theme.heading(30))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityAddTraits(.isHeader)

                VStack(spacing: 8) {
                    BundleImage(name: store.progress.currentForm.moodImage(.hearts))
                        .frame(height: 200)
                        .accessibilityHidden(true)
                    Text(store.progress.currentForm.displayName)
                        .font(Theme.heading(22))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background {
                        BundleImage(name: "world_backdrop.jpg", mode: .fill)
                            .allowsHitTesting(false)
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .contentShape(RoundedRectangle(cornerRadius: 20))
                .card(fill: .clear, radius: 20)

                sectionTitle("Forms")
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(RobotForm.allCases) { form in
                        formCard(form)
                    }
                }

                sectionTitle("Parts")
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(parts) { part in
                        VStack(spacing: 6) {
                            BundleImage(name: part.id)
                                .frame(height: 70)
                                .opacity(part.unlocked ? 1 : 0.35)
                                .accessibilityHidden(true)
                            Text(part.name).font(Theme.body(14, weight: .bold))
                            Text(part.unlocked ? "Unlocked" : "Locked")
                                .font(Theme.body(12))
                                .foregroundStyle(Theme.muted)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity)
                        .card(fill: part.unlocked ? Theme.card : Theme.locked, radius: 16)
                        .accessibilityElement(children: .combine)
                    }
                }
            }
            .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .scrollBounceBehavior(.always)
        .foregroundStyle(Theme.navy)
        .background(Theme.cream.ignoresSafeArea())
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(Theme.heading(20))
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }

    private func formCard(_ form: RobotForm) -> some View {
        let owned = store.progress.unlockedForms.contains(form)
        let equipped = store.progress.currentForm == form
        let status: String
        if equipped {
            status = "Using"
        } else if owned {
            status = "Tap to use"
        } else if form.isInVersionOne {
            status = "Finish Phase 1"
        } else {
            status = "Coming soon"
        }

        return Button {
            store.equip(form)
        } label: {
            VStack(spacing: 6) {
                BundleImage(name: form.moodImage(.neutral))
                    .frame(height: 76)
                    .opacity(owned ? 1 : 0.35)
                    .accessibilityHidden(true)
                Text(form.displayName).font(Theme.body(14, weight: .bold))
                Text(status)
                    .font(Theme.body(12))
                    .foregroundStyle(Theme.muted)
            }
            .foregroundStyle(Theme.navy)
            .padding(10)
            .frame(maxWidth: .infinity)
            .card(fill: equipped ? Theme.lime : (owned ? Theme.card : Theme.locked), radius: 16, shadow: owned)
        }
        .buttonStyle(.plain)
        .disabled(!owned)
        .accessibilityLabel("\(form.displayName), \(status)")
    }
}
