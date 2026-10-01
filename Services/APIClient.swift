import Foundation

/// Settings you may want to change.
enum AppConfig {
    /// Where the MOAT backend runs. "localhost" works in the Xcode simulator
    /// while server.py is running on the same Mac.
    static let backendURL = URL(string: "http://localhost:8000")!

    /// When true, the app tries to download lessons from the backend first.
    /// When false (the default), it always uses the lessons built into the app.
    static let useBackendLessons = false

    /// When true, wrong answers show an "Explain more" button that asks the backend.
    static let useAIExplanations = true
}

struct ExplainRequest: Codable {
    let questionPrompt: String
    let code: String
    let learnerAnswer: String
    let correctAnswer: String
    let age: Int
    let studyArea: String
}

private struct ExplainResponse: Codable {
    let explanation: String
}

/// Talks to the MOAT backend. The app always works without it.
enum APIClient {
    static func fetchCourse(studyArea: String = "Health Sciences") async -> Course? {
        let url = AppConfig.backendURL.appendingPathComponent("lessons")
        // Add studyArea as query parameter
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "area", value: studyArea)]
        guard let finalURL = components?.url else { return nil }
        
        var request = URLRequest(url: finalURL)
        request.timeoutInterval = 8
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            return try JSONDecoder().decode(Course.self, from: data)
        } catch {
            return nil
        }
    }

    static func explain(_ body: ExplainRequest) async throws -> String {
        var request = URLRequest(url: AppConfig.backendURL.appendingPathComponent("explain"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(ExplainResponse.self, from: data).explanation
    }
}

/// Reads the lessons built into the app.
enum ContentLoader {
    /// The study areas on the onboarding page, mapped to their lesson files:
    /// "Physics & maths" becomes "lessons_physics_and_maths".
    static func fileName(for studyArea: String) -> String {
        let cleaned = StudyAreas.canonical(studyArea).lowercased()
            .replacingOccurrences(of: "&", with: "and")
            .replacingOccurrences(of: " ", with: "_")
        // The Health sciences lessons are still stored in the life sciences file.
            let key = cleaned == "health_sciences" ? "life_sciences" : cleaned
            return "lessons_\(key)"
    }

    /// Languages other than Python have their own lesson files.
    static func languageFileName(for language: String) -> String? {
        switch language {
        case "R": return "lessons_r"
        case "SQL": return "lessons_sql"
        case "JavaScript": return "lessons_javascript"
        case "MATLAB": return "lessons_matlab"
        case "Java": return "lessons_java"
        default: return nil
        }
    }

    static func loadBundled(studyArea: String = "Health Sciences", language: String = "Python") -> Course {
        // These lessons ignore the study area and have no mini-games (the games are written in Python).
        if let file = languageFileName(for: language), let course = load(file) {
            return course
        }
        let name = fileName(for: studyArea)
        if let course = load(name) {
            return GameCatalog.addingGames(to: course, studyArea: studyArea)
        }
        #if DEBUG
        print("MOAT warning: \(name).json is missing from the app, so the default lessons are being used. " +
              "In Xcode, click the file, then tick MOAT under Target Membership.")
        #endif
        return load("lessons") ?? Course(phases: [])
    }

    private static func load(_ name: String) -> Course? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(Course.self, from: data)
        } catch {
            #if DEBUG
            print("MOAT warning: \(name).json could not be read: \(error)")
            #endif
            return nil
        }
    }
}
