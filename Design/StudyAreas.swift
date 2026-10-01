import Foundation

enum StudyAreas {
    /// Turns a study area saved by an older version into today's name.
    /// "Life sciences" is now "Health sciences", and "Computing" is no longer offered.
    static func canonical(_ name: String) -> String {
        switch name {
        case "Life sciences": return "Health sciences"
        case "Computing": return "General"
        default: return name
        }
    }
}
