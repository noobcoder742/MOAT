import Foundation

/// The expressions every robot form has. Each form has one picture per mood,
/// named like "blob_excited" inside Resources/Images.
enum RobotMood: String {
    case neutral, excited, surprised, wink, closed, hearts, confused
}

extension RobotForm {
    /// The picture file for this form with a given expression, for example "blob_excited".
    func moodImage(_ mood: RobotMood) -> String {
        "\(rawValue)_\(mood.rawValue)"
    }
}
