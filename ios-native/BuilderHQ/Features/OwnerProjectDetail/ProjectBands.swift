/// ProjectBands — the banded option lists + labels for project specs.
/// Mirrors the canonical enum values the publish flow + DB use, so the
/// owner edit form and the owner detail screen read/write them
/// consistently.

import Foundation

enum ProjectBands {
    typealias Option = (value: String, label: String)

    static let land: [Option] = [
        ("under_200", "Under 200 m²"), ("200_400", "200–400 m²"),
        ("400_600", "400–600 m²"), ("600_800", "600–800 m²"),
        ("800_1000", "800–1,000 m²"), ("over_1000", "Over 1,000 m²"),
    ]
    static let build: [Option] = [
        ("under_100", "Under 100 m²"), ("100_150", "100–150 m²"),
        ("150_200", "150–200 m²"), ("200_250", "200–250 m²"),
        ("250_300", "250–300 m²"), ("300_400", "300–400 m²"),
        ("over_400", "Over 400 m²"),
    ]
    static let budget: [Option] = [
        ("under_500k", "Under $500k"), ("500k_1m", "$500k – $1M"),
        ("1m_1_5m", "$1M – $1.5M"), ("1_5m_2m", "$1.5M – $2M"),
        ("2m_3m", "$2M – $3M"), ("3m_5m", "$3M – $5M"), ("over_5m", "Over $5M"),
    ]
    static let extensionType: [Option] = [
        ("ground_floor", "Ground floor"), ("first_floor", "First floor"),
        ("ground_and_first", "Ground & first"), ("rear", "Rear"), ("side", "Side"),
    ]
    static let extensionSize: [Option] = [
        ("under_20", "Under 20 m²"), ("20_40", "20–40 m²"), ("40_60", "40–60 m²"),
        ("60_80", "60–80 m²"), ("80_100", "80–100 m²"), ("over_100", "Over 100 m²"),
    ]
    static let renovationScope: [Option] = [
        ("kitchen", "Kitchen"), ("bathroom", "Bathroom"),
        ("kitchen_and_bathroom", "Kitchen & bathroom"),
        ("full_internal", "Full internal"),
        ("full_internal_and_external", "Full internal + external"),
        ("structural", "Structural"),
    ]
    static let existingAge: [Option] = [
        ("under_10", "Under 10 yrs"), ("10_25", "10–25 yrs"), ("25_50", "25–50 yrs"),
        ("50_75", "50–75 yrs"), ("over_75", "Over 75 yrs"),
    ]

    static func label(_ value: String?, in options: [Option]) -> String {
        guard let value else { return "Not set" }
        return options.first { $0.value == value }?.label ?? value
    }

    static func typeLabel(_ type: String) -> String {
        switch type {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return type.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static func monthLabel(_ ym: String?) -> String {
        guard let ym else { return "Not set" }
        let parts = ym.split(separator: "-")
        guard parts.count == 2, let m = Int(parts[1]), (1...12).contains(m) else { return ym }
        let names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return "\(names[m]) \(parts[0])"
    }
}
