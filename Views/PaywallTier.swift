//
//  PaywallTier.swift
//  MOAT
//
//  Created by Jayson Loo on 23/9/26.
//


import SwiftUI
import RevenueCat

/// Which plan the paywall popup is showing.
enum PaywallTier {
    case premium, expert

    var title: String { self == .premium ? "Premium" : "Expert" }
    var price: String { self == .premium ? "$9.90" : "$19.90" }
    var robotImageName: String { self == .premium ? "orb" : "cat" }
    var backgroundColor: Color { self == .premium ? Theme.sky : Theme.logo }
    var accentColor: Color { self == .premium ? Theme.navy : Theme.lime }
    var textColor: Color { self == .premium ? Theme.navy : Theme.cream }

    var features: [String] {
        self == .premium
            ? ["Restricted to 9 levels per day", "Feedback on answers available", "Pre-set explanations on answers"]
            : ["Unlimited access to levels and phases", "Unlimited Streak restores", "Detailed answer analysis and AI chatbot"]
    }
}

/// The blurred backdrop, confetti and pop-in card, shown over the whole app when
/// store.showPaywall is true. See MainTabView for how it's presented.
struct PaywallOverlay: View {
    @EnvironmentObject private var store: AppStore
    @State private var cardScale: CGFloat = 0.72
    @State private var cardOpacity: Double = 0
    @State private var confetti: [ConfettiPiece] = []
    @State private var isPurchasing = false
    @State private var purchaseError: String?
    /// The package RevenueCat has for this tier, matched by price so Premium ≠ Expert
   /// even though today only Premium is ever shown. Falls back to the first package
   /// if nothing matches yet (offering still loading, or dashboard not set up).
   private var package: Package? {
       guard let packages = store.currentOffering?.availablePackages, !packages.isEmpty else { return nil }
        return packages.first { $0.storeProduct.localizedPriceString == store.paywallTier.price } ?? packages.first
    }

    var body: some View {
        ZStack {
            Theme.navy.opacity(0.55)
                .ignoresSafeArea()
                .onTapGesture(perform: close)

            ConfettiView(pieces: confetti)

            PaywallCard(tier: store.paywallTier,
                livePrice: package?.storeProduct.localizedPriceString,
                isPurchasing: isPurchasing,
                errorText:purchaseError,
               onClose: close,
                onStartTrial: startTrial
            )
            .scaleEffect(cardScale)
            .opacity(cardOpacity)
        }
        .onAppear {
            confetti = ConfettiPiece.makeBatch()
            withAnimation(.spring(response: 0.5, dampingFraction: 0.62)) {
                cardScale = 1
                cardOpacity = 1
            }
           if store.currentOffering == nil {
                Task { await store.loadOffering() }
            }
        }
    }

    private func close() {
        withAnimation(.easeOut(duration: 0.16)) {
            cardScale = 0.85
            cardOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) {
            store.showPaywall = false
        }
    }

    private func startTrial() {
        guard let package, !isPurchasing else { return }
        purchaseError = nil
        isPurchasing = true
        Task {
            let unlocked = await store.purchase(package)
            isPurchasing = false
            if unlocked {
                close()
            } else {
               // A cancelled sheet is not an error; RevenueCat surfaces real failures via its own
                // logging (Purchases.logLevel = .debug). Keep this simple for the demo.
                purchaseError = "Purchase didn't go through. Try again?"
            }
        }
    }
}

// MARK: - The card itself

private struct PaywallCard: View {
    let tier: PaywallTier
    var livePrice: String? = nil
    var isPurchasing: Bool = false
    var errorText: String? = nil
    let onClose: () -> Void
    let onStartTrial: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .black))
                        .foregroundStyle(tier.textColor)
                        .frame(width: 34, height: 34)
                        .overlay(Circle().stroke(tier.textColor, lineWidth: 2.5))
                }
                .accessibilityLabel("Close")
            }

            BundleImage(name: tier.robotImageName)
                .frame(height: 104)
                .accessibilityHidden(true)

            Text(tier.title.uppercased())
                .font(Theme.body(14, weight: .bold))
                .tracking(2)
                .foregroundStyle(tier.accentColor)
                .padding(.top, 4)

            Text("Unlock your full robot")
                .font(Theme.heading(22))
                .foregroundStyle(tier.textColor)
                .multilineTextAlignment(.center)
                .padding(.top, 4)

            VStack(spacing: 2) {
                Text(livePrice ?? tier.price)
                    .font(Theme.wordmark(44))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                Text("/month")
                    .font(Theme.body(16, weight: .bold))
                    .opacity(0.85)
            }
            .foregroundStyle(tier.textColor)
            .padding(.top, 14)

            Text("First 7 days free, cancel anytime")
                .font(Theme.body(13, weight: .bold))
                .foregroundStyle(tier.textColor.opacity(0.8))
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 12) {
                ForEach(tier.features, id: \.self) { feature in
                    HStack(alignment: .top, spacing: 10) {
                        ZStack {
                            Circle().fill(Theme.lime)
                            Circle().stroke(tier.textColor, lineWidth: 2.5)
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .black))
                                .foregroundStyle(Theme.navy)
                        }
                        .frame(width: 24, height: 24)
                        Text(feature)
                            .font(Theme.body(15, weight: .bold))
                            .foregroundStyle(tier.textColor)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 22)
            .padding(.bottom, 22)

            Button(action: onStartTrial) {
                Group {
                    if isPurchasing {
                        ProgressView().tint(Theme.navy)
                    } else {
                        Text("Start FREE 7-day Trial")
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(ChunkyButtonStyle(fill: Theme.lime, enabled: !isPurchasing))
            .disabled(isPurchasing)
            
            if let errorText {
                Text(errorText)
                    .font(Theme.body(13, weight: .bold))
                    .foregroundStyle(Theme.orange)
                    .padding(.top, 8)
            }

            Button("Maybe later", action: onClose)
                .font(Theme.body(14, weight: .bold))
                .foregroundStyle(tier.textColor.opacity(0.75))
                .underline()
                .padding(.top, 14)
        }
        .padding(28)
        .frame(width: 320)
        .background(RoundedRectangle(cornerRadius: 32).fill(tier.backgroundColor))
        .overlay(RoundedRectangle(cornerRadius: 32).stroke(tier.textColor, lineWidth: 4))
        .background(RoundedRectangle(cornerRadius: 32).fill(Theme.navy).offset(y: 7))
        .accessibilityElement(children: .contain)
    }
}

// MARK: - Confetti

private struct ConfettiPiece: Identifiable {
    let id = UUID()
    let xFraction: CGFloat
    let color: Color
    let size: CGFloat
    let isCircle: Bool
    let duration: Double
    let phase: Double
    let spin: Double

    static func makeBatch(count: Int = 26) -> [ConfettiPiece] {
        let colors = [Theme.lime, Theme.sky, Theme.orange, Theme.navy, Theme.card]
        return (0..<count).map { i in
            ConfettiPiece(
                xFraction: CGFloat.random(in: 0...1),
                color: colors[i % colors.count],
                size: CGFloat.random(in: 8...16),
                isCircle: Bool.random(),
                duration: Double.random(in: 1.8...3.4),
                phase: Double.random(in: 0...3.4),
                spin: Double.random(in: 240...720)
            )
        }
    }
}

private struct ConfettiView: View {
    let pieces: [ConfettiPiece]

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { timeline in
                let now = timeline.date.timeIntervalSinceReferenceDate
                ZStack {
                    ForEach(pieces) { piece in
                        let cycle = (now + piece.phase).truncatingRemainder(dividingBy: piece.duration)
                        let progress = cycle / piece.duration
                        let y = -20 + progress * (geo.size.height + 40)
                        let rotation = progress * piece.spin
                        let fadeIn = min(progress / 0.06, 1)

                        Group {
                            if piece.isCircle {
                                Circle().fill(piece.color)
                            } else {
                                RoundedRectangle(cornerRadius: 2).fill(piece.color)
                            }
                        }
                        .frame(width: piece.size, height: piece.size)
                        .rotationEffect(.degrees(rotation))
                        .position(x: piece.xFraction * geo.size.width, y: y)
                        .opacity(fadeIn)
                    }
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
