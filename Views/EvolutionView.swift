import SwiftUI

/// The celebration when the robot evolves. A placeholder for the Lumina cutscene video.
struct EvolutionView: View {
    let form: RobotForm

    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var revealed = false

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Text(revealed ? "Your blob evolved!" : "Something's happening…")
                .font(Theme.heading(28))
                .accessibilityAddTraits(.isHeader)
            ZStack {
                BundleImage(name: RobotForm.blob.imageName)
                    .opacity(revealed ? 0 : 1)
                    .scaleEffect(revealed ? 0.6 : 1)
                BundleImage(name: form.imageName)
                    .opacity(revealed ? 1 : 0)
                    .scaleEffect(revealed ? 1 : 0.6)
            }
            .frame(width: 200, height: 230)
            .accessibilityHidden(true)
            if revealed {
                Text("Meet \(form.displayName). Find it in the Workshop.")
                    .font(Theme.body(17, weight: .bold))
                    .multilineTextAlignment(.center)
            }
            Spacer()
            Button("Continue") { dismiss() }
                .buttonStyle(ChunkyButtonStyle())
                .padding(16)
                .opacity(revealed ? 1 : 0)
                .disabled(!revealed)
        }
        .padding(.horizontal, 20)
        .foregroundStyle(Theme.navy)
        .background(Theme.cream.ignoresSafeArea())
        .interactiveDismissDisabled(!revealed)
        .task {
            try? await Task.sleep(nanoseconds: 900_000_000)
            if reduceMotion {
                revealed = true
            } else {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.6)) { revealed = true }
            }
        }
    }
}
