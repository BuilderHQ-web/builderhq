/// LivePreviewCard — the project preview that builds itself as the
/// wizard advances. The hero moment of the publish flow.
///
/// At wizard mount, the card is mostly empty:
///   · Gradient is a soft neutral, "blank canvas"
///   · "Your project" placeholder title
///   · Chips invisible
///
/// As the user advances through steps, pieces lock in:
///   · Step 1 (Type)      → gradient shifts to the type's signature
///                          colour, type chip slides in top-left,
///                          icon appears
///   · Step 2 (Location)  → location chip slides in below title
///   · Step 3 (Specs)     → beds/baths row appears
///   · Step 4 (Budget)    → budget pill appears
///   · Step 4 (Timeline)  → start month appears
///   · Step 5 (Title)     → title replaces "Your project" placeholder
///   · Step 6 (Review)    → all set, card preview is complete
///
/// Each transition uses spring animations so additions feel like
/// they "snap into place". The user literally watches their listing
/// come together — turns a form into a craft moment.
///
/// Read-only: this view never accepts taps; it reflects state from
/// the ProjectPublishViewModel.

import SwiftUI

struct LivePreviewCard: View {
    let draft: ProjectDraft

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            coverBlock
            detailsBlock
        }
        .cardSurface(.lifted, radius: 22)
        .animation(
            .spring(response: 0.5, dampingFraction: 0.78),
            value: draft.type
        )
        .animation(
            .spring(response: 0.5, dampingFraction: 0.8),
            value: draft.location?.suburb
        )
        .animation(
            .spring(response: 0.5, dampingFraction: 0.8),
            value: draft.bedrooms
        )
        .animation(
            .spring(response: 0.5, dampingFraction: 0.8),
            value: draft.bathrooms
        )
        .animation(
            .spring(response: 0.5, dampingFraction: 0.8),
            value: draft.budgetBand
        )
        .animation(
            .spring(response: 0.5, dampingFraction: 0.8),
            value: draft.title
        )
    }

    // MARK: - Cover

    private var coverBlock: some View {
        ZStack(alignment: .topLeading) {
            // Type-aware art — gradient/bloom shift as a type is picked,
            // so the preview "comes to life" on step 1.
            ProjectCoverArt(type: draft.type ?? "")

            // Type chip — only appears once a type has been picked.
            if let type = draft.type {
                HStack {
                    typeChip(for: type)
                        .transition(.scale.combined(with: .opacity))
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
            }
        }
        .frame(height: 110)
    }

    // MARK: - Details

    private var detailsBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(displayTitle)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(draft.title.isEmpty ? Palette.textDim : Palette.text)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .animation(.spring(response: 0.4, dampingFraction: 0.85), value: draft.title)

            // Chips row — only shown when at least one piece of info exists.
            if hasChips {
                FlowChipsRow {
                    if let loc = draft.location {
                        chip(icon: "mappin", label: "\(loc.suburb), \(loc.state)")
                    }
                    if let beds = draft.bedrooms {
                        chip(icon: "bed.double.fill", label: "\(beds)\(beds == 7 ? "+" : "") bed\(beds == 1 ? "" : "s")")
                    }
                    if let baths = draft.bathrooms {
                        chip(icon: "shower.fill", label: "\(baths)\(baths == 5 ? "+" : "") bath\(baths == 1 ? "" : "s")")
                    }
                    if let band = draft.budgetBand {
                        chip(icon: "banknote", label: prettyBudget(band))
                    }
                    if let month = draft.targetStartMonth {
                        chip(icon: "calendar", label: "Start \(prettyMonth(month))")
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private var hasChips: Bool {
        draft.location != nil
            || draft.bedrooms != nil
            || draft.bathrooms != nil
            || draft.budgetBand != nil
            || draft.targetStartMonth != nil
    }

    private var displayTitle: String {
        if !draft.title.isEmpty { return draft.title }
        if let type = draft.type {
            return defaultTitleFor(type)
        }
        return "Your project"
    }

    // MARK: - Type chip

    private func typeChip(for type: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: typeIcon(for: type))
                .font(.system(size: 10, weight: .bold))
            Text(typeLabel(for: type).uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.4)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(.black.opacity(0.36)))
        .overlay(Capsule().stroke(.white.opacity(0.22), lineWidth: 1))
    }

    private func chip(icon: String, label: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Palette.textDim)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.textMuted)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(Palette.surfaceElev))
        .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
        .transition(.scale.combined(with: .opacity))
    }

    // MARK: - Type helpers

    private func typeIcon(for type: String) -> String {
        switch type {
        case "single_dwelling": return "house.fill"
        case "multi_dwelling":  return "building.2.fill"
        case "renovation":      return "paintbrush.fill"
        case "extension":       return "rectangle.expand.vertical"
        default:                return "square.dashed"
        }
    }

    private func typeLabel(for type: String) -> String {
        switch type {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return type
        }
    }

    private func defaultTitleFor(_ type: String) -> String {
        switch type {
        case "single_dwelling": return "New single dwelling"
        case "multi_dwelling":  return "New multi-dwelling project"
        case "renovation":      return "Renovation project"
        case "extension":       return "Home extension"
        default:                return "Your project"
        }
    }

    private func prettyBudget(_ band: String) -> String {
        switch band {
        case "under_500k": return "Under $500k"
        case "500k_1m":    return "$500k–$1M"
        case "1m_1_5m":    return "$1M–1.5M"
        case "1_5m_2m":    return "$1.5M–2M"
        case "2m_3m":      return "$2M–3M"
        case "3m_5m":      return "$3M–5M"
        case "over_5m":    return "$5M+"
        default:           return band
        }
    }

    private func prettyMonth(_ key: String) -> String {
        let parts = key.split(separator: "-")
        guard parts.count == 2,
              let y = Int(parts[0]),
              let m = Int(parts[1]),
              (1...12).contains(m)
        else { return key }
        let names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]
        return "\(names[m - 1]) \(String(y).suffix(2))"
    }
}


// MARK: - Flow row for chips

/// Wraps chips so they flow across rows naturally. SwiftUI's `Layout`
/// makes this trivial — measure the children + place them with simple
/// left-to-right + wrap-when-overflowing logic.
private struct FlowChipsRow<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        FlowLayout(spacing: 6, lineSpacing: 6) {
            content
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6
    var lineSpacing: CGFloat = 6

    func sizeThatFits(
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var currentX: CGFloat = 0
        var currentRowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        var widestRow: CGFloat = 0

        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                widestRow = max(widestRow, currentX - spacing)
                totalHeight += currentRowHeight + lineSpacing
                currentX = 0
                currentRowHeight = 0
            }
            currentX += size.width + spacing
            currentRowHeight = max(currentRowHeight, size.height)
        }
        widestRow = max(widestRow, currentX - spacing)
        totalHeight += currentRowHeight
        return CGSize(width: widestRow, height: totalHeight)
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let maxWidth = bounds.width
        var x: CGFloat = bounds.minX
        var y: CGFloat = bounds.minY
        var currentRowHeight: CGFloat = 0

        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if x + size.width > bounds.minX + maxWidth && x > bounds.minX {
                x = bounds.minX
                y += currentRowHeight + lineSpacing
                currentRowHeight = 0
            }
            sv.place(
                at: CGPoint(x: x, y: y),
                anchor: .topLeading,
                proposal: ProposedViewSize(size)
            )
            x += size.width + spacing
            currentRowHeight = max(currentRowHeight, size.height)
        }
    }
}
