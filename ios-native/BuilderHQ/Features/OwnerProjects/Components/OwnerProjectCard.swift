/// OwnerProjectCard — one project in the owner Projects tab list.
///
/// More substantial than the dashboard's compact OwnerProjectRow so
/// the Projects tab feels like the home of the owner's portfolio:
///
///   · Left: type-coloured square thumbnail with the type icon and a
///     subtle inner grid pattern (matching the marketplace cards)
///   · Centre: title, suburb · state, status pill
///   · Right: stats stack — tender count + unlock count, both
///     compact metric chips
///   · Bottom hairline + status-coloured ribbon glow when published

import SwiftUI

struct OwnerProjectCard: View {
    let project: ProjectsAPI.OwnerProjectRow

    var body: some View {
        HStack(spacing: 14) {
            thumbnail
            VStack(alignment: .leading, spacing: 6) {
                Text(project.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                metaRow
                statusPill
            }
            Spacer(minLength: 8)
            statsColumn
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(
                    isLive ? Palette.accent.opacity(0.32) : Palette.cardBorder,
                    lineWidth: 1
                )
        )
        .shadow(
            color: isLive ? Palette.accentGlow.opacity(0.3) : .clear,
            radius: 14
        )
    }

    private var isLive: Bool {
        project.status == "published" || project.status == "tendering"
    }

    // MARK: - Thumbnail

    private var thumbnail: some View {
        ProjectCoverArt(type: project.type, glyph: typeIcon)
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Palette.hairline, lineWidth: 1)
            )
    }

    // MARK: - Meta + status

    private var metaRow: some View {
        HStack(spacing: 6) {
            if let location = locationLabel {
                Image(systemName: "mappin")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.textDim)
                Text(location)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .lineLimit(1)
            } else {
                Text(typeLabel)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
            }
        }
    }

    private var statusPill: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(statusColor)
                .frame(width: 5, height: 5)
                .shadow(
                    color: statusColor.opacity(0.7),
                    radius: status == "published" || status == "tendering"
                        ? 5
                        : 0
                )
            Text(statusLabel)
                .font(.system(size: 10, weight: .bold))
                .tracking(1.0)
                .foregroundStyle(statusColor)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(Capsule().fill(statusColor.opacity(0.12)))
        .overlay(Capsule().stroke(statusColor.opacity(0.3), lineWidth: 1))
    }

    // MARK: - Stats

    private var statsColumn: some View {
        VStack(alignment: .trailing, spacing: 8) {
            statTile(
                icon: "paperplane.fill",
                value: project.stats.tenderCount,
                accent: project.stats.tenderCount > 0
            )
            statTile(
                icon: "lock.open.fill",
                value: project.stats.unlockCount,
                accent: false
            )
        }
    }

    private func statTile(icon: String, value: Int, accent: Bool) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(accent ? Palette.accent : Palette.textDim)
            Text("\(value)")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(accent ? Palette.accent : Palette.text)
                .monospacedDigit()
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(accent ? Palette.accentMuted : Palette.surfaceElev)
        )
        .overlay(
            Capsule()
                .stroke(
                    accent ? Palette.accent.opacity(0.35) : Palette.hairline,
                    lineWidth: 1
                )
        )
    }

    // MARK: - Display helpers

    private var status: String { project.status }

    private var statusLabel: String {
        switch status {
        case "draft":      return "DRAFT"
        case "published":  return "LIVE"
        case "tendering":  return "TENDERING"
        case "completed":  return "DONE"
        case "cancelled":  return "CANCELLED"
        default:           return status.uppercased()
        }
    }

    private var statusColor: Color {
        switch status {
        case "published", "tendering": return Palette.accent
        case "draft":                   return Palette.warning
        case "completed":               return Palette.success
        case "cancelled":               return Palette.danger
        default:                        return Palette.textDim
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

    private var locationLabel: String? {
        let suburb = project.suburb?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let state = project.state?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if let suburb, !suburb.isEmpty, let state, !state.isEmpty {
            return "\(suburb), \(state)"
        }
        if let state, !state.isEmpty { return state }
        if let suburb, !suburb.isEmpty { return suburb }
        return nil
    }
}
