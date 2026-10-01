import SwiftUI
import UIKit
import CoreText

// MARK: - Colours
// These match the colours on the design canvas.

extension Color {
    /// Makes a colour from a hex number, for example Color(hex: 0x1B2472).
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

enum Theme {
    static let cream = Color(hex: 0xFBF4E4)        // main off-white background
    static let card = Color(hex: 0xFFFDF6)         // cards and chips
    static let navy = Color(hex: 0x1B2472)         // text and outlines
    static let muted = Color(hex: 0x4A527F)        // secondary text
    static let lime = Color(hex: 0xB5E04A)         // done, correct, main buttons
    static let sky = Color(hex: 0x59B4FF)          // current lesson, bolts
    static let orange = Color(hex: 0xFF8A3D)       // streak, "not quite"
    static let logo = Color(hex: 0x015E78)         // MOAT wordmark
    static let locked = Color(hex: 0xE3DCCB)       // locked nodes, disabled buttons
    static let lockedText = Color(hex: 0x5C5648)
    static let lockedEdge = Color(hex: 0xC4BBA5)
    static let successSheet = Color(hex: 0xE4F5B8)
    static let missSheet = Color(hex: 0xFFE3CF)
    static let hintBlue = Color(hex: 0xDCEEFF)
    static let premiumBand = Color(hex: 0x2E3A9E)
    static let premiumText = Color(hex: 0xB8C4FF)

    static let border: CGFloat = 2.5

    // MARK: Fonts
    // Headings use the rounded system font as a stand-in for Baloo 2.
    static func heading(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy, design: .rounded) }
    static func body(_ size: CGFloat, weight: Font.Weight = .regular) -> Font { .system(size: size, weight: weight) }
    static func code(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .monospaced) }
    /// The MOAT wordmark font. Falls back to the system font if Horizon is missing.
    static func wordmark(_ size: CGFloat) -> Font { .custom("Horizon-Bold", size: size) }
}

// MARK: - Loading the Horizon font

enum FontLoader {
    /// Registers fonts that are inside the app, so no Info.plist setting is needed.
    static func registerFonts() {
        let files = ["Horizon"]
        for name in files {
            guard let url = Bundle.main.url(forResource: name, withExtension: "otf") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}

// MARK: - Chunky button (the thick-outline button used across the app)

struct ChunkyButtonStyle: ButtonStyle {
    var fill: Color = Theme.lime
    var enabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed && enabled
        let edge = enabled ? Theme.navy : Theme.lockedEdge
        return configuration.label
            .font(Theme.heading(20))
            .foregroundStyle(enabled ? Theme.navy : Theme.lockedText)
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(RoundedRectangle(cornerRadius: 18).fill(enabled ? fill : Theme.locked))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(edge, lineWidth: Theme.border))
            .background(RoundedRectangle(cornerRadius: 18).fill(edge).offset(y: pressed ? 0 : 4))
            .offset(y: pressed ? 4 : 0)
            .animation(.easeOut(duration: 0.08), value: pressed)
    }
}

// MARK: - Card look (fill, navy outline, optional hard shadow)

struct CardStyle: ViewModifier {
    var fill: Color
    var radius: CGFloat
    var shadow: Bool

    func body(content: Content) -> some View {
        content
            .background(RoundedRectangle(cornerRadius: radius).fill(fill))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Theme.navy, lineWidth: Theme.border))
            .background(
                RoundedRectangle(cornerRadius: radius)
                    .fill(Theme.navy)
                    .offset(y: shadow ? 3 : 0)
            )
    }
}

extension View {
    func card(fill: Color = Theme.card, radius: CGFloat = 16, shadow: Bool = false) -> some View {
        modifier(CardStyle(fill: fill, radius: radius, shadow: shadow))
    }
}

// MARK: - Images stored inside the app

/// Shows an image file from the app, such as "blob" or "world_backdrop.jpg".
struct BundleImage: View {
    let name: String
    var mode: ContentMode = .fit

    var body: some View {
        if let image = UIImage(named: name) {
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: mode)
        } else {
            Color.clear
        }
    }
}

/// A picture that fills the whole screen behind other content without pushing it around.
struct FullScreenPicture: View {
    let name: String

    var body: some View {
        Color.clear
            .overlay { BundleImage(name: name, mode: .fill) }
            .clipped()
            .contentShape(Rectangle())
            .allowsHitTesting(false)   // a picture behind the screen never blocks scrolling 
            .ignoresSafeArea()
            .accessibilityHidden(true)
    }
}

// MARK: - Wrapping row of chips (answer bubbles)

/// Lays chips out in rows, wrapping to the next row when there is no room, centred.
struct FlowLayout: Layout {
    var spacing: CGFloat = 10

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var widest: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            widest = max(widest, x - spacing)
        }
        return CGSize(width: maxWidth.isFinite ? maxWidth : widest, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var rows: [[(index: Int, size: CGSize)]] = [[]]
        var x: CGFloat = 0
        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > bounds.width {
                rows.append([])
                x = 0
            }
            rows[rows.count - 1].append((index: index, size: size))
            x += size.width + spacing
        }
        var y = bounds.minY
        for row in rows where !row.isEmpty {
            let rowWidth = row.reduce(0) { $0 + $1.size.width } + spacing * CGFloat(row.count - 1)
            let rowHeight = row.map { $0.size.height }.max() ?? 0
            var cursor = bounds.minX + max(0, (bounds.width - rowWidth) / 2)
            for item in row {
                subviews[item.index].place(
                    at: CGPoint(x: cursor, y: y),
                    anchor: .topLeading,
                    proposal: ProposedViewSize(item.size)
                )
                cursor += item.size.width + spacing
            }
            y += rowHeight + spacing
        }
    }
}

// MARK: - Answer chip

struct TokenChip: View {
    enum Look { case normal, selected, correct, wrong, used }

    let text: String
    var look: Look = .normal

    private var fill: Color {
        switch look {
        case .normal, .used: return Theme.card
        case .selected: return Theme.hintBlue
        case .correct: return Theme.lime
        case .wrong: return Color(hex: 0xFFD3B0)
        }
    }

    var body: some View {
        Text(text)
            .font(Theme.code(17))
            .foregroundStyle(Theme.navy)
            .padding(.horizontal, 16)
            .frame(minHeight: 48)
            .card(fill: fill, radius: 14, shadow: look != .used)
            .opacity(look == .used ? 0.3 : 1)
    }
}

// MARK: - Code box

struct CodeBlock: View {
    let code: String

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            Text(code)
                .font(Theme.code(17))
                .foregroundStyle(Theme.navy)
                .lineSpacing(6)
                .fixedSize()
                .padding(16)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(radius: 16)
        .accessibilityLabel("Code: \(code)")
    }
}

// MARK: - Joining code pieces into readable code

enum CodeJoin {
    /// Joins pieces like ["print", "(", "\"Hi\"", ")"] into print("Hi").
    static func join(_ pieces: [String]) -> String {
        var result = ""
        for piece in pieces {
            let noSpaceBefore = [")", ":", ",", "(", ";"].contains(piece)
            let afterOpenBracket = result.hasSuffix("(")
            if result.isEmpty || noSpaceBefore || afterOpenBracket {
                result += piece
            } else {
                result += " " + piece
            }
        }
        return result
    }
}
