/// TenderPipelineLane — the builder's live standing.
///
/// Surfaces `myTenders[]` (previously unused) as a horizontal lane of
/// pipeline cards: each shows the project, the bid, and where it sits in
/// the race — a Sent → Shortlist → Award stepper. Drafts nudge "Finish
/// your tender"; terminal states read cleanly. Tap → the project detail.

import SwiftUI

struct TenderPipelineLane: View {
    let tenders: [DashboardAPI.TenderRow]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(tenders) { tender in
                    NavigationLink(value: tender.projectSlug) {
                        PipelineCard(tender: tender)
                    }
                    .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.98))
                    .frame(width: 248)
                }
            }
            .padding(.horizontal, 2)
        }
        .scrollClipDisabled()
    }
}

private struct PipelineCard: View {
    let tender: DashboardAPI.TenderRow

    private let stages = ["Sent", "Shortlist", "Award"]
    private var stageIndex: Int {
        switch tender.status {
        case "shortlisted": return 1
        case "awarded":     return 2
        default:            return 0   // submitted
        }
    }
    private var isAwarded: Bool { tender.status == "awarded" }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                statusPill
                Spacer(minLength: 4)
                if let price = tender.totalPriceAud {
                    Text(compactMoney(price))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.text)
                        .monospacedDigit()
                }
            }

            Text(tender.projectTitle)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)

            stageSection

            Text(metaLine)
                .font(.system(size: 10.5, weight: .medium))
                .foregroundStyle(Palette.textDim)
        }
        .padding(14)
        .frame(height: 156, alignment: .topLeading)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Palette.surface))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(isAwarded ? goldEdge.opacity(0.5) : Palette.cardBorder, lineWidth: isAwarded ? 1.5 : 1)
        )
        .shadow(color: isAwarded ? goldEdge.opacity(0.25) : .clear, radius: 14, y: 5)
    }

    @ViewBuilder
    private var stageSection: some View {
        switch tender.status {
        case "draft":
            HStack(spacing: 6) {
                Image(systemName: "pencil.line").font(.system(size: 11, weight: .bold))
                Text("Finish your tender").font(.system(size: 12.5, weight: .bold))
                Spacer(minLength: 2)
                Image(systemName: "arrow.right").font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(Palette.accent)
        case "rejected":
            terminal("Not selected", "xmark.circle.fill", Palette.textDim)
        case "withdrawn":
            terminal("Withdrawn", "arrow.uturn.backward.circle.fill", Palette.textDim)
        default:
            stepper
        }
    }

    private var stepper: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(i <= stageIndex ? dotColor(i) : Palette.surfaceElev)
                        .frame(width: 9, height: 9)
                        .overlay(Circle().stroke(i <= stageIndex ? .clear : Palette.hairline, lineWidth: 1))
                    if i < 2 {
                        Rectangle()
                            .fill(i < stageIndex ? Palette.accent : Palette.hairline)
                            .frame(height: 2)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
            Text(stageLabel)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(isAwarded ? goldEdge : Palette.accentLight)
        }
    }

    private func terminal(_ text: String, _ icon: String, _ tint: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 12, weight: .semibold))
            Text(text).font(.system(size: 12.5, weight: .semibold))
        }
        .foregroundStyle(tint)
    }

    private func dotColor(_ i: Int) -> Color { i == 2 ? goldEdge : Palette.accent }
    private var goldEdge: Color { Color(hex: 0xF5C24A) }

    private var stageLabel: String {
        switch tender.status {
        case "shortlisted": return "Shortlisted"
        case "awarded":     return "Awarded 🏆"
        default:            return "Submitted"
        }
    }

    private var statusPill: some View {
        let (label, tint): (String, Color) = {
            switch tender.status {
            case "draft":       return ("DRAFT", Palette.warning)
            case "shortlisted": return ("SHORTLISTED", Palette.blue)
            case "awarded":     return ("AWARDED", goldEdge)
            case "rejected":    return ("DECLINED", Palette.textDim)
            case "withdrawn":   return ("WITHDRAWN", Palette.textDim)
            default:            return ("SUBMITTED", Palette.accent)
            }
        }()
        return Text(label)
            .font(.system(size: 8.5, weight: .black)).tracking(0.8)
            .foregroundStyle(tint)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(Capsule().fill(tint.opacity(0.14)))
    }

    private var metaLine: String {
        if let iso = tender.submittedAt {
            return "Submitted \(ActivityTimeline.relative(iso)) ago"
        }
        return "Updated \(ActivityTimeline.relative(tender.updatedAt)) ago"
    }

    private func compactMoney(_ aud: Int) -> String {
        if aud >= 1_000_000 {
            let m = Double(aud) / 1_000_000
            return "$\(m.rounded(.toNearestOrEven) == m ? String(format: "%.0f", m) : String(format: "%.1f", m))M"
        }
        if aud >= 1_000 { return "$\(aud / 1_000)k" }
        return "$\(aud)"
    }
}
