import SwiftUI

/// Step 2 of onboarding: which programming language the learner wants to use.
/// Only Python has lessons today; the other choices are saved for later.
struct LanguageStepView: View {
    @Binding var language: String
    let onFinish: () -> Void

    private struct Choice: Identifiable {
        let name: String
        let caption: String
        var id: String { name }
    }

    private static let choices: [Choice] = [
        Choice(name: "Python", caption: "Every subject · most popular"),
        Choice(name: "R", caption: "Health sciences · statistics"),
        Choice(name: "SQL", caption: "Business · working with data"),
        Choice(name: "JavaScript", caption: "Web & app building"),
        Choice(name: "MATLAB", caption: "Engineering · physics & maths"),
        Choice(name: "Java", caption: "Engineering · enterprise software"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 12) {
                    Text("STEP 2 OF 2")
                        .font(Theme.body(13, weight: .bold))
                        .tracking(2)
                        .foregroundStyle(Theme.muted)
                    Text("Pick a language")
                        .font(Theme.heading(24))
                        .padding(.bottom, 6)
                        .accessibilityAddTraits(.isHeader)

                    ForEach(Self.choices) { choice in
                        languageButton(choice)
                    }

                    if language != "Python" {
                        Text("\(language) starts with Phase 1. More phases are coming soon.")
                            .font(Theme.body(13, weight: .bold))
                            .foregroundStyle(Theme.muted)
                            .multilineTextAlignment(.center)
                            .padding(.top, 4)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 24)
            }

            Button("Let's go", action: onFinish)
                .buttonStyle(ChunkyButtonStyle())
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
        }
        .foregroundStyle(Theme.navy)
        .background(Theme.cream.ignoresSafeArea())
    }

    private func languageButton(_ choice: Choice) -> some View {
        let selected = language == choice.name
        return Button {
            language = choice.name
        } label: {
            VStack(spacing: 3) {
                Text(choice.name)
                    .font(Theme.heading(18))
                    .foregroundStyle(Theme.navy)
                Text(choice.caption)
                    .font(Theme.body(12, weight: .bold))
                    .foregroundStyle(Theme.muted)
            }
            .multilineTextAlignment(.center)
            .padding(.horizontal, 36)
            .frame(maxWidth: .infinity, minHeight: 74)
            .overlay(alignment: .trailing) {
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(Theme.navy)
                        .padding(.trailing, 14)
                }
            }
            .card(fill: selected ? Theme.lime : Theme.card, radius: 14, shadow: true)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }
}

#Preview {
    LanguageStepView(language: .constant("Python")) {}
}
