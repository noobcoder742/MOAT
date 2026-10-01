import SwiftUI
import UIKit
import Combine

// Shared pieces for the mini-games: code tokens, the karaoke code panel,
// the step timer and the feedback sheet.

/// Closes the number pad, so it never covers the result sheet.
func dismissKeyboard() {
    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
}

// MARK: - Code tokens

enum TokKind { case plain, keyword, number, string, input }

struct CodeToken {
    var text: String
    var pre: String = " "          // spaces shown before the token
    var kind: TokKind = .plain
    var hl: String? = nil          // letters to light up when this token runs (stage games)
}

/// Short way to write a token: tk("for", "", .keyword)
func tk(_ text: String, _ pre: String = " ", _ kind: TokKind = .plain, hl: String? = nil) -> CodeToken {
    CodeToken(text: text, pre: pre, kind: kind, hl: hl)
}

struct CodeLine {
    var indent: Int
    var tokens: [CodeToken]
    var length: Int { tokens.reduce(0) { $0 + $1.pre.count + $1.text.count } }
}

enum CodeColors {
    static let keyword = Color(hex: 0x3B4BD8)
    static let number = Color(hex: 0xB5471B)
    static let string = Color(hex: 0x1F7A4D)

    static func color(_ kind: TokKind) -> Color {
        switch kind {
        case .keyword: return keyword
        case .number, .input: return number
        case .string: return string
        case .plain: return Theme.navy
        }
    }
}

// MARK: - One line of code, read word by word

/// `active` is the word being read. 99 means the whole line is done. nil means not running.
struct KaraokeLine: View {
    let line: CodeLine
    var fontSize: CGFloat = 14
    var active: Int? = nil
    var rowHighlight = false
    var dimmed = false
    var input: ((CGFloat) -> AnyView)? = nil

    private func tokenFill(_ index: Int) -> Color {
        guard let active else { return .clear }
        if index == active { return Theme.lime }
        if index < active { return Theme.successSheet }
        return .clear
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(line.tokens.enumerated()), id: \.offset) { item in
                Text(item.element.pre).font(Theme.code(fontSize))
                if item.element.kind == .input, let input {
                    input(fontSize)
                } else {
                    Text(item.element.text)
                        .font(Theme.code(fontSize))
                        .foregroundStyle(item.offset == active ? Theme.navy : CodeColors.color(item.element.kind))
                        .padding(.horizontal, 1)
                        .background(RoundedRectangle(cornerRadius: 4).fill(tokenFill(item.offset)))
                }
            }
        }
        .fixedSize()
        .padding(.leading, CGFloat(line.indent) * 14 + 4)
        .frame(maxWidth: .infinity, minHeight: 26, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 8).fill(rowHighlight ? Color(hex: 0xF3EBD3) : Color.clear))
        .opacity(dimmed ? 0.35 : 1)
        .animation(.easeOut(duration: 0.1), value: active)
    }
}

/// A card with several lines of code. The text size shrinks so the longest line fits.
struct CodePanel: View {
    let lines: [CodeLine]
    var activeLine: Int? = nil
    var activeTok: Int = -1
    var dimmed: (Int) -> Bool = { _ in false }
    var input: ((CGFloat) -> AnyView)? = nil

    private func fontSize(width: CGFloat) -> CGFloat {
        var size: CGFloat = 15
        for line in lines {
            let room = width - 16 - 4 - CGFloat(line.indent) * 14 - CGFloat(line.tokens.count) * 2
            let chars = CGFloat(max(line.length, 1))
            size = min(size, room / (chars * 0.62))
        }
        return max(9.5, size)
    }

    var body: some View {
        GeometryReader { geo in
            let size = fontSize(width: geo.size.width)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(lines.enumerated()), id: \.offset) { item in
                    KaraokeLine(
                        line: item.element,
                        fontSize: size,
                        active: activeLine == item.offset ? activeTok : nil,
                        rowHighlight: activeLine == item.offset,
                        dimmed: dimmed(item.offset),
                        input: input
                    )
                }
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 8)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        }
        .frame(height: CGFloat(lines.count) * 26 + 20)
        .card(radius: 16)
    }
}

/// The dark box where print() output appears.
struct RunConsole: View {
    let lines: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if lines.isEmpty {
                Text("> output shows here").opacity(0.55)
            } else {
                ForEach(Array(lines.enumerated()), id: \.offset) { item in
                    Text("> " + item.element)
                }
            }
        }
        .font(Theme.code(14))
        .foregroundStyle(Theme.lime)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: 74, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: 12).fill(Theme.navy))
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Playing a list of timed steps

struct RunStep {
    var line: Int? = nil
    var tok: Int = 0
    var wait: Int = 150               // milliseconds to wait after this step
    var caption: String? = nil
    var iter: Int? = nil              // loop games: which round this step belongs to
    var grow = false                  // loop games: the variable grows by one step
    var seqIndex: Int? = nil          // stage run: which strand is showing
    var clearHighlights = false
    var highlight: String? = nil
    var ratio: String? = nil
    var output: String? = nil
    var finish = false
}

@MainActor
final class StepPlayer {
    private var task: Task<Void, Never>?

    func play(_ steps: [RunStep], apply: @escaping (RunStep) -> Void) {
        task?.cancel()
        task = Task { @MainActor in
            for step in steps {
                if Task.isCancelled { return }
                apply(step)
                if step.finish { return }
                try? await Task.sleep(nanoseconds: UInt64(step.wait) * 1_000_000)
            }
        }
    }

    func cancel() {
        task?.cancel()
        task = nil
    }
}

// MARK: - Feedback sheet (same look as the lesson player)

struct GameFeedbackSheet: View {
    let correct: Bool
    let title: String
    let message: String
    let buttonTitle: String
    let robotName: String?
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(title)
                        .font(Theme.heading(26))
                    Text(message)
                        .font(Theme.body(16))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                if let robotName {
                    BundleImage(name: robotName)
                        .frame(width: 72, height: 84)
                        .accessibilityHidden(true)
                }
            }
            Button(buttonTitle, action: action)
                .buttonStyle(ChunkyButtonStyle(fill: correct ? Theme.lime : Theme.orange))
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(correct ? Theme.successSheet : Theme.missSheet)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.navy).frame(height: Theme.border)
        }
    }
}

// MARK: - Fixed-size artwork that shrinks to fit narrow phones

struct FittedArt<Content: View>: View {
    var width: CGFloat = 345
    var height: CGFloat = 199
    @ViewBuilder var content: () -> Content

    var body: some View {
        GeometryReader { geo in
            content()
                .frame(width: width, height: height)
                .scaleEffect(min(1, geo.size.width / width))
                .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}
