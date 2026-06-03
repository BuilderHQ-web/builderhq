/// BandScale — turns the project's banded specs into the numbers the
/// comparison's money insights need:
///   · buildSizeBand → a representative m² midpoint (for $/m²)
///   · budgetBand     → a (low, high) AUD range (for price-vs-budget)
///
/// Bands are deliberately coarse on the form (a couple of taps), so
/// everything derived from them is an approximation — the UI labels it
/// "~$/m²" and treats the band's upper bound as the budget ceiling.

import Foundation

enum BandScale {
    /// Representative floor area (m²) for a build-size band. nil for an
    /// unknown band → callers hide $/m² rather than guess.
    static func buildSizeMidpoint(_ band: String?) -> Double? {
        switch band {
        case "under_100": return 80
        case "100_150":   return 125
        case "150_200":   return 175
        case "200_250":   return 225
        case "250_300":   return 275
        case "300_400":   return 350
        case "over_400":  return 450
        default:          return nil
        }
    }

    /// (low, high) budget range in AUD. `high` is nil for the open-ended
    /// top band. nil result for an unknown band.
    static func budgetRange(_ band: String?) -> (low: Int, high: Int?)? {
        switch band {
        case "under_500k": return (0, 500_000)
        case "500k_1m":    return (500_000, 1_000_000)
        case "1m_1_5m":    return (1_000_000, 1_500_000)
        case "1_5m_2m":    return (1_500_000, 2_000_000)
        case "2m_3m":      return (2_000_000, 3_000_000)
        case "3m_5m":      return (3_000_000, 5_000_000)
        case "over_5m":    return (5_000_000, nil)
        default:           return nil
        }
    }

    /// A short human label for a budget band (e.g. "under $500k").
    static func budgetLabel(_ band: String?) -> String? {
        switch band {
        case "under_500k": return "under $500k"
        case "500k_1m":    return "$500k–$1m"
        case "1m_1_5m":    return "$1m–$1.5m"
        case "1_5m_2m":    return "$1.5m–$2m"
        case "2m_3m":      return "$2m–$3m"
        case "3m_5m":      return "$3m–$5m"
        case "over_5m":    return "over $5m"
        default:           return nil
        }
    }
}
