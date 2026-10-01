import SwiftUI
import Foundation
import Combine

// The three "Level 10" loop games: type the number for range(?), tap Test!,
// and watch the code run word by word while the picture grows.

enum LoopGameKind: String {
    case plant = "loop_plant"
    case wheel = "loop_wheel"
    case fund = "loop_fund"
}

struct LoopGameConfig {
    let kind: LoopGameKind
    let title: String
    let intro: String
    let varName: String
    let loopVar: String
    let start: Int
    let step: Int
    let goal: Int
    let stepNoun: String
    let iterWord: String
    let runningLabel: String
    let okMessage: String
    let zeroBody: String
    let trapBody: String
    let format: (Int) -> String

    var answer: Int { (goal - start) / step }
    var trap: Int { goal / step }

    func wrongText(total: Int, value: Int) -> (title: String, body: String) {
        let noun = total == 1 ? stepNoun : stepNoun + "s"
        if total == 0 {
            return ("Still \(format(start))", zeroBody)
        }
        if total < answer {
            return ("Only \(format(value))",
                    "\(total) \(noun) took it from \(format(start)) to \(format(value)). It hasn\u{2019}t reached \(format(goal)) yet.")
        }
        if total == trap {
            return ("Overshot: \(format(value))", trapBody)
        }
        return ("Overshot: \(format(value))",
                "\(total) \(noun) took it from \(format(start)) to \(format(value)), past the goal.")
    }

    static func money(_ value: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "en_US")
        return "$" + (formatter.string(from: NSNumber(value: value)) ?? "\(value)")
    }

    static func config(for kind: LoopGameKind) -> LoopGameConfig {
        switch kind {
        case .plant: return plant
        case .wheel: return wheel
        case .fund: return fund
        }
    }

    // Health sciences
    static let plant = LoopGameConfig(
        kind: .plant,
        title: "Grow the plant to 10 cm",
        intro: "range(?) is how many times you pour water. Each pour adds 1 cm. What number goes in the box so the plant reaches 10 cm?",
        varName: "height_of_plant", loopVar: "single_pour",
        start: 2, step: 1, goal: 10,
        stepNoun: "pour", iterWord: "Pour", runningLabel: "Watering\u{2026}",
        okMessage: "It started at 2 cm, so 8 pours bring it to exactly 10 cm.",
        zeroBody: "range(0) runs the loop zero times, so no water was poured.",
        trapBody: "The plant was already 2 cm tall before any pours, so 10 pours is too many.",
        format: { "\($0) cm" }
    )

    // Engineering
    static let wheel = LoopGameConfig(
        kind: .wheel,
        title: "Spin the wheel to 9 turns",
        intro: "The wheel has turned 3 times already. range(?) is how many motor pulses to send, and each pulse adds 1 turn. Reach 9 turns.",
        varName: "wheel_turns", loopVar: "pulse",
        start: 3, step: 1, goal: 9,
        stepNoun: "pulse", iterWord: "Pulse", runningLabel: "Spinning\u{2026}",
        okMessage: "It had already turned 3 times, so 6 pulses bring it to exactly 9 turns.",
        zeroBody: "range(0) runs the loop zero times, so no pulses were sent.",
        trapBody: "The wheel had already turned 3 times before any pulses, so 9 pulses is too many.",
        format: { "\($0) turns" }
    )

    // Business
    static let fund = LoopGameConfig(
        kind: .fund,
        title: "Grow the fund to $4,000",
        intro: "The fund starts at $1,000. range(?) is how many investment cycles you run, and each cycle adds $500. What number reaches $4,000?",
        varName: "fund", loopVar: "cycle",
        start: 1000, step: 500, goal: 4000,
        stepNoun: "cycle", iterWord: "Cycle", runningLabel: "Investing\u{2026}",
        okMessage: "It started at $1,000, so 6 cycles of $500 bring it to exactly $4,000.",
        zeroBody: "range(0) runs the loop zero times, so no cycles ran and nothing was invested.",
        trapBody: "The fund already held $1,000 before the first cycle, so 8 cycles is too many.",
        format: { LoopGameConfig.money($0) }
    )
}

// MARK: - The game's memory

@MainActor
final class LoopGameModel: ObservableObject {

    
    enum RunPhase { case idle, running, done }

    let config: LoopGameConfig

    @Published var input = ""
    @Published var phase: RunPhase = .idle
    @Published var value: Int
    @Published var iter = 0
    @Published var total = 0
    @Published var line = -1
    @Published var tok = -1
    @Published var fx = false
    @Published var attempts = 0

    private let player = StepPlayer()

    init(config: LoopGameConfig) {
        self.config = config
        self.value = config.start
    }
    

    var parsedInput: Int? {
        guard let n = Int(input), n >= 0, n <= 20 else { return nil }
        return n
    }
    var canRun: Bool { phase == .idle && parsedInput != nil }
    var isCorrect: Bool { phase == .done && total == config.answer }
    var isWrong: Bool { phase == .done && total != config.answer }
    var spinDuration: Double { iter <= 1 ? 0.5 : (iter == 2 ? 0.38 : 0.26) }
    var cycles: Int { (value - config.start) / config.step }

    func start() {
        guard canRun, let n = parsedInput else { return }
        total = n
        value = config.start
        iter = 0
        line = -1
        tok = -1
        fx = false
        phase = .running
        player.play(steps(for: n)) { [weak self] step in
            self?.apply(step)
        }
    }

    func retry() {
        player.cancel()
        phase = .idle
        value = config.start
        iter = 0
        line = -1
        tok = -1
        fx = false
    }

    func cancel() { player.cancel() }

    private func steps(for n: Int) -> [RunStep] {
        var list: [RunStep] = []
        for t in 0..<3 { list.append(RunStep(line: 0, tok: t, wait: 360)) }
        if n == 0 {
            for t in 0..<6 { list.append(RunStep(line: 1, tok: t, wait: 360)) }
        }
        if n >= 1 {
            for i in 1...n {
                let d = i == 1 ? 360 : (i == 2 ? 200 : 90)
                let g = i == 1 ? 560 : (i == 2 ? 440 : 300)
                for t in 0..<6 {
                    var s = RunStep(line: 1, tok: t, wait: d)
                    s.iter = i
                    list.append(s)
                }
                for t in 0..<5 {
                    var s = RunStep(line: 2, tok: t, wait: d)
                    s.iter = i
                    list.append(s)
                }
                var grow = RunStep(wait: g)
                grow.iter = i
                grow.grow = true
                list.append(grow)
            }
        }
        list.append(RunStep(wait: 250, finish: true))
        return list
    }

    private func apply(_ s: RunStep) {
        if s.finish {
            attempts += 1          // count first: the view reads this when the phase changes
            phase = .done
            line = -1
            tok = -1
            fx = false
            return
        }
        if let i = s.iter { iter = i }
        if s.grow {
            withAnimation(.easeInOut(duration: spinDuration)) { value += config.step }
            fx = true
            line = 2
            tok = 99
            let hold = min(s.wait - 20, 420)
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: UInt64(hold) * 1_000_000)
                self.fx = false
            }
        } else if let l = s.line {
            line = l
            tok = s.tok
        }
    }
}

// MARK: - The screen

struct LoopGameView: View {
    let config: LoopGameConfig
    @Binding var progress: Double
    @Binding var bolts: Int
    let onDone: () -> Void

    @StateObject private var model: LoopGameModel
    @EnvironmentObject private var store: AppStore
    @State private var awarded = false

    init(config: LoopGameConfig, progress: Binding<Double>, bolts: Binding<Int>, onDone: @escaping () -> Void) {
        self.config = config
        _progress = progress
        _bolts = bolts
        self.onDone = onDone
        _model = StateObject(wrappedValue: LoopGameModel(config: config))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(config.title)
                        .font(Theme.heading(26))
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    Text(config.intro)
                        .font(Theme.body(15))
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    visual
                        .frame(maxWidth: .infinity)
                        .frame(height: 204)
                        .card(radius: 16)
                    CodePanel(
                        lines: codeLines,
                        activeLine: model.phase == .running ? model.line : nil,
                        activeTok: model.tok,
                        input: { _ in AnyView(inputField) }
                    )
                    statusRow
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            bottomArea
        }
        .onDisappear { model.cancel() }
        .onChange(of: model.phase) { _, phase in
            if phase == .done && model.isCorrect && !awarded {
                awarded = true
                if model.attempts == 1 { bolts += 5 }
                progress = 1
            }
        }
    }

    // MARK: Parts

    @ViewBuilder
    private var visual: some View {
        switch config.kind {
        case .plant:
            FittedArt { PlantArt(height: model.value, pouring: model.fx) }
        case .wheel:
            FittedArt { WheelArt(turns: model.value, startTurns: config.start, goal: config.goal, pulsing: model.fx) }
        case .fund:
            FittedArt { FundArt(fund: model.value, cycles: model.cycles, fx: model.fx) }
        }
    }

    private var codeLines: [CodeLine] {
        [
            CodeLine(indent: 0, tokens: [tk(config.varName, ""), tk("="), tk("\(config.start)", " ", .number)]),
            CodeLine(indent: 0, tokens: [tk("for", "", .keyword), tk(config.loopVar), tk("in", " ", .keyword),
                                         tk("range(", " "), tk("______", "", .input), tk("):", "")]),
            CodeLine(indent: 1, tokens: [tk(config.varName, ""), tk("="), tk(config.varName), tk("+"),
                                         tk("\(config.step)", " ", .number)]),
        ]
    }

    private var inputBinding: Binding<String> {
        Binding(
            get: { model.input },
            set: { text in model.input = String(text.filter { $0.isASCII && $0.isNumber }.prefix(2)) }
        )
    }

    private var inputFill: Color {
        if model.phase == .running && model.line == 1 && model.tok == 4 { return Theme.lime }
        if model.phase == .running && model.line == 1 && model.tok > 4 { return Theme.successSheet }
        return .white
    }

    private var inputField: some View {
        TextField("?", text: inputBinding)
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .font(Theme.code(14))
            .foregroundStyle(CodeColors.number)
            .frame(width: 46, height: 24)
            .background(RoundedRectangle(cornerRadius: 8).fill(inputFill))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.navy, lineWidth: 2))
            .disabled(model.phase != .idle)
            .accessibilityLabel("Number of \(config.stepNoun)s")
    }

    private var statusRow: some View {
        HStack(spacing: 8) {
            if model.phase != .idle {
                Text("\(config.iterWord) \(model.iter) of \(model.total)")
                    .font(Theme.body(14, weight: .bold))
                    .padding(.horizontal, 12)
                    .frame(height: 32)
                    .card(radius: 16)
            }
            Text("\(config.varName) = \(model.value)")
                .font(Theme.code(13))
                .padding(.horizontal, 12)
                .frame(height: 32)
                .card(fill: Theme.successSheet, radius: 16)
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private var bottomArea: some View {
        if model.isCorrect {
            GameFeedbackSheet(
                correct: true, title: "Nice!", message: config.okMessage, buttonTitle: "Continue",
                robotName: store.progress.currentForm.moodImage(.excited), action: onDone
            )
        } else if model.isWrong {
            let text = config.wrongText(total: model.total, value: model.value)
            GameFeedbackSheet(
                correct: false, title: text.title, message: text.body, buttonTitle: "Try again",
                robotName: nil
            ) { model.retry() }
        } else {
            Button(model.phase == .running ? config.runningLabel : "Test!") {
                dismissKeyboard()
                model.start()
            }
                .buttonStyle(ChunkyButtonStyle(enabled: model.canRun))
                .disabled(!model.canRun)
                .padding(16)
        }
    }
}

// MARK: - Artwork (drawn in a 345 x 199 space)

struct LeafShape: Shape {
    func path(in rect: CGRect) -> Path {
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x / 18 * rect.width, y: rect.maxY + y / 13 * rect.height)
        }
        var p = Path()
        p.move(to: pt(0, 0))
        p.addCurve(to: pt(18, -13), control1: pt(8, 0), control2: pt(16, -4))
        p.addCurve(to: pt(0, 0), control1: pt(9, -14), control2: pt(2, -9))
        p.closeSubpath()
        return p
    }
}

struct RadialLines: Shape {
    var count: Int
    var inner: CGFloat
    var outer: CGFloat

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let c = CGPoint(x: rect.midX, y: rect.midY)
        for k in 0..<count {
            let a = Double(k) / Double(count) * 2 * Double.pi
            let s = CGFloat(sin(a))
            let co = CGFloat(cos(a))
            p.move(to: CGPoint(x: c.x + inner * s, y: c.y - inner * co))
            p.addLine(to: CGPoint(x: c.x + outer * s, y: c.y - outer * co))
        }
        return p
    }
}

struct PlantArt: View {
    let height: Int
    let pouring: Bool

    private let baseY: CGFloat = 152
    private let cm: CGFloat = 6
    private var h: CGFloat { CGFloat(height) }

    var body: some View {
        ZStack(alignment: .topLeading) {
            ruler
            goal
            Rectangle()
                .fill(Theme.navy)
                .frame(width: 4, height: max(h * cm, 1))
                .position(x: 150, y: baseY - h * cm / 2)
            ForEach(1...11, id: \.self) { k in leaf(k) }
            Circle()
                .fill(Theme.lime)
                .overlay(Circle().stroke(Theme.navy, lineWidth: 2))
                .frame(width: 10, height: 10)
                .position(x: 150, y: baseY - h * cm)
            heightLabel
            can
            pot
        }
        .frame(width: 345, height: 199, alignment: .topLeading)
        .accessibilityElement()
        .accessibilityLabel("A plant in a pot, \(height) centimetres tall. The goal is 10 centimetres.")
    }

    private var ruler: some View {
        ZStack(alignment: .topLeading) {
            Path { p in
                p.move(to: CGPoint(x: 300, y: 20))
                p.addLine(to: CGPoint(x: 300, y: 152))
                for c in 0...22 {
                    let y = 152 - CGFloat(c) * 6
                    let len: CGFloat = c % 5 == 0 ? 9 : 4
                    p.move(to: CGPoint(x: 300, y: y))
                    p.addLine(to: CGPoint(x: 300 + len, y: y))
                }
            }
            .stroke(Theme.navy, lineWidth: 1.5)
            ForEach([0, 5, 10, 15, 20], id: \.self) { c in
                Text("\(c)")
                    .font(Theme.body(11, weight: .bold))
                    .foregroundStyle(Theme.muted)
                    .position(x: 322, y: 152 - CGFloat(c) * 6)
            }
        }
    }

    private var goal: some View {
        ZStack(alignment: .topLeading) {
            Path { p in
                p.move(to: CGPoint(x: 20, y: 92))
                p.addLine(to: CGPoint(x: 296, y: 92))
            }
            .stroke(Theme.orange, style: StrokeStyle(lineWidth: 2.5, dash: [6, 5]))
            Text("goal: 10 cm")
                .font(Theme.body(11, weight: .bold))
                .foregroundStyle(CodeColors.number)
                .position(x: 56, y: 82)
        }
    }

    private func leaf(_ k: Int) -> some View {
        let right = k % 2 == 1
        let y = baseY - (CGFloat(2 * k) - 0.5) * cm
        let shown = height >= 2 * k
        return LeafShape()
            .fill(Theme.lime)
            .overlay(LeafShape().stroke(Theme.navy, style: StrokeStyle(lineWidth: 2, lineJoin: .round)))
            .frame(width: 18, height: 13)
            .scaleEffect(x: right ? 1 : -1, y: 1)
            .scaleEffect(shown ? 1 : 0.001, anchor: right ? .bottomLeading : .bottomTrailing)
            .position(x: right ? 159 : 141, y: y - 6.5)
    }

    private var heightLabel: some View {
        Text("\(height) cm")
            .font(Theme.body(12, weight: .bold))
            .foregroundStyle(Theme.navy)
            .frame(width: 52, height: 22)
            .background(Capsule().fill(Theme.card))
            .overlay(Capsule().stroke(Theme.navy, lineWidth: 2))
            .position(x: 96, y: baseY - h * cm + 2)
    }

    private var spout: Path {
        var p = Path()
        p.move(to: CGPoint(x: 206, y: 116))
        p.addLine(to: CGPoint(x: 177, y: 101))
        p.addLine(to: CGPoint(x: 175, y: 107))
        p.addLine(to: CGPoint(x: 206, y: 127))
        p.closeSubpath()
        return p
    }

    private var can: some View {
        ZStack(alignment: .topLeading) {
            spout.fill(Theme.sky)
            spout.stroke(Theme.navy, style: StrokeStyle(lineWidth: 2, lineJoin: .round))
            RoundedRectangle(cornerRadius: 6).fill(Theme.sky)
                .frame(width: 40, height: 32).position(x: 224, y: 124)
            RoundedRectangle(cornerRadius: 6).stroke(Theme.navy, lineWidth: 2.5)
                .frame(width: 40, height: 32).position(x: 224, y: 124)
            Path { p in
                p.move(to: CGPoint(x: 244, y: 114))
                p.addCurve(to: CGPoint(x: 244, y: 134), control1: CGPoint(x: 258, y: 114), control2: CGPoint(x: 258, y: 134))
            }
            .stroke(Theme.navy, style: StrokeStyle(lineWidth: 3, lineCap: .round))
            ForEach(0..<3, id: \.self) { i in
                drop(i)
            }
        }
    }

    private func drop(_ i: Int) -> some View {
        let anim: Animation? = pouring ? Animation.easeIn(duration: 0.4).delay(Double(i) * 0.06) : nil
        return Capsule()
            .fill(Theme.sky)
            .overlay(Capsule().stroke(Theme.navy, lineWidth: 1))
            .frame(width: 5, height: 9)
            .position(x: 169 + CGFloat(i) * 3, y: 112 + CGFloat(i) * 2)
            .offset(y: pouring ? 36 : 0)
            .opacity(pouring ? 1 : 0)
            .animation(anim, value: pouring)
    }

    private var pot: some View {
        ZStack(alignment: .topLeading) {
            Path { p in
                p.move(to: CGPoint(x: 118, y: 154))
                p.addLine(to: CGPoint(x: 182, y: 154))
                p.addLine(to: CGPoint(x: 176, y: 190))
                p.addLine(to: CGPoint(x: 124, y: 190))
                p.closeSubpath()
            }
            .fill(Theme.orange)
            Path { p in
                p.move(to: CGPoint(x: 118, y: 154))
                p.addLine(to: CGPoint(x: 182, y: 154))
                p.addLine(to: CGPoint(x: 176, y: 190))
                p.addLine(to: CGPoint(x: 124, y: 190))
                p.closeSubpath()
            }
            .stroke(Theme.navy, style: StrokeStyle(lineWidth: 2.5, lineJoin: .round))
            RoundedRectangle(cornerRadius: 3).fill(Theme.orange)
                .frame(width: 76, height: 10).position(x: 150, y: 151)
            RoundedRectangle(cornerRadius: 3).stroke(Theme.navy, lineWidth: 2.5)
                .frame(width: 76, height: 10).position(x: 150, y: 151)
        }
    }
}

struct WheelArt: View {
    let turns: Int
    let startTurns: Int
    let goal: Int
    let pulsing: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            wheel.position(x: 100, y: 76)
            Circle()
                .fill(Theme.lime)
                .overlay(Circle().stroke(Theme.navy, lineWidth: 2.5))
                .frame(width: 22, height: 22)
                .position(x: 100, y: 76)

            Image(systemName: "bolt.fill")
                .font(.system(size: 34, weight: .black))
                .foregroundStyle(Theme.sky)
                .shadow(color: Theme.navy, radius: 0, x: 1, y: 1)
                .opacity(pulsing ? 1 : 0.3)
                .scaleEffect(pulsing ? 1.2 : 1)
                .animation(.easeOut(duration: 0.25), value: pulsing)
                .position(x: 250, y: 40)
            Text("motor pulse")
                .font(Theme.body(11, weight: .bold)).foregroundStyle(Theme.muted)
                .position(x: 250, y: 70)
            Text("\(turns)")
                .font(Theme.heading(40))
                .position(x: 250, y: 106)
            Text("turns")
                .font(Theme.body(12, weight: .bold)).foregroundStyle(Theme.muted)
                .position(x: 250, y: 134)

            meter
        }
        .frame(width: 345, height: 199, alignment: .topLeading)
        .accessibilityElement()
        .accessibilityLabel("A robot wheel that has turned \(turns) times. The goal is \(goal) turns.")
    }

    private var wheel: some View {
        ZStack {
            Circle().fill(Theme.navy)
            RadialLines(count: 20, inner: 46.5, outer: 54).stroke(Theme.muted, lineWidth: 3.5)
            Circle().fill(Theme.card).frame(width: 72, height: 72)
            Circle().stroke(Theme.sky, lineWidth: 3).frame(width: 72, height: 72)
            RadialLines(count: 6, inner: 0, outer: 36)
                .stroke(Theme.navy, style: StrokeStyle(lineWidth: 4, lineCap: .round))
            Circle()
                .fill(Theme.orange)
                .overlay(Circle().stroke(Theme.navy, lineWidth: 2))
                .frame(width: 12, height: 12)
                .offset(y: -26)
        }
        .frame(width: 108, height: 108)
        .rotationEffect(.degrees(Double(turns - startTurns) * 360))
    }

    private var meter: some View {
        let width = 276 * CGFloat(min(turns, 23)) / 23
        let goalX = 30 + 12 * CGFloat(goal)
        return ZStack(alignment: .topLeading) {
            Capsule().fill(Theme.locked).frame(width: 276, height: 12).position(x: 168, y: 162)
            Capsule().fill(Theme.lime).frame(width: max(width, 1), height: 12).position(x: 30 + max(width, 1) / 2, y: 162)
            Capsule().stroke(Theme.navy, lineWidth: 2).frame(width: 276, height: 12).position(x: 168, y: 162)
            ForEach([0, 5, 10, 15, 20], id: \.self) { c in
                Text("\(c)")
                    .font(Theme.body(11, weight: .bold)).foregroundStyle(Theme.muted)
                    .position(x: 30 + 12 * CGFloat(c), y: 188)
            }
            Path { p in
                p.move(to: CGPoint(x: goalX, y: 144))
                p.addLine(to: CGPoint(x: goalX, y: 176))
            }
            .stroke(Theme.orange, style: StrokeStyle(lineWidth: 2.5, dash: [5, 4]))
            Text("goal: \(goal) turns")
                .font(Theme.body(11, weight: .bold)).foregroundStyle(CodeColors.number)
                .position(x: goalX + 44, y: 150)
        }
    }
}

struct FundArt: View {
    let fund: Int
    let cycles: Int
    let fx: Bool

    private let baseY: CGFloat = 170
    private let cap = 6000
    private var barHeight: CGFloat { CGFloat(min(fund, cap)) / 1000 * 20 }

    var body: some View {
        ZStack(alignment: .topLeading) {
            axis
            Rectangle()
                .fill(Theme.lime)
                .overlay(Rectangle().stroke(Theme.navy, lineWidth: 2.5))
                .frame(width: 56, height: max(barHeight, 1))
                .position(x: 104, y: baseY - barHeight / 2)
            Path { p in
                p.move(to: CGPoint(x: 52, y: 90))
                p.addLine(to: CGPoint(x: 216, y: 90))
            }
            .stroke(Theme.orange, style: StrokeStyle(lineWidth: 2.5, dash: [6, 5]))
            Text("goal: $4,000")
                .font(Theme.body(11, weight: .bold)).foregroundStyle(CodeColors.number)
                .position(x: 186, y: 82)

            Text((fund > cap ? "\u{25B2} " : "") + LoopGameConfig.money(fund))
                .font(Theme.body(12, weight: .bold))
                .foregroundStyle(Theme.navy)
                .frame(width: 76, height: 18)
                .background(Capsule().fill(Theme.card))
                .overlay(Capsule().stroke(Theme.navy, lineWidth: 2))
                .position(x: 104, y: baseY - barHeight - 15)

            coin
                .position(x: 104, y: baseY - barHeight - 40)

            Text("Fund")
                .font(Theme.body(11, weight: .bold)).foregroundStyle(Theme.muted)
                .position(x: 104, y: 189)

            Text("Cycles")
                .font(Theme.body(12, weight: .bold)).foregroundStyle(Theme.muted)
                .position(x: 278, y: 54)
            VStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { row in
                    HStack(spacing: 4) {
                        ForEach(0..<5, id: \.self) { col in
                            RoundedRectangle(cornerRadius: 4)
                                .fill(row * 5 + col < cycles ? Theme.lime : Theme.locked)
                                .frame(width: 17, height: 17)
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.navy, lineWidth: 2))
                        }
                    }
                }
            }
            .position(x: 278, y: 108)
        }
        .frame(width: 345, height: 199, alignment: .topLeading)
        .accessibilityElement()
        .accessibilityLabel("The fund holds \(LoopGameConfig.money(fund)). The goal is $4,000. \(cycles) of 20 cycles done.")
    }

    private var axis: some View {
        ZStack(alignment: .topLeading) {
            Path { p in
                p.move(to: CGPoint(x: 52, y: 50))
                p.addLine(to: CGPoint(x: 52, y: baseY))
                p.addLine(to: CGPoint(x: 216, y: baseY))
                for k in 0...6 {
                    let y = baseY - CGFloat(k) * 20
                    p.move(to: CGPoint(x: k % 2 == 0 ? 46 : 48, y: y))
                    p.addLine(to: CGPoint(x: 52, y: y))
                }
            }
            .stroke(Theme.navy, lineWidth: 1.5)
            ForEach([0, 2, 4, 6], id: \.self) { k in
                Text(k == 0 ? "$0" : "$\(k)k")
                    .font(Theme.body(11, weight: .bold)).foregroundStyle(Theme.muted)
                    .position(x: 28, y: baseY - CGFloat(k) * 20)
            }
        }
    }

    private var coin: some View {
        Circle()
            .fill(Color(hex: 0xFFC93C))
            .overlay(Circle().stroke(Theme.navy, lineWidth: 2))
            .overlay(Text("$").font(Theme.heading(12)).foregroundStyle(Theme.navy))
            .frame(width: 18, height: 18)
            .offset(y: fx ? 0 : -20)
            .opacity(fx ? 1 : 0)
            .animation(fx ? Animation.easeIn(duration: 0.4) : nil, value: fx)
    }
}
