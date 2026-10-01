import SwiftUI

/// The Learn home: a path that climbs upward, split into phases.
/// The current lesson is kept in the middle of the screen.
struct LearnView: View {
    @EnvironmentObject private var store: AppStore

    @State private var activeLesson: Lesson?
    @State private var evolvedTo: RobotForm?
    @State private var pendingForm: RobotForm?

    var body: some View {
        Group {
            if store.course.phases.isEmpty {
                missingLessons
            } else {
                path
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
            GeometryReader { proxy in
                FullScreenPicture(name: "world_backdrop.jpg")
                    .frame(width: proxy.size.width, height: proxy.size.height)
            }
            .ignoresSafeArea()
        }
        .overlay(alignment: .top) {
            statusChips
                .padding(.horizontal, 16)
                .padding(.top, 8)
        }
        .fullScreenCover(item: $activeLesson, onDismiss: {
            // Only celebrate once the lesson screen has fully closed. Presenting a sheet
            // while another screen is still closing silently fails on iOS.
            if let form = pendingForm {
                pendingForm = nil
                evolvedTo = form
            }
        }) { lesson in
            Group {
                    if let game = lesson.game {
                   GameLessonView(game: game) { bolts in
                       pendingForm = store.completeLesson(lesson, boltsEarned: bolts)
                    activeLesson = nil
                    }
                 } else {
                    LessonView(lesson: lesson) { bolts in
                        pendingForm = store.completeLesson(lesson, boltsEarned: bolts)
                        activeLesson = nil
                    }
                }
            }
            .environmentObject(store)
        }
        .sheet(item: $evolvedTo) { form in
            EvolutionView(form: form)
        }
    }

    // MARK: The path

    private struct PathRow: Identifiable {
        enum Kind {
            case banner(Phase)
            case lesson(Lesson, Phase, step: Int)
        }
        let id: String
        let kind: Kind
    }

    /// Rows from the first lesson to the last. Shown reversed, so the path climbs upward.
    private var rows: [PathRow] {
        var result: [PathRow] = []
        var step = 0
        for phase in store.course.phases {
            result.append(PathRow(id: "banner-\(phase.id)", kind: .banner(phase)))
            for lesson in phase.lessons {
                result.append(PathRow(id: lesson.id, kind: .lesson(lesson, phase, step: step)))
                step += 1
            }
        }
        return result
    }

    private var path: some View {
        ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.reversed())) { row in
                        switch row.kind {
                        case .banner(let phase):
                            phaseBanner(phase)
                        case .lesson(let lesson, let phase, let step):
                            lessonRow(lesson, phase: phase, step: step)
                                .id(lesson.id)
                        }
                    }
                }
                .padding(.top, 70)
                .padding(.bottom, 30)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // The path climbs upward, so open at the bottom (Phase 1), not at the locked top
            .defaultScrollAnchor(.bottom)
            .onAppear { scrollToCurrent(proxy, animated: false) }
            .onChange(of: store.progress.completedLessons.count) { _, _ in
                scrollToCurrent(proxy, animated: true)
            }
        }
    }

    private func scrollToCurrent(_ proxy: ScrollViewProxy, animated: Bool) {
        guard let id = store.currentLesson?.id else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            if animated {
                withAnimation(.easeInOut(duration: 0.5)) { proxy.scrollTo(id, anchor: .center) }
            } else {
                proxy.scrollTo(id, anchor: .center)
            }
        }
    }

    // MARK: A lesson on the path

    private func lessonRow(_ lesson: Lesson, phase: Phase, step: Int) -> some View {
        let zigzag: [CGFloat] = [0, 55, 0, -55]
        let x = zigzag[step % zigzag.count]
        let done = store.isCompleted(lesson)
        let unlocked = store.isUnlocked(lesson)
        let isCurrent = store.currentLesson?.id == lesson.id
        let phaseLocked = !store.isPhaseStarted(phase)
        let isLastInPhase = phase.lessons.last?.id == lesson.id
        let size: CGFloat = isCurrent ? 88 : 64

        let icon: String
        if done {
            icon = "checkmark"
        } else if isCurrent {
            icon = "play.fill"
        } else if isLastInPhase {
            icon = "star.fill"
        } else {
            icon = "lock.fill"
        }
        let fill = done ? Theme.lime : (isCurrent ? Theme.sky : Theme.locked)
        let state = done ? "complete" : (unlocked ? "start" : "locked")

        return ZStack {
            if phaseLocked {
                Theme.navy.opacity(0.55)
                    .allowsHitTesting(false)
            }

            VStack(spacing: 8) {
                Button {
                    if unlocked {
                        activeLesson = lesson
                    } else if phaseLocked {
                        store.paywallTier = .premium
                        store.showPaywall = true
                    }
                } label: {
                    ZStack {
                        if isCurrent {
                            Circle()
                                .stroke(Theme.cream, lineWidth: 3)
                                .frame(width: size + 20, height: size + 20)
                        }
                        Circle().fill(Theme.navy).offset(y: 4)
                        Circle().fill(fill)
                        Circle().stroke(Theme.navy, lineWidth: Theme.border)
                        Image(systemName: icon)
                            .font(.system(size: isCurrent ? 32 : 24, weight: .black))
                            .foregroundStyle(unlocked ? Theme.navy : Theme.lockedText)
                    }
                    .frame(width: size, height: size)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(lesson.title), \(state)")

                if isCurrent {
                    Text(lesson.title)
                        .font(Theme.heading(16))
                        .foregroundStyle(Theme.navy)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .card(radius: 16, shadow: true)
                }
            }
            .offset(x: x)

            if isCurrent {
                BundleImage(name: store.progress.currentForm.moodImage(store.progress.currentForm == .blob ? .surprised : .closed))
                    .frame(width: 96, height: 112)
                    .offset(x: x > 0 ? -110 : 110)
                    .accessibilityHidden(true)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: isCurrent ? 170 : 96)
    }

    // MARK: A phase banner

    private func phaseBanner(_ phase: Phase) -> some View {
        let started = store.isPhaseStarted(phase)
        return Button {
            if !started {
                store.paywallTier = .premium
                store.showPaywall = true
            }
        } label: {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(started ? "Phase \(phase.number)" : "Phase \(phase.number) · skip with Premium")
                        .font(Theme.body(13, weight: .bold))
                        .foregroundStyle(started ? Theme.muted : Theme.premiumText)
                    Text(phase.title)
                        .font(Theme.heading(20))
                        .foregroundStyle(started ? Theme.navy : Theme.cream)
                }
                Spacer()
                if started {
                    Text("\(store.completedCount(in: phase)) of \(phase.lessons.count)")
                        .font(Theme.body(13, weight: .bold))
                        .foregroundStyle(Theme.navy)
                        .padding(.horizontal, 12)
                        .frame(height: 30)
                        .background(Capsule().fill(Theme.sky))
                        .overlay(Capsule().stroke(Theme.navy, lineWidth: 2))
                } else {
                    Label("Premium", systemImage: "crown.fill")
                        .font(Theme.body(13, weight: .bold))
                        .foregroundStyle(Theme.navy)
                        .padding(.horizontal, 10)
                        .frame(height: 30)
                        .background(Capsule().fill(Theme.orange))
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 64)
            .card(fill: started ? Theme.cream : Theme.premiumBand, radius: 20, shadow: true)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(started ? Color.clear : Theme.navy.opacity(0.55))
        .contentShape(Rectangle())
    }

    // MARK: Top chips

    private var statusChips: some View {
        HStack(spacing: 8) {
            chip(icon: "flame.fill", color: Theme.orange, text: "\(store.displayStreak)")
                .accessibilityLabel("\(store.displayStreak) day streak")
            chip(icon: "bolt.fill", color: Theme.sky, text: "\(store.progress.bolts)")
                .accessibilityLabel("\(store.progress.bolts) bolts")
            Spacer()
            chip(icon: "target", color: Theme.lime, text: "\(store.lessonsToday)/\(store.progress.dailyGoalLessons)")
                .accessibilityLabel("\(store.lessonsToday) of \(store.progress.dailyGoalLessons) lessons today")
        }
    }

    private func chip(icon: String, color: Color, text: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).foregroundStyle(color)
            Text(text).font(Theme.heading(18)).foregroundStyle(Theme.navy)
        }
        .padding(.horizontal, 14)
        .frame(height: 44)
        .card(radius: 22, shadow: true)
        .accessibilityElement(children: .ignore)
    }

    private var missingLessons: some View {
        VStack(spacing: 10) {
            Text("Lessons didn't load")
                .font(Theme.heading(22))
            Text("Check that lessons.json is inside the app. See Troubleshooting in the README.")
                .font(Theme.body(15))
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(Theme.navy)
        .padding(20)
        .card(radius: 20)
        .padding(24)
        .frame(maxHeight: .infinity)
    }
}
