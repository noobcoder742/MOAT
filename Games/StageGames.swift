import SwiftUI
import Foundation
import Combine

// The three "Level 40" stages. Each has five short parts:
// a string-method question, build the function, call it, loop it, and a full run.

// MARK: - Data

enum StagePartKind { case choice, order, run }

struct StageOption {
    let id: String
    let text: String
}

struct StagePiece {
    let id: String
    let text: String
    let indent: Int
}

struct StagePart {
    let kind: StagePartKind
    let name: String
    let prompt: String
    var seq = ""                          // the strand / signal / log shown on top
    var reveal: [String] = []             // letters that light up after a correct answer
    var showRatio: String? = nil
    var code: [CodeLine] = []             // choice parts: code shown above the options
    var options: [StageOption] = []
    var answer = ""
    var why: [String: String] = [:]       // wrong option id -> why it is wrong
    var pieces: [StagePiece] = []         // order parts: the lines, in the right order
    var trayOrder: [String] = []          // order parts: the order the lines are shown in
    var hint = ""
    var ok = ""
    var okTitle = "Nice!"
}

struct StageConfig {
    let title: String
    let legend: String
    let readoutLabel: String
    let fn: String
    let itemWord: String
    let countVar: String
    let seqs: [String]
    let targets: [String]
    let tileHeights: [String: CGFloat]
    let program: [CodeLine]
    let printSplit: Int
    let parts: [StagePart]
}

struct StageSpec {
    let title: String
    let legend: String
    let readoutLabel: String
    let fn: String
    let param: String
    let countVar: String
    let list: String
    let itemWord: String
    let counts: [String]
    let seqs: [String]
    var tileHeights: [String: CGFloat] = [:]
    let p1seq: String
    let p1char: String
    let p1prompt: String
    let p1opts: [String]
    let p1ans: String
    let p1why: [String: String]
    let p1ok: String
    let p2ok: String
    let p3seq: String
    let p3prompt: String
    let p3opts: [String]
    let p3ans: String
    let p3pct: String
    let p3why: [String: String]
    let p3ok: String

    private func options(_ texts: [String]) -> [StageOption] {
        let ids = ["a", "b", "c", "d"]
        return texts.enumerated().map { StageOption(id: ids[$0.offset], text: $0.element) }
    }

    func build() -> StageConfig {
        // The counting line, for example: gc = sequence.count("G") + sequence.count("C")
        var countTokens: [CodeToken] = [tk(countVar, ""), tk("=")]
        for (i, ch) in counts.enumerated() {
            if i > 0 { countTokens.append(tk("+")) }
            countTokens.append(tk("\(param).count(", " "))
            countTokens.append(tk("\"\(ch)\"", "", .string, hl: ch))
            countTokens.append(tk(")", ""))
        }
        let countText = countVar + " = " + counts.map { "\(param).count(\"\($0)\")" }.joined(separator: " + ")

        var listTokens: [CodeToken] = [tk(list, ""), tk("=")]
        for (i, s) in seqs.enumerated() {
            let last = i == seqs.count - 1
            let text: String
            if last { text = "\"\(s)\"]" } else if i == 0 { text = "[\"\(s)\"," } else { text = "\"\(s)\"," }
            listTokens.append(tk(text, " ", .string))
        }

        let defLine = CodeLine(indent: 0, tokens: [tk("def", "", .keyword), tk("\(fn)(", " "), tk(param, ""), tk("):", "")])
        let countLine = CodeLine(indent: 1, tokens: countTokens)
        let returnLine = CodeLine(indent: 1, tokens: [tk("return", "", .keyword), tk(countVar, " "), tk("/"), tk("len(\(param))")])
        let listLine = CodeLine(indent: 0, tokens: listTokens)
        let forLine = CodeLine(indent: 0, tokens: [tk("for", "", .keyword), tk(param, " "), tk("in", " ", .keyword), tk(list, " "), tk(":", "")])
        let printLine = CodeLine(indent: 1, tokens: [tk("print(", "", .keyword), tk("\(fn)(", ""), tk(param, ""), tk(")", ""), tk(")", "")])
        let program = [defLine, countLine, returnLine, listLine, forLine, printLine]

        var part1 = StagePart(kind: .choice, name: "String method", prompt: p1prompt)
        part1.seq = p1seq
        part1.reveal = [p1char]
        part1.code = [CodeLine(indent: 0, tokens: [
            tk("print(", "", .keyword), tk("\"\(p1seq)\"", "", .string), tk(".count(", ""),
            tk("\"\(p1char)\"", "", .string), tk(")", ""), tk(")", "")])]
        part1.options = options(p1opts)
        part1.answer = p1ans
        part1.why = p1why
        part1.ok = p1ok
        part1.okTitle = "Nice!"

        var part2 = StagePart(kind: .order, name: "Build the function", prompt: "Tap the lines in the right order to build the function.")
        part2.seq = seqs[0]
        part2.reveal = counts
        part2.pieces = [
            StagePiece(id: "p1", text: "def \(fn)(\(param)):", indent: 0),
            StagePiece(id: "p2", text: countText, indent: 1),
            StagePiece(id: "p3", text: "return \(countVar) / len(\(param))", indent: 1),
        ]
        part2.trayOrder = ["p3", "p1", "p2"]
        part2.hint = "The def line comes first. The lines under it are indented, and return goes last."
        part2.ok = p2ok
        part2.okTitle = "Built!"

        var part3 = StagePart(kind: .choice, name: "Call it", prompt: p3prompt)
        part3.seq = p3seq
        part3.reveal = counts
        part3.showRatio = p3pct
        part3.code = [defLine, countLine, returnLine, CodeLine(indent: 0, tokens: [
            tk("print(", "", .keyword), tk("\(fn)(", ""), tk("\"\(p3seq)\"", "", .string), tk(")", ""), tk(")", "")])]
        part3.options = options(p3opts)
        part3.answer = p3ans
        part3.why = p3why
        part3.ok = p3ok
        part3.okTitle = "Right!"

        var part4 = StagePart(kind: .choice, name: "Loop it", prompt: "Which name goes in the blank so the loop visits every \(itemWord)?")
        part4.seq = seqs[0]
        part4.code = [
            listLine,
            CodeLine(indent: 0, tokens: [tk("for", "", .keyword), tk(param, " "), tk("in", " ", .keyword), tk("", " ", .input), tk(":", "")]),
            printLine,
        ]
        part4.options = options([fn, "\"\(param)\"", list, "len(\(param))"])
        part4.answer = "c"
        part4.why = [
            "a": "\(fn) is the function. The loop needs the list.",
            "b": "In quotes it is just text, so the loop would go letter by letter.",
            "d": "len gives a number, and a loop cannot walk through a number.",
        ]
        part4.ok = "The loop walks through \(list), one \(itemWord) at a time."
        part4.okTitle = "Looped!"

        var part5 = StagePart(kind: .run, name: "Run it", prompt: "Run the whole program and watch each \(itemWord) get counted.")
        part5.seq = seqs[0]
        part5.ok = "A function, a string method and a loop, all working together."

        return StageConfig(title: title, legend: legend, readoutLabel: readoutLabel, fn: fn, itemWord: itemWord,
                           countVar: countVar, seqs: seqs, targets: counts, tileHeights: tileHeights,
                           program: program, printSplit: 3, parts: [part1, part2, part3, part4, part5])
    }
}

enum StageCatalog {
    static func config(for game: String) -> StageConfig? {
        switch game {
        case "stage_gc": return health
        case "stage_duty": return engineering
        case "stage_conversion": return business
        default: return nil
        }
    }

    // Health sciences: GC content of DNA strands
    static let health = StageSpec(
        title: "GC content lab", legend: "G and C are the letters we count", readoutLabel: "GC content",
        fn: "gc_content", param: "sequence", countVar: "gc", list: "sequences", itemWord: "strand",
        counts: ["G", "C"], seqs: ["ATGCGT", "GGCAAT", "TTATGC"],
        p1seq: "ATGCGT", p1char: "G", p1prompt: "What does \"ATGCGT\".count(\"G\") give?",
        p1opts: ["1", "2", "3", "6"], p1ans: "b",
        p1why: ["a": "ATGCGT has two Gs. Count them again.",
                "c": "3 is G and C together. count(\"G\") counts only the Gs.",
                "d": "6 is the length of the strand, not the number of Gs."],
        p1ok: "There are 2 Gs in ATGCGT, so count(\"G\") gives 2.",
        p2ok: "It counts G and C, then divides by the strand length.",
        p3seq: "GGCAAT", p3prompt: "What does gc_content(\"GGCAAT\") return?",
        p3opts: ["3", "6", "0.3333333333333333", "0.5"], p3ans: "d", p3pct: "50%",
        p3why: ["a": "That is gc, the count. return divides it by the length, 6.",
                "b": "That is len(sequence). return gives gc / len(sequence).",
                "c": "That is the ratio for another strand. GGCAAT has 2 Gs and 1 C, so 3 / 6."],
        p3ok: "gc is 3 and the length is 6, so it returns 3 / 6 = 0.5."
    ).build()

    // Engineering: duty cycle of a PWM signal
    static let engineering = StageSpec(
        title: "Duty cycle lab", legend: "1 = high, 0 = low", readoutLabel: "Duty cycle",
        fn: "duty_cycle", param: "signal", countVar: "highs", list: "signals", itemWord: "signal",
        counts: ["1"], seqs: ["1100", "1110", "1000"], tileHeights: ["1": 46, "0": 20],
        p1seq: "1101", p1char: "1", p1prompt: "What does \"1101\".count(\"1\") give?",
        p1opts: ["1", "2", "3", "4"], p1ans: "c",
        p1why: ["a": "1101 has three 1s. Count them again.",
                "b": "1101 has three 1s, not two.",
                "d": "4 is the length of the signal, not the number of 1s."],
        p1ok: "There are three 1s in 1101, so count(\"1\") gives 3.",
        p2ok: "It counts the 1s, then divides by the signal length.",
        p3seq: "1110", p3prompt: "What does duty_cycle(\"1110\") return?",
        p3opts: ["0.25", "3", "4", "0.75"], p3ans: "d", p3pct: "75%",
        p3why: ["a": "That is the ratio for \"1000\". 1110 has three 1s out of 4.",
                "b": "That is highs, the count. return divides it by the length, 4.",
                "c": "That is len(signal). return gives highs / len(signal)."],
        p3ok: "highs is 3 and the length is 4, so it returns 3 / 4 = 0.75."
    ).build()

    // Business: conversion rate of a sales log
    static let business = StageSpec(
        title: "Conversion lab", legend: "S = sale, N = no sale", readoutLabel: "Conversion",
        fn: "conversion_rate", param: "log", countVar: "sales", list: "logs", itemWord: "log",
        counts: ["S"], seqs: ["SNSNN", "SSSNN", "NNNNS"],
        p1seq: "SNSNN", p1char: "S", p1prompt: "S = sale, N = no sale. What does \"SNSNN\".count(\"S\") give?",
        p1opts: ["1", "2", "3", "5"], p1ans: "b",
        p1why: ["a": "SNSNN has two Ss. Count them again.",
                "c": "SNSNN is S, N, S, N, N. That is two Ss, not three.",
                "d": "5 is the length of the log, not the number of Ss."],
        p1ok: "There are 2 Ss in SNSNN, so count(\"S\") gives 2.",
        p2ok: "It counts the sales, then divides by the log length.",
        p3seq: "SSSNN", p3prompt: "What does conversion_rate(\"SSSNN\") return?",
        p3opts: ["0.4", "3", "5", "0.6"], p3ans: "d", p3pct: "60%",
        p3why: ["a": "That is the ratio for another log. SSSNN has three Ss out of 5.",
                "b": "That is sales, the count. return divides it by the length, 5.",
                "c": "That is len(log). return gives sales / len(log)."],
        p3ok: "sales is 3 and the length is 5, so it returns 3 / 5 = 0.6."
    ).build()
}

// MARK: - The stage's memory

@MainActor
final class StageGameModel: ObservableObject {
    enum Verdict { case pending, correct, wrong }
    enum RunPhase { case idle, running, done }

    let config: StageConfig

    @Published var partIndex = 0
    @Published var picked: String? = nil
    @Published var placed: [String] = []
    @Published var slotBad: [Bool] = []
    @Published var result: Verdict = .pending
    @Published var runPhase: RunPhase = .idle
    @Published var line = -1
    @Published var tok = -1
    @Published var seqIndex = -1
    @Published var highlights: [String] = []
    @Published var ratio: String? = nil
    @Published var outputs: [String] = []
    @Published var caption = ""
    @Published var missed: Set<Int> = []

    private let player = StepPlayer()

    init(config: StageConfig) { self.config = config }

    var part: StagePart { config.parts[partIndex] }
    var isLastPart: Bool { partIndex == config.parts.count - 1 }

    var tilesSequence: String {
        part.kind == .run ? config.seqs[max(0, seqIndex)] : part.seq
    }

    var highlightedLetters: [String] {
        if part.kind == .run { return highlights }
        return result == .correct ? part.reveal : []
    }

    var readout: String {
        if part.kind == .run {
            guard let ratio, let value = Double(ratio) else { return "\u{2014}" }
            return "\(Int((value * 100).rounded()))%"
        }
        return (result == .correct ? part.showRatio : nil) ?? "\u{2014}"
    }

    var wrongMessage: String {
        if part.kind == .order { return part.hint }
        return part.why[picked ?? ""] ?? "Have another look."
    }

    // MARK: Answering

    func pick(_ id: String) {
        guard result == .pending, part.kind == .choice else { return }
        picked = id
        if id == part.answer {
            result = .correct
        } else {
            result = .wrong
            missed.insert(partIndex)
        }
    }

    func place(_ id: String) {
        guard result == .pending, part.kind == .order, !placed.contains(id) else { return }
        placed.append(id)
        guard placed.count == part.pieces.count else { return }
        var bad: [Bool] = []
        for (i, pid) in placed.enumerated() { bad.append(pid != part.pieces[i].id) }
        slotBad = bad
        if bad.contains(true) {
            result = .wrong
            missed.insert(partIndex)
        } else {
            result = .correct
        }
    }

    func unplace(_ index: Int) {
        guard result == .pending, placed.indices.contains(index) else { return }
        placed.remove(at: index)
    }

    func retry() {
        player.cancel()
        picked = nil
        placed = []
        slotBad = []
        result = .pending
    }

    func next() {
        player.cancel()
        partIndex += 1
        picked = nil
        placed = []
        slotBad = []
        result = .pending
        runPhase = .idle
        clearRun()
    }

    func cancel() { player.cancel() }

    private func clearRun() {
        line = -1
        tok = -1
        seqIndex = -1
        highlights = []
        ratio = nil
        outputs = []
        caption = ""
    }

    // MARK: Running the whole program

    func startRun() {
        guard part.kind == .run, runPhase == .idle else { return }
        clearRun()
        runPhase = .running
        player.play(runSteps()) { [weak self] step in
            self?.apply(step)
        }
    }

    private func apply(_ s: RunStep) {
        if s.finish {
            line = -1
            tok = -1
            runPhase = .done
            result = .correct
            return
        }
        if let l = s.line {
            line = l
            tok = s.tok
        }
        if let i = s.seqIndex { seqIndex = i }
        if s.clearHighlights {
            highlights = []
            ratio = nil
        }
        if let h = s.highlight { highlights.append(h) }
        if let r = s.ratio { ratio = r }
        if let o = s.output { outputs.append(o) }
        if let c = s.caption { caption = c }
    }

    private func runSteps() -> [RunStep] {
        let c = config
        let prog = c.program
        var steps: [RunStep] = []

        for t in 0..<prog[0].tokens.count {
            var s = RunStep(line: 0, tok: t, wait: 150)
            if t == 0 { s.caption = "def only saves the recipe. Nothing runs yet." }
            steps.append(s)
        }
        steps.append(RunStep(line: 0, tok: 99, wait: 450))
        for t in 0..<prog[3].tokens.count {
            var s = RunStep(line: 3, tok: t, wait: 150)
            if t == 0 { s.caption = "The list holds three \(c.itemWord)s." }
            steps.append(s)
        }
        steps.append(RunStep(line: 3, tok: 99, wait: 350))

        for (i, seq) in c.seqs.enumerated() {
            let w = i == 0 ? 170 : (i == 1 ? 95 : 55)
            var counts: [String: Int] = [:]
            var total = 0
            for ch in c.targets {
                let n = seq.filter { String($0) == ch }.count
                counts[ch] = n
                total += n
            }
            let ratioValue = Double(total) / Double(seq.count)
            let ratioText = String(ratioValue)

            for t in 0..<prog[4].tokens.count {
                var s = RunStep(line: 4, tok: t, wait: w)
                if t == 0 {
                    s.seqIndex = i
                    s.clearHighlights = true
                    s.caption = "Loop \(i + 1) of \(c.seqs.count): this \(c.itemWord) is \"\(seq)\"."
                }
                steps.append(s)
            }
            for t in 0..<c.printSplit {
                var s = RunStep(line: 5, tok: t, wait: w)
                if t == 0 { s.caption = "\(c.fn) is called with this \(c.itemWord)." }
                steps.append(s)
            }
            for (t, token) in prog[1].tokens.enumerated() {
                var s = RunStep(line: 1, tok: t, wait: w)
                if let letter = token.hl {
                    s.highlight = letter
                    s.caption = "count(\"\(letter)\") finds \(counts[letter] ?? 0)."
                }
                steps.append(s)
            }
            var gcStep = RunStep(line: 1, tok: 99, wait: w * 2 + 150)
            gcStep.caption = "\(c.countVar) = \(total)"
            steps.append(gcStep)
            for t in 0..<prog[2].tokens.count {
                var s = RunStep(line: 2, tok: t, wait: w)
                if t == prog[2].tokens.count - 1 {
                    s.ratio = ratioText
                    s.caption = "return \(total) / \(seq.count) = \(ratioText)"
                }
                steps.append(s)
            }
            for t in c.printSplit..<prog[5].tokens.count {
                var s = RunStep(line: 5, tok: t, wait: w)
                if t == prog[5].tokens.count - 1 {
                    s.output = ratioText
                    s.caption = "print shows \(ratioText)."
                }
                steps.append(s)
            }
            steps.append(RunStep(line: 5, tok: 99, wait: w * 2 + 200))
        }
        steps.append(RunStep(wait: 300, finish: true))
        return steps
    }
}

// MARK: - The screen

struct StageGameView: View {
    let config: StageConfig
    @Binding var progress: Double
    @Binding var bolts: Int
    let onDone: () -> Void

    @StateObject private var model: StageGameModel
    @EnvironmentObject private var store: AppStore

    init(config: StageConfig, progress: Binding<Double>, bolts: Binding<Int>, onDone: @escaping () -> Void) {
        self.config = config
        _progress = progress
        _bolts = bolts
        self.onDone = onDone
        _model = StateObject(wrappedValue: StageGameModel(config: config))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text(config.title)
                        .font(Theme.heading(26))
                        .accessibilityAddTraits(.isHeader)
                    Text("Part \(model.partIndex + 1) of \(config.parts.count) \u{00B7} \(model.part.name)")
                        .font(Theme.body(14, weight: .bold))
                        .foregroundStyle(Theme.muted)
                    segments
                    visualCard
                    Text(model.part.prompt)
                        .font(Theme.body(15, weight: .bold))
                        .fixedSize(horizontal: false, vertical: true)
                    partBody
                }
                .padding(20)
            }
            bottomArea
        }
        .onDisappear { model.cancel() }
        .onChange(of: model.result) { _, result in
            if result == .correct {
                if !model.missed.contains(model.partIndex) { bolts += 5 }
                progress = Double(model.partIndex + 1) / Double(config.parts.count)
            }
        }
    }

    // MARK: Top of the page

    private var segments: some View {
        HStack(spacing: 6) {
            ForEach(0..<config.parts.count, id: \.self) { i in
                let done = i < model.partIndex || (i == model.partIndex && model.result == .correct)
                let current = i == model.partIndex && !done
                Capsule()
                    .fill(done ? Theme.lime : (current ? Theme.card : Theme.locked))
                    .frame(height: 10)
                    .overlay(Capsule().stroke(Theme.navy, lineWidth: 2))
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Part \(model.partIndex + 1) of \(config.parts.count)")
    }

    private var visualCard: some View {
        let letters = Array(model.tilesSequence)
        let lit = model.highlightedLetters
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .bottom, spacing: 3) {
                    ForEach(Array(letters.enumerated()), id: \.offset) { item in
                        tile(String(item.element), on: lit.contains(String(item.element)))
                    }
                }
                .frame(height: 46, alignment: .bottom)
                Text(config.legend)
                    .font(Theme.body(11, weight: .bold))
                    .foregroundStyle(Theme.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(spacing: 0) {
                Text(config.readoutLabel)
                    .font(Theme.body(11, weight: .bold))
                    .foregroundStyle(Theme.muted)
                Text(model.readout)
                    .font(Theme.heading(28))
            }
            .frame(width: 84)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(height: 84)
        .card(radius: 16)
    }

    private func tile(_ letter: String, on: Bool) -> some View {
        Text(letter)
            .font(Theme.code(14))
            .foregroundStyle(Theme.navy)
            .frame(width: 30, height: config.tileHeights[letter] ?? 44)
            .background(RoundedRectangle(cornerRadius: 8).fill(on ? Theme.lime : Theme.card))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.navy, lineWidth: 2))
            .scaleEffect(on ? 1.06 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: on)
    }

    // MARK: The part itself

    @ViewBuilder
    private var partBody: some View {
        switch model.part.kind {
        case .choice: choiceBody
        case .order: orderBody
        case .run: runBody
        }
    }

    private var choiceBody: some View {
        VStack(spacing: 8) {
            CodePanel(lines: model.part.code, input: { size in AnyView(blank(size)) })
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(model.part.options, id: \.id) { option in
                    Button {
                        model.pick(option.id)
                    } label: {
                        Text(option.text)
                            .font(Theme.code(14))
                            .foregroundStyle(Theme.navy)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .padding(.horizontal, 6)
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .card(fill: optionFill(option.id), radius: 14, shadow: true)
                    }
                    .buttonStyle(.plain)
                    .disabled(model.result != .pending)
                }
            }
        }
    }

    private func optionFill(_ id: String) -> Color {
        guard model.picked == id else { return Theme.card }
        return model.result == .correct ? Theme.lime : Color(hex: 0xFFD3B0)
    }

    private func blank(_ size: CGFloat) -> some View {
        let chosen = model.part.options.first { $0.id == model.picked }
        let color: Color = chosen == nil ? Theme.muted : (model.result == .correct ? CodeColors.string : CodeColors.number)
        return Text(chosen?.text ?? "_______")
            .font(Theme.code(size))
            .underline(true, pattern: .dash, color: color)
            .foregroundStyle(color)
    }

    private var trayIDs: [String] {
        model.part.trayOrder.filter { !model.placed.contains($0) }
    }

    private var orderBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            VStack(spacing: 6) {
                ForEach(0..<model.part.pieces.count, id: \.self) { i in
                    slot(i)
                }
            }
            Text("Tap a line to place it. Tap a placed line to take it back.")
                .font(Theme.body(12, weight: .bold))
                .foregroundStyle(Theme.muted)
            VStack(spacing: 6) {
                ForEach(trayIDs, id: \.self) { id in
                    trayPiece(id)
                }
            }
        }
    }

    private func slot(_ i: Int) -> some View {
        let id: String? = i < model.placed.count ? model.placed[i] : nil
        let piece = model.part.pieces.first { $0.id == id }
        let bad = model.result == .wrong && i < model.slotBad.count && model.slotBad[i]
        let fill: Color = piece == nil ? Theme.locked : (model.result == .pending ? Theme.card : (bad ? Theme.missSheet : Theme.successSheet))
        let edge: Color = piece == nil ? Theme.lockedEdge : (bad ? Theme.orange : Theme.navy)
        return Button {
            model.unplace(i)
        } label: {
            Text(piece?.text ?? "\(i + 1)")
                .font(Theme.code(12))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .foregroundStyle(piece == nil ? Theme.muted : Theme.navy)
                .padding(.leading, CGFloat((piece?.indent ?? 0) * 16) + 8)
                .padding(.trailing, 8)
                .frame(maxWidth: .infinity, minHeight: 34, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 10).fill(fill))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(edge, style: StrokeStyle(lineWidth: Theme.border, dash: piece == nil ? [5, 4] : []))
                )
        }
        .buttonStyle(.plain)
        .disabled(piece == nil || model.result != .pending)
        .accessibilityLabel(piece.map { "Line \(i + 1): \($0.text). Tap to take it back." } ?? "Empty line \(i + 1)")
    }

    private func trayPiece(_ id: String) -> some View {
        let piece = model.part.pieces.first { $0.id == id }
        return Button {
            model.place(id)
        } label: {
            Text(piece?.text ?? "")
                .font(Theme.code(12))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .foregroundStyle(Theme.navy)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
                .card(fill: Theme.card, radius: 12, shadow: true)
        }
        .buttonStyle(.plain)
        .disabled(model.result != .pending)
    }

    private var runBody: some View {
        VStack(spacing: 6) {
            CodePanel(
                lines: config.program,
                activeLine: model.runPhase == .running ? model.line : nil,
                activeTok: model.tok
            )
            Text(model.caption)
                .font(Theme.body(13, weight: .bold))
                .foregroundStyle(Theme.muted)
                .frame(maxWidth: .infinity, minHeight: 20, alignment: .leading)
            RunConsole(lines: model.outputs)
        }
    }

    // MARK: Bottom of the page

    @ViewBuilder
    private var bottomArea: some View {
        switch model.result {
        case .correct:
            GameFeedbackSheet(
                correct: true,
                title: model.part.kind == .run ? "Stage complete!" : model.part.okTitle,
                message: model.part.ok,
                buttonTitle: model.isLastPart ? "Continue" : "Next part",
                robotName: store.progress.currentForm.moodImage(.excited)
            ) {
                if model.isLastPart { onDone() } else { model.next() }
            }
        case .wrong:
            GameFeedbackSheet(
                correct: false, title: "Not quite", message: model.wrongMessage,
                buttonTitle: "Try again", robotName: nil
            ) { model.retry() }
        case .pending:
            if model.part.kind == .run {
                Button(model.runPhase == .running ? "Running\u{2026}" : "Run it!") { model.startRun() }
                    .buttonStyle(ChunkyButtonStyle(enabled: model.runPhase == .idle))
                    .disabled(model.runPhase != .idle)
                    .padding(16)
            }
        }
    }
}
