/// TenderRaceCard — the owner's signature dashboard moment.
///
/// Turns a live project into a visible *race*: how many builders have
/// unlocked it (the 3 slots filling), how many tenders are in, what's
/// unread, and the one action that matters — Review. Pure presentation;
/// the dashboard wraps it in a NavigationLink to the project detail.

import SwiftUI

struct TenderRaceCard: View {
    let project: ProjectsAPI.OwnerProjectRow

    private let cap = 3
    private var unlocks: Int { min(project.stats.unlockCount, cap) }
    private var tenders: Int { project.stats.tenderCount }
    private var unread: Int { project.stats.unreadMessages }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                typeChip
                statusPill
                Spacer(minLength: 4)
                if let age = liveAge {
                    Text(age)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.textDim)
                }
            }

            Text(project.title)
                .font(.system(size: 20, weight: .bold))
                .tracking(-0.3)
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            // The race: 3 unlock slots filling as builders join.
            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 6) {
                    ForEach(0..<cap, id: \.self) { i in
                        Capsule()
                            .fill(i < unlocks
                                  ? AnyShapeStyle(Palette.accentToBlue)
                                  : AnyShapeStyle(Palette.surfaceElev))
                            .frame(height: 7)
                            .overlay(
                                Capsule().stroke(i < unlocks ? .clear : Palette.hairline, lineWidth: 1)
                            )
                    }
                }
                Text(unlocks == 0
                     ? "No builders unlocked yet"
                     : "\(unlocks) of \(cap) builder\(unlocks == 1 ? "" : "s") unlocked")
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
            }

            Rectangle().fill(Palette.hairline).frame(height: 1)

            HStack(alignment: .center, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text("\(tenders)")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundStyle(tenders > 0 ? Palette.accent : Palette.textMuted)
                        .monospacedDigit()
                    Text(tenders == 1 ? "tender" : "tenders")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                }
                if unread > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.left.fill").font(.system(size: 9, weight: .bold))
                        Text("\(unread)").font(.system(size: 11, weight: .bold)).monospacedDigit()
                    }
                    .foregroundStyle(Palette.accentLight)
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(Capsule().fill(Palette.accentMuted))
                }
                Spacer(minLength: 6)
                reviewCTA
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(tenders > 0 ? Palette.accent.opacity(0.30) : Palette.cardBorder, lineWidth: 1)
        )
        .shadow(color: tenders > 0 ? Palette.accentGlow.opacity(0.18) : .clear, radius: 16, y: 6)
    }

    private var reviewCTA: some View {
        HStack(spacing: 6) {
            Text(tenders > 0 ? "Review \(tenders)" : "View")
                .font(.system(size: 13, weight: .bold))
            Image(systemName: "arrow.right").font(.system(size: 11, weight: .bold))
        }
        .foregroundStyle(tenders > 0 ? Palette.accentContrast : Palette.text)
        .padding(.horizontal, 14).frame(height: 38)
        .background(Capsule().fill(tenders > 0 ? AnyShapeStyle(Palette.accent) : AnyShapeStyle(Palette.surfaceElev)))
        .overlay(Capsule().stroke(tenders > 0 ? .clear : Palette.hairlineStrong, lineWidth: 1))
    }

    private var statusPill: some View {
        let (label, tint): (String, Color) = {
            switch project.status {
            case "tendering": return ("TENDERING", Palette.accent)
            default:          return ("LIVE", Palette.success)
            }
        }()
        return HStack(spacing: 4) {
            Circle().fill(tint).frame(width: 5, height: 5).shadow(color: tint.opacity(0.7), radius: 4)
            Text(label).font(.system(size: 9, weight: .black)).tracking(1.0).foregroundStyle(tint)
        }
        .padding(.horizontal, 8).padding(.vertical, 4)
        .background(Capsule().fill(tint.opacity(0.14)))
    }

    private var typeChip: some View {
        Text(typeLabel.uppercased())
            .font(.system(size: 9, weight: .bold)).tracking(1.0)
            .foregroundStyle(Palette.textDim)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Capsule().fill(Palette.surfaceElev))
    }

    private var typeLabel: String {
        switch project.type {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return project.type.replacingOccurrences(of: "_", with: " ")
        }
    }

    private var liveAge: String? {
        guard let iso = project.publishedAt, let date = ChatTime.parse(iso) else { return nil }
        let days = Int(Date().timeIntervalSince(date) / 86_400)
        if days <= 0 { return "live today" }
        if days < 7 { return "live \(days)d" }
        if days < 30 { return "live \(days / 7)w" }
        return "live \(days / 30)mo"
    }
}
