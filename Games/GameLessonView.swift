import SwiftUI
import Combine

/// Plays a game lesson (a Level 10 loop game or a Level 40 stage).
/// It looks like the normal lesson player: quit button, progress bar, bolts, and a finish screen.
struct GameLessonView: View {
    let game: String
    let onFinish: (Int) -> Void

    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    @State private var progress = 0.0
    @State private var bolts = 0
    @State private var finished = false
    @State private var confirmQuit = false

    var body: some View {
        VStack(spacing: 0) {
            topBar
            if finished {
                LessonCompleteView(bolts: bolts, form: store.progress.currentForm) {
                    onFinish(bolts)
                }
            } else {
                gameBody
            }
        }
        .foregroundStyle(Theme.navy)
        .background(Theme.cream.ignoresSafeArea())
        .confirmationDialog("Quit this lesson?", isPresented: $confirmQuit, titleVisibility: .visible) {
            Button("Quit lesson", role: .destructive) { dismiss() }
            Button("Keep learning", role: .cancel) {}
        } message: {
            Text("Progress in this lesson won't be saved.")
        }
    }

    @ViewBuilder
    private var gameBody: some View {
        if let kind = LoopGameKind(rawValue: game) {
            LoopGameView(config: LoopGameConfig.config(for: kind), progress: $progress, bolts: $bolts, onDone: finish)
        } else if let config = StageCatalog.config(for: game) {
            StageGameView(config: config, progress: $progress, bolts: $bolts, onDone: finish)
        } else {
            Text("This game isn't available yet.")
                .font(Theme.body(16))
                .padding(20)
        }
    }

    private func finish() {
        guard !finished else { return }   // a fast double tap must not award the finishing bolts twice
        bolts += LessonView.boltsForFinishing
        finished = true
    }

    private var topBar: some View {
        HStack(spacing: 10) {
            Button {
                confirmQuit = true
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 22, weight: .heavy))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Quit lesson")
            .opacity(finished ? 0 : 1)
            .disabled(finished)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.locked)
                    Capsule()
                        .fill(Theme.lime)
                        .frame(width: max(0, geo.size.width * progress))
                }
                .overlay(Capsule().stroke(Theme.navy, lineWidth: Theme.border))
                .animation(.easeOut(duration: 0.3), value: progress)
            }
            .frame(height: 16)
            .accessibilityElement()
            .accessibilityLabel("Lesson progress")
            .accessibilityValue("\(Int(progress * 100)) percent")

            HStack(spacing: 4) {
                Image(systemName: "bolt.fill").foregroundStyle(Theme.sky)
                Text("+\(bolts)").font(Theme.heading(18))
            }
            .padding(.horizontal, 10)
            .frame(height: 36)
            .card(radius: 18)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(bolts) bolts earned this lesson")
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
}
