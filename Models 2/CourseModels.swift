import Foundation

// These types describe the lessons. They match the lessons.json file,
// so the app can read that file directly.

struct Course: Codable {
    var phases: [Phase]
}

struct Phase: Codable, Identifiable {
    let id: String
    let number: Int
    let title: String
    let subtitle: String?
    /// The robot form the learner earns by finishing this phase, if any.
    let unlocksForm: RobotForm?
    let lessons: [Lesson]
}

struct Lesson: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let questions: [Question]
   /// Set for game lessons (see GameCatalog). Normal lessons leave it empty.
    var game: String? = nil
}

enum QuestionKind: String, Codable {
    /// Tap one bubble: pick the missing word, complete with a picture, predict the output.
    case choice
    /// Tap pieces in order to build a line of code.
    case build
    /// Two big buttons, True or False, about a piece of code.
    case judge
    /// Tap the one line of code that has a mistake.
    case bug
    /// Pair each item on the left with its partner on the right.
    case match
}

struct Question: Codable, Identifiable, Hashable {
    let id: String
    let kind: QuestionKind
    let prompt: String
    /// A short tip shown above the question.
    let hint: String?
    /// Code shown to the learner. "___" marks the blank to fill.
    let code: String?
    /// An emoji shown as the picture, for example "🪴".
    let picture: String?
    /// Choice: the bubbles to pick from. Build: the pieces, including spare ones.
    /// Judge: True and False. Bug: the lines of code, in order.
    /// Match: the items in the left column, in order.
    let options: [String]
    /// Choice, judge, bug: one item, the right one. Build: the pieces in the right order.
    /// Match: the right-hand partner of each left item, in the same order as options.
    let answer: [String]
    /// Match only: the right-hand column as the learner sees it (shuffled).
    let right: [String]?
    let explanation: String
}

enum RobotForm: String, Codable, CaseIterable, Identifiable {
    case blob, builder, rover, gardener, orb, cat

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .blob: return "Blob"
        case .builder: return "Builder Bot"
        case .rover: return "Rover"
        case .gardener: return "Gardener"
        case .orb: return "Orb"
        case .cat: return "Cat Bot"
        }
    }

    /// The picture file for this form inside the app.
    var imageName: String { rawValue }

    /// Only the blob and Builder Bot can be earned in version 1.
    var isInVersionOne: Bool { self == .blob || self == .builder }
}
