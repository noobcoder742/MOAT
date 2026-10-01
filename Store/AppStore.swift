import SwiftUI
import RevenueCat
import Combine

/// The app's memory while it runs. Screens read from it and ask it to change things.
@MainActor
final class AppStore: ObservableObject {
    /// Which tab is showing: 0 Learn, 1 Workshop, 2 Profile.
    @Published var selectedTab = 0
    @Published var showPaywall = false
    @Published var paywallTier: PaywallTier = .premium
    @Published var isPremium = false
    @Published var currentOffering: Offering?
    @Published private(set) var course: Course
    @Published var progress: UserProgress {
        didSet { ProgressStorage.save(progress) }
    }

    init() {
        // Load the saved answers first, so the lessons match the learner's study area
        // every time the app opens, not only right after onboarding.
        let saved = ProgressStorage.load()
        progress = saved
        course = ContentLoader.loadBundled(studyArea: saved.studyArea, language: saved.language)
    }

    // MARK: Lessons

    /// Every lesson, in order, across all phases.
    var orderedLessons: [Lesson] {
        course.phases.flatMap { $0.lessons }
    }

    func isCompleted(_ lesson: Lesson) -> Bool {
        progress.completedLessons.contains(lesson.id)
    }

    /// A lesson opens once every lesson before it is done.
    func isUnlocked(_ lesson: Lesson) -> Bool {
        guard let index = orderedLessons.firstIndex(where: { $0.id == lesson.id }) else { return false }
        return orderedLessons.prefix(index).allSatisfy { isCompleted($0) }
    }

    /// The next lesson to play, or nil when everything is done.
    var currentLesson: Lesson? {
        orderedLessons.first { !isCompleted($0) }
    }

    /// A phase has started once its first lesson is open.
    func isPhaseStarted(_ phase: Phase) -> Bool {
        guard let first = phase.lessons.first else { return false }
        return isUnlocked(first)
    }

    func completedCount(in phase: Phase) -> Int {
        phase.lessons.filter { isCompleted($0) }.count
    }

    // MARK: Streak and daily goal

    /// The streak only counts if the learner practised today or yesterday.
    var displayStreak: Int {
        let last = progress.lastActiveDay
        return (last == DayKey.today() || last == DayKey.yesterday()) ? progress.streak : 0
    }

    var lessonsToday: Int {
        progress.todayKey == DayKey.today() ? progress.todayLessons : 0
    }

    // MARK: Actions

    func finishOnboarding(age: Int, education: String, studyArea: String, language: String = "Python") {
        var updated = progress
        updated.age = age
        updated.education = education
        updated.studyArea = studyArea
        updated.language = language
        updated.hasOnboarded = true
        // Younger learners start with a lighter daily goal.
        updated.dailyGoalLessons = age < 13 ? 2 : 3
        progress = updated

        // Swap in the lessons for the chosen study area. Lesson ids are the same in every
        // study area (same coding idea, different story), so finished lessons stay finished.
        course = ContentLoader.loadBundled(studyArea: studyArea, language: language)
    }

    /// Records a finished lesson. Returns a new robot form if the learner just evolved.
    @discardableResult
    func completeLesson(_ lesson: Lesson, boltsEarned: Int) -> RobotForm? {
        var updated = progress
        let today = DayKey.today()

        if updated.lastActiveDay != today {
            updated.streak = (updated.lastActiveDay == DayKey.yesterday()) ? updated.streak + 1 : 1
            updated.lastActiveDay = today
        }
        if updated.todayKey != today {
            updated.todayKey = today
            updated.todayLessons = 0
        }
        updated.todayLessons += 1
        updated.bolts += boltsEarned

        var newForm: RobotForm?
        if !updated.completedLessons.contains(lesson.id) {
            updated.completedLessons.append(lesson.id)
            for phase in course.phases where phase.lessons.contains(where: { $0.id == lesson.id }) {
                let phaseDone = phase.lessons.allSatisfy { updated.completedLessons.contains($0.id) }
                if phaseDone, let form = phase.unlocksForm, !updated.unlockedForms.contains(form) {
                    updated.unlockedForms.append(form)
                    updated.currentForm = form
                    newForm = form
                }
            }
        }
        progress = updated
        return newForm
    }

    func equip(_ form: RobotForm) {
        guard progress.unlockedForms.contains(form) else { return }
        progress.currentForm = form
    }

    func editAnswers() {
        progress.hasOnboarded = false
    }

    func resetProgress() {
        progress = UserProgress()
        course = ContentLoader.loadBundled(studyArea: progress.studyArea, language: progress.language)
    }

    /// Optionally swaps in lessons from the backend. Keeps the built-in ones if that fails.
    func refreshLessonsFromBackend() async {
        guard AppConfig.useBackendLessons, progress.language == "Python" else { return }
        if let remote = await APIClient.fetchCourse(studyArea: progress.studyArea), !remote.phases.isEmpty {
            course = remote
        }
    }
}
