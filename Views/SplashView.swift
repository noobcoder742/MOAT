import SwiftUI

/// The first screen while the app opens: meadow picture, robot and MOAT.
struct SplashView: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                FullScreenPicture(name: "splash_bg.jpg")

                VStack(spacing: 18) {
                    BundleImage(name: "robot_logo_filled")
                        .frame(width: 160, height: 187)
                        .accessibilityHidden(true)
                    Text("MOAT")
                        .font(Theme.wordmark(68))
                        .foregroundStyle(Theme.logo)
                        .accessibilityAddTraits(.isHeader)
                }
                // Moves the group up so MOAT sits slightly below the middle.
                .offset(y: -geo.size.height * 0.07)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
    }
}

#Preview {
    SplashView()
}
