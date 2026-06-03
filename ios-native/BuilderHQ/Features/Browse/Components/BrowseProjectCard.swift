/// BrowseProjectCard — the marketplace card. More visual + more
/// substantial than the dashboard's compact ProjectFeedCard. Sized to
/// be the dominant element of a vertically-scrolling feed.
///
/// Composition:
///   · Cover area (170pt, type gradient + grid pattern) with:
///       - Top-left: type chip
///       - Top-right: save heart (animates to red filled on tap)
///       - Bottom-left: freshness tag ("3d ago")
///       - Bottom-right: unlock-count pill
///   · Body:
///       - Title
///       - Location row (suburb · state)
///       - Quick-facts row (beds / baths / budget)
///       - Sticky CTA row: unlock pill + chevron
///
/// Pure presentation — the card body doesn't capture taps. Caller
/// wraps in `NavigationLink(value: project.slug)` with
/// `PressButtonStyle()`. The heart is a nested `Button` (scoped to
/// its own hit area, so it fires `onToggleSave` without bubbling up
/// to the link).

import SwiftUI

struct BrowseProjectCard: View {
    let project: ProjectsAPI.BrowseProject
    let fbaActive: Bool
    var onToggleSave: () -> Void

    @State private var heartBump: Bool = false

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
            ProjectCoverArt(type: project.type, cornerTicks: true)

            // Top row: type chip (left) + save heart (right)
            HStack {
                typeChip
                Spacer()
                saveHeartButton
            }
            .padding(.horizontal, 14)
            .padding(.top, 14)

            // Bottom row: freshness (left) + unlocked count (right)
            VStack {
                Spacer()
                HStack {
                    freshnessTag
                    Spacer()
                    unlockedPill
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 14)
            }
        }
        .frame(height: 170)
    }

    // MARK: - Details

    private var detailsBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(project.title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)

            if let locationLabel = locationLabel {
                HStack(spacing: 5) {
                    Image(systemName: "mappin")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.textDim)
                    Text(locationLabel)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                        .lineLimit(1)
                }
            }

            // Quick facts row — beds, baths, budget chips
            FactChipsRow {
                if let beds = project.bedrooms {
                    factChip(icon: "bed.double.fill", label: "\(beds) bed\(beds == 1 ? "" : "s")")
                }
                if let baths = project.bathrooms {
                    factChip(icon: "shower.fill", label: "\(baths) bath\(baths == 1 ? "" : "s")")
                }
                if let budget = budgetLabel {
                    factChip(icon: "banknote", label: budget, accent: true)
                }
            }

            Rectangle()
                .fill(Palette.hairline)
                .frame(height: 1)
                .padding(.vertical, 2)

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

    // MARK: - Chips + buttons

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
        .background(Capsule().fill(.black.opacity(0.42)))
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
    }

    private var saveHeartButton: some View {
        // Button (not Press) so it nests cleanly inside the parent's
        // NavigationLink — the Button's hit region is local to its
        // own bounds and doesn't bubble up to fire the link.
        Button {
            heartBump.toggle()
            onToggleSave()
        } label: {
            ZStack {
                Circle()
                    .fill(.black.opacity(0.42))
                    .overlay(Circle().stroke(.white.opacity(0.18), lineWidth: 1))

                Image(systemName: project.isSaved ? "heart.fill" : "heart")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(
                        project.isSaved ? Palette.danger : .white.opacity(0.85)
                    )
                    .scaleEffect(heartBump ? 1.18 : 1.0)
                    .symbolEffect(.bounce, value: heartBump)
                    .animation(
                        .spring(response: 0.28, dampingFraction: 0.5),
                        value: heartBump
                    )
            }
            .frame(width: 34, height: 34)
            .contentShape(Circle())
        }
        .buttonStyle(PressButtonStyle(haptic: .tap, scaleTo: 0.9))
    }

    private var freshnessTag: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(.white)
                .frame(width: 5, height: 5)
                .shadow(color: .white.opacity(0.6), radius: 4)
            Text(freshnessLabel.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(.black.opacity(0.42)))
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
    }

    private var unlockedPill: some View {
        HStack(spacing: 4) {
            Image(systemName: project.unlockedCount > 0 ? "lock.open.fill" : "lock.fill")
                .font(.system(size: 9, weight: .bold))
            Text("\(project.unlockedCount) / \(project.unlockCap)")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.4)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(.black.opacity(0.42)))
        .overlay(Capsule().stroke(.white.opacity(0.2), lineWidth: 1))
    }

    private func factChip(icon: String, label: String, accent: Bool = false) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(accent ? Palette.accent : Palette.textDim)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(accent ? Palette.accentLight : Palette.textMuted)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule().fill(accent ? Palette.accentMuted : Palette.surfaceElev)
        )
        .overlay(
            Capsule().stroke(
                accent ? Palette.accent.opacity(0.35) : Palette.hairline,
                lineWidth: 1
            )
        )
    }

    private var unlockCTA: some View {
        HStack(spacing: 6) {
            if project.isUnlocked {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.success)
                Text("Already unlocked")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.text)
            } else if fbaActive {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.accent)
                Text("Free with founding access")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.text)
            } else {
                Image(systemName: "lock.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.accentLight)
                Text("Unlock for $\(project.unlockPriceAud)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.text)
            }
        }
    }

    // MARK: - Derived display values

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
        switch band {
        case "under_500k": return "Under $500k"
        case "500k_1m":    return "$500k–$1M"
        case "1m_1_5m":    return "$1–1.5M"
        case "1_5m_2m":    return "$1.5–2M"
        case "2m_3m":      return "$2–3M"
        case "3m_5m":      return "$3–5M"
        case "over_5m":    return "$5M+"
        default:           return band.replacingOccurrences(of: "_", with: " ")
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

}

// MARK: - Helpers

/// Wraps fact chips in a horizontal row that wraps cleanly if needed.
private struct FactChipsRow<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        HStack(spacing: 6) {
            content
            Spacer(minLength: 0)
        }
    }
}
