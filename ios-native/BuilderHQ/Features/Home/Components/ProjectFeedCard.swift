/// ProjectFeedCard — a single suggested project in the home feed.
///
/// Mobile-optimised card that lays out:
///
///   · A coloured gradient cover with the project-type chip + freshness
///     dot ("3d ago") + unlock-count pill ("1 of 3 unlocked")
///   · Below the cover: title (serif-italic accent on the project-type
///     word), then a row of fact chips (location, budget, beds, baths)
///   · A bottom row with the unlock CTA (price OR "Free with FBA") and
///     a "View" arrow
///
/// Pure presentation — the card itself doesn't capture taps. The
/// caller wraps it in a `NavigationLink(value: project.slug)` and
/// applies `PressButtonStyle()` for the haptic + scale feedback. This
/// keeps the gesture single-owned (no inner `.onTapGesture` to fight
/// the link's Button), so navigation always fires.
///
/// `fbaActive` controls whether the unlock CTA shows the dollar price
/// or "Free with founding access" so the user knows the click is
/// already covered by their credit.

import SwiftUI

struct ProjectFeedCard: View {
    let project: DashboardAPI.ProjectRow
    /// Unlock price for this project's type (cents → AUD whole dollars).
    /// Caller computes from a pricing table since the server returns
    /// the type but not the dollar price directly.
    let unlockPriceAud: Int
    let fbaActive: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            coverBlock
            detailsBlock
        }
        .cardSurface(.lifted, radius: 22)
    }

    // MARK: - Cover

    private var coverBlock: some View {
        ZStack(alignment: .topLeading) {
            ProjectCoverArt(type: project.type)

            VStack {
                HStack {
                    typeChip
                    Spacer()
                    unlockedPill
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)

                Spacer()

                HStack {
                    Spacer()
                    freshnessTag
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 14)
            }
        }
        .frame(height: 132)
        // CardSurface's outer clipShape (radius 22) handles the
        // corner masking, so the cover doesn't need its own clip.
        // We let the cover gradient bleed all the way to the
        // CardSurface boundary.
    }

    // MARK: - Details

    private var detailsBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(project.title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)

            // Fact chips
            HStack(spacing: 6) {
                if let location = locationLabel {
                    FactChip(icon: "mappin", label: location)
                }
                if let budget = budgetLabel {
                    FactChip(icon: "banknote", label: budget, accent: true)
                }
            }

            if project.bedrooms != nil || project.bathrooms != nil {
                HStack(spacing: 14) {
                    if let beds = project.bedrooms {
                        bedBathRow(icon: "bed.double.fill", value: beds, suffix: beds == 1 ? "bed" : "beds")
                    }
                    if let baths = project.bathrooms {
                        bedBathRow(icon: "shower.fill", value: baths, suffix: baths == 1 ? "bath" : "baths")
                    }
                }
            }

            Rectangle()
                .fill(Palette.hairline)
                .frame(height: 1)

            HStack {
                unlockCTA
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.accentLight)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
    }

    private func bedBathRow(icon: String, value: Int, suffix: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.textDim)
            Text("\(value) \(suffix)")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Palette.textMuted)
        }
    }

    // MARK: - Type chip + colour palette

    private var typeChip: some View {
        HStack(spacing: 4) {
            Image(systemName: typeIcon)
                .font(.system(size: 10, weight: .bold))
            Text(typeLabel.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.4)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(.black.opacity(0.36)))
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
    }

    private var unlockedPill: some View {
        HStack(spacing: 4) {
            Image(systemName: project.unlockedCount > 0 ? "lock.open.fill" : "lock.fill")
                .font(.system(size: 9, weight: .bold))
            Text("\(project.unlockedCount) / 3 unlocked")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.6)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(.black.opacity(0.36)))
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
    }

    private var freshnessTag: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(.white)
                .frame(width: 5, height: 5)
                .shadow(color: .white.opacity(0.6), radius: 4)
            Text(freshnessLabel.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Capsule().fill(.black.opacity(0.36)))
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
    }

    private var unlockCTA: some View {
        HStack(spacing: 6) {
            Image(systemName: fbaActive ? "sparkles" : "lock.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(fbaActive ? Palette.accent : Palette.accentLight)
            Text(unlockLabel)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Palette.text)
        }
    }

    // MARK: - Display strings

    private var unlockLabel: String {
        // The server's `suggested` feed already filters out unlocks the
        // builder has done — so projects in this feed are always still
        // locked to them. No "already unlocked" case needed here.
        if fbaActive { return "Free with founding access" }
        return "Unlock for $\(unlockPriceAud)"
    }

    private var typeIcon: String {
        switch project.type {
        case "single_dwelling": return "house.fill"
        case "multi_dwelling":  return "building.2.fill"
        case "renovation":      return "paintbrush.fill"
        case "extension":       return "rectangle.expand.vertical"
        default:                return "square.dashed"
        }
    }

    private var typeLabel: String {
        switch project.type {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return project.type
        }
    }

    private var locationLabel: String? {
        let suburb = project.suburb?.trimmingCharacters(in: .whitespacesAndNewlines)
        let state = project.state?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let suburb, !suburb.isEmpty, let state, !state.isEmpty {
            return "\(suburb), \(state)"
        }
        if let state, !state.isEmpty { return state }
        if let suburb, !suburb.isEmpty { return suburb }
        return nil
    }

    private var budgetLabel: String? {
        guard let band = project.budgetBand, !band.isEmpty else { return nil }
        return prettifyBudget(band)
    }

    /// Server stores budget bands as snake_case enum strings — map the
    /// canonical bands to display labels (matches the marketplace card).
    private func prettifyBudget(_ raw: String) -> String {
        switch raw {
        case "under_500k": return "Under $500k"
        case "500k_1m":    return "$500k–$1M"
        case "1m_1_5m":    return "$1–1.5M"
        case "1_5m_2m":    return "$1.5–2M"
        case "2m_3m":      return "$2–3M"
        case "3m_5m":      return "$3–5M"
        case "over_5m":    return "$5M+"
        default:           return raw.replacingOccurrences(of: "_", with: " ")
        }
    }

    private var freshnessLabel: String {
        guard let iso = project.publishedAt else { return "NEW" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: iso) ?? {
            let alt = ISO8601DateFormatter()
            alt.formatOptions = [.withInternetDateTime]
            return alt.date(from: iso) ?? Date()
        }()
        let elapsed = Date().timeIntervalSince(date)
        let days = Int(elapsed / 86_400)
        switch days {
        case 0: return "Today"
        case 1: return "Yesterday"
        case 2...6: return "\(days)d ago"
        case 7...29: return "\(days / 7)w ago"
        default: return "\(days / 30)mo ago"
        }
    }
}

// MARK: - Fact chip

private struct FactChip: View {
    let icon: String
    let label: String
    var accent: Bool = false

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(accent ? Palette.accent : Palette.textDim)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(accent ? Palette.accentLight : Palette.textMuted)
                .lineLimit(1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(accent ? Palette.accentMuted : Palette.surfaceElev))
        .overlay(Capsule().stroke(accent ? Palette.accent.opacity(0.35) : Palette.hairline, lineWidth: 1))
    }
}

