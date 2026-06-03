/// ProfileLabels — display labels for the enum-string fields the profile
/// surfaces (entity type, contact preference, builder work categories,
/// AU state). Mirrors the canonical values the onboarding flows write.

import Foundation

enum ProfileLabels {
    static func entityType(_ v: String?) -> String? {
        switch v {
        case "homeowner":       return "Homeowner"
        case "owner_builder":   return "Owner-builder"
        case "developer":       return "Developer"
        case "investor":        return "Investor"
        case "architect":       return "Architect"
        case "drafter":         return "Drafter"
        case "project_manager": return "Project manager"
        case "other":           return "Other"
        default:                return v
        }
    }

    static func contactPref(_ v: String?) -> String {
        switch v {
        case "phone": return "Phone"
        case "both":  return "Email & phone"
        default:      return "Email"
        }
    }

    static func category(_ v: String) -> String {
        switch v {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return v.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static let auStates = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
}
