import SwiftUI

/// "About you": age, education and main area of study, on one page.
struct OnboardingView: View {
    @EnvironmentObject private var store: AppStore

    @State private var age: Double = 18
    @State private var education = "Secondary school"
    @State private var studyArea = "Health Sciences"
    @State private var language = "Python"
    @State private var step = 1

    static let educationLevels = [
        "Primary school",
        "Secondary school",
        "Diploma or vocational",
        "Bachelor's degree",
        "Master's degree",
        "Doctorate",
        "Prefer not to say",
    ]

    static let studyAreas = [
        "Health Sciences",
        "Engineering",
        "Physics & maths",
        "Business",
        "Arts & humanities",
        "General",
    ]

    private var ageLabel: String { age >= 70 ? "70+" : String(Int(age)) }

    var body: some View {
        if step == 1 {
            aboutYouPage
        } else {
            LanguageStepView(language: $language) {
                store.finishOnboarding(age: Int(age), education: education,
                                       studyArea: studyArea, language: language)
            }
        }
    }

    private var aboutYouPage: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 26) {
                    robotIntro
                    ageSection
                    educationSection
                    studyAreaSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 24)
            }

            Button("Next") {
                step = 2
            }
            .buttonStyle(ChunkyButtonStyle())
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
        .foregroundStyle(Theme.navy)
        .background(Theme.cream.ignoresSafeArea())
        .onAppear {
            // Show earlier answers when the learner comes back to edit them.
            age = Double(store.progress.age)
            education = store.progress.education
            studyArea = store.progress.studyArea
            language = store.progress.language
        }
    }

    // MARK: Parts of the page

    private var robotIntro: some View {
        HStack(spacing: 14) {
            BundleImage(name: "blob_excited")
                .frame(width: 58, height: 68)
                .accessibilityHidden(true)
            Text("Tell me about you so I can tailor your lessons.")
                .font(Theme.body(15, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .card(radius: 18, shadow: true)
        }
        .frame(maxWidth: .infinity)
    }

    private var ageSection: some View {
        VStack(spacing: 10) {
            sectionTitle("How old are you?")
            Text(ageLabel)
                .font(Theme.heading(24))
                .frame(minWidth: 64, minHeight: 40)
                .padding(.horizontal, 6)
                .card(radius: 12)
                .accessibilityHidden(true)
            Slider(value: $age, in: 10...70, step: 1)
                .tint(Theme.lime)
                .accessibilityLabel("Age")
                .accessibilityValue(ageLabel)
            HStack {
                Text("10"); Spacer(); Text("30"); Spacer(); Text("50"); Spacer(); Text("70+")
            }
            .font(Theme.body(12))
            .foregroundStyle(Theme.muted)
            .accessibilityHidden(true)
            if age < 13 {
                Text("Under 13? A parent will need to help you set up.")
                    .font(Theme.body(13, weight: .bold))
                    .multilineTextAlignment(.center)
            }
        }
    }

    private var educationSection: some View {
        VStack(spacing: 10) {
            sectionTitle("Highest education level")
            Menu {
                Picker("Highest education level", selection: $education) {
                    ForEach(Self.educationLevels, id: \.self) { level in
                        Text(level).tag(level)
                    }
                }
            } label: {
                Text(education)
                    .font(Theme.body(16, weight: .bold))
                    .foregroundStyle(Theme.navy)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .overlay(alignment: .trailing) {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 16, weight: .heavy))
                            .foregroundStyle(Theme.navy)
                            .padding(.trailing, 16)
                    }
                    .card(radius: 14, shadow: true)
            }
            .accessibilityLabel("Highest education level, \(education)")
        }
    }

    private var studyAreaSection: some View {
        VStack(spacing: 10) {
            sectionTitle("Main area of study")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 12) {
                ForEach(Self.studyAreas, id: \.self) { area in
                    areaButton(area)
                }
            }
            Text("Not sure or not specific? Pick General.")
                .font(Theme.body(13))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(Theme.heading(20))
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .accessibilityAddTraits(.isHeader)
    }

    private func areaButton(_ label: String) -> some View {
        let selected = studyArea == label
        return Button {
            studyArea = label
        } label: {
            Text(label)
                .font(Theme.body(15, weight: .bold))
                .foregroundStyle(Theme.navy)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
                .frame(maxWidth: .infinity, minHeight: 48)
                .overlay(alignment: .trailing) {
                    if selected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .black))
                            .padding(.trailing, 10)
                    }
                }
                .card(fill: selected ? Theme.lime : Theme.card, radius: 14, shadow: true)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }
}

#Preview {
    OnboardingView()
        .environmentObject(AppStore())
}
