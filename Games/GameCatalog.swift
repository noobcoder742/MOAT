import Foundation

/// Adds the mini-games to the lesson path for the study areas that have them.
/// The lesson files themselves are not changed.
///   - Level 10 loop game: one extra lesson in Phase 2, after "Watch it grow" (the 2nd lesson).
///   - Level 40 stage: one extra Phase 4 at the end with a single stage lesson.
enum GameCatalog {
    private enum Field { case health, engineering, business }

    private static func fieldFor(_ studyArea: String) -> Field? {
        switch StudyAreas.canonical(studyArea) {
        case "Health sciences": return .health
        case "Engineering": return .engineering
        case "Business": return .business
        default: return nil
        }
    }

    static func addingGames(to course: Course, studyArea: String) -> Course {
        guard let field = fieldFor(studyArea) else { return course }
        var result = course

        let loopTitle: String
        let loopGame: String
        let stageTitle: String
        let stageGame: String
        switch field {
        case .health:
            loopTitle = "Water the plant"; loopGame = "loop_plant"
            stageTitle = "GC content lab"; stageGame = "stage_gc"
        case .engineering:
            loopTitle = "Spin the wheel"; loopGame = "loop_wheel"
            stageTitle = "Duty cycle lab"; stageGame = "stage_duty"
        case .business:
            loopTitle = "Invest each cycle"; loopGame = "loop_fund"
            stageTitle = "Conversion lab"; stageGame = "stage_conversion"
        }

        // Loop game: inside Phase 2, after the second lesson.
        if let index = result.phases.firstIndex(where: { $0.number == 2 }) {
            let phase = result.phases[index]
            var lessons = phase.lessons
            let game = Lesson(id: "p2g1", title: loopTitle, questions: [], game: loopGame)
            lessons.insert(game, at: min(2, lessons.count))
            result.phases[index] = Phase(
                id: phase.id, number: phase.number, title: phase.title, subtitle: phase.subtitle,
                unlocksForm: phase.unlocksForm, lessons: lessons
            )
        }

        // Stage: a new phase at the end.
        let stage = Lesson(id: "p4g1", title: stageTitle, questions: [], game: stageGame)
        let stageNumber = result.phases.count + 1
        result.phases.append(Phase(
            id: "p4", number: stageNumber, title: "Stage: " + stageTitle, subtitle: nil,
            unlocksForm: nil, lessons: [stage]
        ))
        return result
    }
}
