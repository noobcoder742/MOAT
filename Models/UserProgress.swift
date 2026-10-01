import Foundation

/// Everything the app remembers about the learner. Saved on the phone.
struct UserProgress: Codable, Equatable {
    var hasOnboarded = false
    var age = 18
    var education = "Secondary school"
    var studyArea = "Health Sciences"
    var language = "Python"

    var completedLessons: [String] = []
    var bolts = 0

    var streak = 0
    var lastActiveDay: String?

    var todayKey: String?
    var todayLessons = 0
    var dailyGoalLessons = 3

    var unlockedForms: [RobotForm] = [.blob]
    var currentForm: RobotForm = .blob

    init() {}

    // Reading saved data field by field means that adding a new field in a
    // later version will not wipe the learner's progress.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let base = UserProgress()
        hasOnboarded = try c.decodeIfPresent(Bool.self, forKey: .hasOnboarded) ?? base.hasOnboarded
        age = try c.decodeIfPresent(Int.self, forKey: .age) ?? base.age
        education = try c.decodeIfPresent(String.self, forKey: .education) ?? base.education
        studyArea = try StudyAreas.canonical(c.decodeIfPresent(String.self, forKey: .studyArea) ?? base.studyArea)
        language = try c.decodeIfPresent(String.self, forKey: .language) ?? base.language
        completedLessons = try c.decodeIfPresent([String].self, forKey: .completedLessons) ?? base.completedLessons
        bolts = try c.decodeIfPresent(Int.self, forKey: .bolts) ?? base.bolts
        streak = try c.decodeIfPresent(Int.self, forKey: .streak) ?? base.streak
        lastActiveDay = try c.decodeIfPresent(String.self, forKey: .lastActiveDay)
        todayKey = try c.decodeIfPresent(String.self, forKey: .todayKey)
        todayLessons = try c.decodeIfPresent(Int.self, forKey: .todayLessons) ?? base.todayLessons
        dailyGoalLessons = try c.decodeIfPresent(Int.self, forKey: .dailyGoalLessons) ?? base.dailyGoalLessons
        unlockedForms = try c.decodeIfPresent([RobotForm].self, forKey: .unlockedForms) ?? base.unlockedForms
        currentForm = try c.decodeIfPresent(RobotForm.self, forKey: .currentForm) ?? base.currentForm
    }
}

/// Saves and loads progress on the phone.
enum ProgressStorage {
    private static let key = "moat.progress.v1"

    static func load() -> UserProgress {
        guard let data = UserDefaults.standard.data(forKey: key),
              let progress = try? JSONDecoder().decode(UserProgress.self, from: data) else {
            return UserProgress()
        }
        return progress
    }

    static func save(_ progress: UserProgress) {
        guard let data = try? JSONEncoder().encode(progress) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}

/// Turns dates into day labels like "2026-09-21" for streaks and daily goals.
enum DayKey {
    private static func label(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func today() -> String {
        label(for: Date())
    }

    static func yesterday() -> String {
        let date = Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date()
        return label(for: date)
    }
}
