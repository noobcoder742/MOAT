import SwiftUI
import UIKit

/// Plays one lesson. Wrong answers come back once at the end. No hearts, no timers.
struct LessonView: View {
    let lesson: Lesson
    let onFinish: (Int) -> Void

    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    private enum Outcome { case correct, wrong }

    @State private var queue: [Question]
    @State private var position = 0
    @State private var choice: String?
    @State private var placed: [Int] = []
    @State private var outcome: Outcome?
    @State private var retried: Set<String> = []
    @State private var finishedIDs: Set<String> = []
    @State private var firstTryMisses: Set<String> = []
    @State private var bolts = 0
    @State private var finished = false
    @State private var confirmQuit = false

    // Extra state for the newer question types.
    @State private var showHint = false
    @State private var pairs: [Int: Int] = [:]   // match: line number -> partner number
    @State private var activeRow: Int?

    @State private var aiText: String?
    @State private var aiLoading = false
    @State private var aiRequest = UUID()

    static let boltsPerCorrect = 5
    static let boltsForFinishing = 10

    init(lesson: Lesson, onFinish: @escaping (Int) -> Void) {
        self.lesson = lesson
        self.onFinish = onFinish
        _queue = State(initialValue: lesson.questions)
    }

    private var question: Question? {
        position < queue.count ? queue[position] : nil
    }

    private var progressFraction: Double {
        guard !lesson.questions.isEmpty else { return 1 }
        return Double(finishedIDs.count) / Double(lesson.questions.count)
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            if finished {
                LessonCompleteView(bolts: bolts, form: store.progress.currentForm) {
                    onFinish(bolts)
                }
            } else if let question {
                ScrollView {
                    questionBody(question)
                        .padding(20)
                }
                bottomArea(question)
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

    // MARK: Top bar

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
                        .frame(width: max(0, geo.size.width * progressFraction))
                }
                .overlay(Capsule().stroke(Theme.navy, lineWidth: Theme.border))
                .animation(.easeOut(duration: 0.3), value: progressFraction)
            }
            .frame(height: 16)
            .accessibilityElement()
            .accessibilityLabel("Lesson progress")
            .accessibilityValue("\(Int(progressFraction * 100)) percent")

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

    // MARK: The question

    private func questionBody(_ q: Question) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(q.prompt)
                .font(Theme.heading(24))
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            if let hint = q.hint {
                hintView(hint)
            }

            if let picture = q.picture {
                Text(picture)
                    .font(.system(size: 56))
                    .frame(maxWidth: .infinity)
                    .accessibilityHidden(true)
            }

            if let code = q.code {
                CodeBlock(code: displayCode(code, for: q))
            }

            switch q.kind {
            case .choice:
                choiceOptions(q)
            case .build:
                buildArea(q)
            case .judge:
                judgeOptions(q)
            case .bug:
                bugLines(q)
            case .match:
                matchArea(q)
            }
        }
    }

    /// Learners under 13 see the tip straight away. Everyone else taps to reveal it.
    @ViewBuilder
    private func hintView(_ hint: String) -> some View {
        if store.progress.age < 13 || showHint {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "lightbulb.fill")
                Text(hint).font(Theme.body(15))
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .card(fill: Theme.hintBlue, radius: 16)
        } else {
            Button {
                showHint = true
            } label: {
                Label("Need a hint?", systemImage: "lightbulb")
                    .font(Theme.body(15, weight: .bold))
                    .underline()
            }
            .buttonStyle(.plain)
        }
    }

    /// Shows the learner's pick inside the blank, so they can see the finished line.
    private func displayCode(_ code: String, for q: Question) -> String {
        guard q.kind == .choice, code.contains("___") else { return code }
        return code.replacingOccurrences(of: "___", with: choice ?? "____")
    }

    private func choiceOptions(_ q: Question) -> some View {
        FlowLayout(spacing: 12) {
            ForEach(q.options, id: \.self) { option in
                Button {
                    if outcome == nil { choice = option }
                } label: {
                    TokenChip(text: option, look: look(for: option, in: q))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(choice == option ? [.isSelected] : [])
            }
        }
        .padding(.top, 8)
    }

    private func look(for option: String, in q: Question) -> TokenChip.Look {
        if outcome != nil {
            if option == q.answer.first { return .correct }
            if option == choice { return .wrong }
            return .normal
        }
        return option == choice ? .selected : .normal
    }

    private func buildArea(_ q: Question) -> some View {
        VStack(spacing: 12) {
            FlowLayout(spacing: 8) {
                ForEach(Array(placed.enumerated()), id: \.offset) { item in
                    Button {
                        if outcome == nil { placed.remove(at: item.offset) }
                    } label: {
                        TokenChip(text: q.options[item.element], look: placedLook)
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Tap to take it out")
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: 72)
            .card(radius: 16)

            Text("Tap a piece to add it. Tap it again to take it out.")
                .font(Theme.body(14))
                .foregroundStyle(Theme.muted)
                .frame(maxWidth: .infinity)

            FlowLayout(spacing: 12) {
                ForEach(Array(q.options.enumerated()), id: \.offset) { item in
                    let used = placed.contains(item.offset)
                    Button {
                        if outcome == nil && !used { placed.append(item.offset) }
                    } label: {
                        TokenChip(text: item.element, look: used ? .used : .normal)
                    }
                    .buttonStyle(.plain)
                    .disabled(used)
                }
            }
        }
        .padding(.top, 8)
    }

    private var placedLook: TokenChip.Look {
        guard let outcome else { return .normal }
        return outcome == .correct ? .correct : .wrong
    }

    // MARK: True or false

    private func judgeOptions(_ q: Question) -> some View {
        HStack(spacing: 12) {
            ForEach(q.options, id: \.self) { option in
                Button {
                    if outcome == nil { choice = option }
                } label: {
                    Text(option)
                        .font(Theme.heading(22))
                        .foregroundStyle(Theme.navy)
                        .frame(maxWidth: .infinity, minHeight: 64)
                        .card(fill: fillColor(look(for: option, in: q)), radius: 16, shadow: true)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(choice == option ? [.isSelected] : [])
            }
        }
        .padding(.top, 8)
    }

    private func fillColor(_ look: TokenChip.Look) -> Color {
        switch look {
        case .correct: return Theme.lime
        case .wrong: return Color(hex: 0xFFD3B0)
        case .selected: return Theme.hintBlue
        case .normal, .used: return Theme.card
        }
    }

    // MARK: Find the bug

    private func bugLines(_ q: Question) -> some View {
        VStack(spacing: 10) {
            ForEach(Array(q.options.enumerated()), id: \.offset) { item in
                Button {
                    if outcome == nil { choice = item.element }
                } label: {
                    bugRow(item.element, number: item.offset + 1, look: look(for: item.element, in: q))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Line \(item.offset + 1): \(item.element.trimmingCharacters(in: .whitespaces))")
                .accessibilityAddTraits(choice == item.element ? [.isSelected] : [])
            }
        }
        .padding(.top, 8)
    }

    private func bugRow(_ line: String, number: Int, look: TokenChip.Look) -> some View {
        let indent = line.prefix(while: { $0 == " " }).count
        let text = line.trimmingCharacters(in: .whitespaces)
        return HStack(spacing: 10) {
            Text("\(number)")
                .font(Theme.code(14))
                .foregroundStyle(Theme.muted)
                .frame(width: 20)
            Text(text)
                .font(Theme.code(17))
                .foregroundStyle(Theme.navy)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.leading, CGFloat(indent) * 8)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .card(fill: fillColor(look), radius: 14, shadow: true)
    }

    // MARK: Match

    private func rightItems(_ q: Question) -> [String] {
        q.right ?? q.answer
    }

    /// What the learner matched, as plain text, for the "Explain more" request.
    private func learnerPairsText(_ q: Question) -> String {
        let partners = rightItems(q)
        var parts: [String] = []
        for row in q.options.indices {
            let picked = pairs[row].map { partners[$0] } ?? "?"
            parts.append("\(q.options[row]) -> \(picked)")
        }
        return parts.joined(separator: "; ")
    }

    /// The line waiting for a partner: the one the learner tapped, or the first empty one.
    private func currentRow(count: Int) -> Int? {
        if let row = activeRow, pairs[row] == nil { return row }
        return (0..<count).first(where: { pairs[$0] == nil })
    }

    private func matchArea(_ q: Question) -> some View {
        let partners = rightItems(q)
        let current = outcome == nil ? currentRow(count: q.options.count) : nil
        return VStack(spacing: 14) {
            VStack(spacing: 10) {
                ForEach(Array(q.options.enumerated()), id: \.offset) { item in
                    Button {
                        tapRow(item.offset)
                    } label: {
                        MatchRow(
                            text: item.element,
                            partner: pairs[item.offset].map { partners[$0] },
                            look: rowLook(item.offset, q, partners, current: current)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }

            Text("Pick a partner for the highlighted line. Tap a matched line to change it.")
                .font(Theme.body(14))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            FlowLayout(spacing: 10) {
                ForEach(Array(partners.enumerated()), id: \.offset) { item in
                    let used = pairs.values.contains(item.offset)
                    Button {
                        tapPartner(item.offset, count: q.options.count)
                    } label: {
                        TokenChip(text: item.element, look: used ? .used : .normal)
                    }
                    .buttonStyle(.plain)
                    .disabled(used)
                }
            }
        }
        .padding(.top, 8)
    }

    private func rowLook(_ row: Int, _ q: Question, _ partners: [String], current: Int?) -> MatchRow.Look {
        if outcome != nil {
            guard let j = pairs[row] else { return .wrong }
            return partners[j] == q.answer[row] ? .correct : .wrong
        }
        if row == current { return .active }
        return pairs[row] != nil ? .paired : .normal
    }

    private func tapRow(_ row: Int) {
        guard outcome == nil else { return }
        pairs[row] = nil      // tapping a matched line takes its partner back
        activeRow = row
    }

    private func tapPartner(_ partner: Int, count: Int) {
        guard outcome == nil, let row = currentRow(count: count) else { return }
        pairs[row] = partner
        activeRow = nil
    }

    // MARK: Check button and feedback

    private var canCheck: Bool {
        guard let q = question else { return false }
        switch q.kind {
        case .choice, .judge, .bug: return choice != nil
        case .build: return !placed.isEmpty
        case .match: return pairs.count == q.options.count
        }
    }

    @ViewBuilder
    private func bottomArea(_ q: Question) -> some View {
        if let outcome {
            feedbackSheet(q, correct: outcome == .correct)
        } else {
            Button("Check") { check() }
                .buttonStyle(ChunkyButtonStyle(enabled: canCheck))
                .disabled(!canCheck)
                .padding(16)
        }
    }

    private func feedbackSheet(_ q: Question, correct: Bool) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(correct ? "Nice!" : "Not quite")
                        .font(Theme.heading(26))
                    if !correct {
                        Text(answerText(q))
                            .font(Theme.code(15))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Text(q.explanation)
                        .font(Theme.body(16))
                        .fixedSize(horizontal: false, vertical: true)
                    if !correct && AppConfig.useAIExplanations {
                        aiSection(q)
                    }
                }
                Spacer(minLength: 0)
                BundleImage(name: store.progress.currentForm.moodImage(correct ? .excited : .wink))
                    .frame(width: 72, height: 84)
                    .accessibilityHidden(true)
            }
            Button(correct ? "Continue" : "Got it") { next() }
                .buttonStyle(ChunkyButtonStyle(fill: correct ? Theme.lime : Theme.orange))
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(correct ? Theme.successSheet : Theme.missSheet)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.navy).frame(height: Theme.border)
        }
    }

    @ViewBuilder
    private func aiSection(_ q: Question) -> some View {
        if let aiText {
            Text(aiText)
                .font(Theme.body(15))
                .fixedSize(horizontal: false, vertical: true)
                .padding(12)
                .card(radius: 12)
        } else if aiLoading {
            ProgressView()
                .tint(Theme.navy)
                .accessibilityLabel("Getting an explanation")
        } else {
            Button {
                Task { await explainMore(q) }
            } label: {
                Label("Explain more", systemImage: "sparkles")
                    .font(Theme.body(15, weight: .bold))
                    .underline()
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: Actions

    private func check() {
        guard let q = question else { return }
        let isRight: Bool
        switch q.kind {
        case .choice, .judge, .bug:
            isRight = choice == q.answer.first
        case .build:
            isRight = placed.map { q.options[$0] } == q.answer
        case .match:
            let partners = rightItems(q)
            isRight = q.options.indices.allSatisfy { row in
                guard let j = pairs[row] else { return false }
                return partners[j] == q.answer[row]
            }
        }

        if isRight {
            if !firstTryMisses.contains(q.id) && !finishedIDs.contains(q.id) {
                bolts += Self.boltsPerCorrect
            }
            finishedIDs.insert(q.id)
        } else {
            firstTryMisses.insert(q.id)
            if retried.contains(q.id) {
                // Missed twice: move on so nobody gets stuck.
                finishedIDs.insert(q.id)
            } else {
                retried.insert(q.id)
                queue.append(q)
            }
        }
        outcome = isRight ? .correct : .wrong
        UINotificationFeedbackGenerator().notificationOccurred(isRight ? .success : .error)
    }

    private func next() {
        choice = nil
        placed = []
        pairs = [:]
        activeRow = nil
        showHint = false
        outcome = nil
        aiText = nil
        aiLoading = false
        aiRequest = UUID()
        position += 1
        if position >= queue.count {
            bolts += Self.boltsForFinishing
            finished = true
        }
    }

    @MainActor
    private func explainMore(_ q: Question) async {
        let requestID = UUID()
        aiRequest = requestID
        aiLoading = true
        let learnerAnswer: String
        switch q.kind {
        case .choice, .judge, .bug: learnerAnswer = choice ?? ""
        case .build: learnerAnswer = CodeJoin.join(placed.map { q.options[$0] })
        case .match:
            learnerAnswer = learnerPairsText(q)
        }
        let body = ExplainRequest(
            questionPrompt: q.prompt,
            code: q.kind == .bug ? q.options.joined(separator: "\n") : (q.code ?? ""),
            learnerAnswer: learnerAnswer,
            correctAnswer: q.kind == .match ? pairsText(q, separator: "; ") : CodeJoin.join(q.answer),
            age: store.progress.age,
            studyArea: store.progress.studyArea
        )
        let text: String
        do {
            text = try await APIClient.explain(body)
        } catch {
            text = "Couldn't reach the explainer right now. The note above covers the key idea."
        }
        // Ignore the answer if the learner has already moved on.
        guard aiRequest == requestID else { return }
        aiText = text
        aiLoading = false
    }
}

extension LessonView {
    /// The line under "Not quite" that tells the learner the right answer.
    fileprivate func answerText(_ q: Question) -> String {
        switch q.kind {
        case .choice, .judge:
            return "Answer: \(q.answer.first ?? "")"
        case .build:
            return "Answer: \(CodeJoin.join(q.answer))"
        case .bug:
            return "The mistake: \((q.answer.first ?? "").trimmingCharacters(in: .whitespaces))"
        case .match:
            return pairsText(q, separator: "\n")
        }
    }

    fileprivate func pairsText(_ q: Question, separator: String) -> String {
        zip(q.options, q.answer).map { "\($0) -> \($1)" }.joined(separator: separator)
    }
}

/// One line in a matching question, with the partner the learner picked (if any).
struct MatchRow: View {
    enum Look { case normal, active, paired, correct, wrong }

    let text: String
    let partner: String?
    var look: Look = .normal

    private var fill: Color {
        switch look {
        case .normal: return Theme.card
        case .active: return Theme.sky.opacity(0.45)
        case .paired: return Theme.hintBlue
        case .correct: return Theme.lime
        case .wrong: return Color(hex: 0xFFD3B0)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(text)
                .font(Theme.code(17))
                .foregroundStyle(Theme.navy)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                Image(systemName: "arrow.right")
                    .font(.system(size: 13, weight: .heavy))
                Text(partner ?? "pick a partner")
                    .font(Theme.code(15))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .foregroundStyle(partner == nil ? Theme.muted : Theme.navy)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
        .card(fill: fill, radius: 14, shadow: true)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(text), matched with \(partner ?? "nothing yet")")
    }
}

/// Shown when a lesson is finished.
struct LessonCompleteView: View {
    let bolts: Int
    let form: RobotForm
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            BundleImage(name: form.moodImage(.excited))
                .frame(width: 160, height: 190)
                .accessibilityHidden(true)
            Text("Lesson done!")
                .font(Theme.heading(32))
                .accessibilityAddTraits(.isHeader)
            HStack(spacing: 6) {
                Image(systemName: "bolt.fill").foregroundStyle(Theme.sky)
                Text("+\(bolts) bolts").font(Theme.heading(22))
            }
            .padding(.horizontal, 18)
            .frame(height: 48)
            .card(radius: 24, shadow: true)
            .accessibilityElement(children: .combine)
            Spacer()
            Button("Continue", action: onContinue)
                .buttonStyle(ChunkyButtonStyle())
                .padding(16)
        }
        .frame(maxWidth: .infinity)
    }
}
