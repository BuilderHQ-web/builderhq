/// Components for the tender comparison screen: the price-range band,
/// the per-builder quote card, the trade-by-trade matrix, and a small
/// wrapping layout. Kept together so the screen file stays about
/// composition, not pixels.

import SwiftUI

// MARK: - Price range bar

/// A horizontal min ▸ median ▸ max track with a labelled marker bubble
/// per builder, positioned by price. Cheap (left) → dear (right).
struct PriceRangeBar: View {
    struct Marker: Identifiable, Equatable {
        let id: String
        let value: Int
        let initials: String
    }

    let min: Int?
    let median: Int?
    let max: Int?
    let markers: [Marker]
    /// The owner's budget ceiling — drawn as a marker line when it falls
    /// within the quote range.
    var budgetCeiling: Int? = nil

    @State private var drawn = false

    var body: some View {
        VStack(spacing: 10) {
            GeometryReader { geo in
                let w = geo.size.width
                ZStack(alignment: .leading) {
                    // Track.
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [Palette.accent.opacity(0.55), Palette.warning.opacity(0.55)],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(height: 6)
                        .frame(maxHeight: .infinity, alignment: .center)

                    // Median tick.
                    if let mid = fraction(median) {
                        Rectangle()
                            .fill(Palette.text.opacity(0.6))
                            .frame(width: 2, height: 16)
                            .offset(x: mid * w - 1)
                    }

                    // Budget ceiling — only when it sits within the range.
                    if let bf = fraction(budgetCeiling), bf > 0.02, bf < 0.98 {
                        ZStack(alignment: .top) {
                            Rectangle()
                                .fill(Palette.warning.opacity(0.9))
                                .frame(width: 1.5, height: 26)
                            Text("BUDGET")
                                .font(.system(size: 7, weight: .black))
                                .tracking(0.6)
                                .foregroundStyle(Palette.warning)
                                .offset(y: -10)
                        }
                        .offset(x: bf * w - 0.75)
                    }

                    // Builder markers.
                    ForEach(markers) { m in
                        let f = fraction(m.value) ?? 0.5
                        Text(m.initials)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Palette.accentContrast)
                            .frame(width: 26, height: 26)
                            .background(Circle().fill(Palette.accent))
                            .overlay(Circle().stroke(Palette.canvas, lineWidth: 2))
                            .shadow(color: Palette.accentGlow.opacity(0.5), radius: 5)
                            .offset(x: (drawn ? f : 0.5) * w - 13)
                            .animation(.spring(response: 0.6, dampingFraction: 0.8), value: drawn)
                    }
                }
            }
            .frame(height: 30)

            // Min / max labels.
            HStack {
                if let lo = min {
                    label("LOW", TenderCompareViewModel.compactMoney(lo), .leading)
                }
                Spacer()
                if let md = median {
                    label("MEDIAN", TenderCompareViewModel.compactMoney(md), .center)
                }
                Spacer()
                if let hi = max {
                    label("HIGH", TenderCompareViewModel.compactMoney(hi), .trailing)
                }
            }
        }
        .onAppear { drawn = true }
    }

    private func fraction(_ value: Int?) -> CGFloat? {
        guard let value, let lo = min, let hi = max else { return nil }
        guard hi > lo else { return 0.5 }
        return CGFloat(value - lo) / CGFloat(hi - lo)
    }

    private func label(_ top: String, _ value: String, _ align: HorizontalAlignment) -> some View {
        VStack(alignment: align, spacing: 1) {
            Text(top)
                .font(.system(size: 8, weight: .bold))
                .tracking(1.0)
                .foregroundStyle(Palette.textDim)
            Text(value)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Palette.text)
        }
    }
}

// MARK: - Quote card

/// A rich, self-contained summary of one builder's bid + the owner's
/// decision actions. Sized by the caller (≈300pt in the rail).
struct QuoteCard: View {
    struct Badge: Identifiable, Equatable {
        let text: String
        let icon: String
        let tint: Color
        var id: String { text }
    }

    let tender: OwnerTendersAPI.Tender
    let insight: TenderCompareViewModel.Insights.PerTender?
    let badges: [Badge]
    let isDeciding: Bool
    let hasAward: Bool

    let onDetail: () -> Void
    let onViewBuilder: () -> Void
    let onShortlist: () -> Void
    let onAward: () -> Void
    let onReject: () -> Void
    let onReopen: () -> Void

    private var isAwarded: Bool { tender.status == "awarded" }
    private var isRejected: Bool { tender.status == "rejected" }
    private var isShortlisted: Bool { tender.status == "shortlisted" }
    /// This card is a loser once another tender won.
    private var isEclipsed: Bool { hasAward && !isAwarded }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            headerRow
            if !badges.isEmpty { badgeRow }
            priceBlock
            statRow
            completenessRow
            cautionRow
            if let pitch = tender.pitch, !pitch.isEmpty {
                Text(pitch)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            actions
        }
        .padding(16)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(isAwarded ? goldEdge : Palette.cardBorder, lineWidth: isAwarded ? 1.5 : 1)
        )
        .shadow(color: isAwarded ? goldEdge.opacity(0.3) : .clear, radius: 16, y: 6)
        .opacity(isRejected ? 0.55 : 1)
    }

    private var goldEdge: Color { Color(hex: 0xF5C24A) }

    // ── header ──
    private var headerRow: some View {
        HStack(spacing: 10) {
            Press(haptic: .tap, action: onViewBuilder) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle().fill(Palette.accentMuted)
                        Text(tender.builder.initials)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(Palette.accent)
                    }
                    .frame(width: 40, height: 40)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(tender.builder.displayName)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(Palette.text)
                                .lineLimit(1)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(Palette.textDim)
                        }
                        HStack(spacing: 5) {
                            if tender.builder.abnVerified { verifyChip("ABN") }
                            if tender.builder.anyLicenceVerified { verifyChip("Licensed") }
                            if let y = tender.builder.yearsInOperation, y > 0 {
                                Text("\(y)y")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(Palette.textDim)
                            }
                        }
                    }
                    .contentShape(Rectangle())
                }
            }
            Spacer(minLength: 4)
            statusPill
        }
    }

    private func verifyChip(_ text: String) -> some View {
        HStack(spacing: 2) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 8, weight: .bold))
            Text(text).font(.system(size: 9, weight: .bold))
        }
        .foregroundStyle(Palette.success)
    }

    private var statusPill: some View {
        Text(statusText)
            .font(.system(size: 8.5, weight: .black))
            .tracking(0.8)
            .foregroundStyle(statusTint)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(Capsule().fill(statusTint.opacity(0.14)))
    }

    private var statusText: String {
        switch tender.status {
        case "shortlisted": return "SHORTLISTED"
        case "awarded": return "AWARDED"
        case "rejected": return "DECLINED"
        default: return "SUBMITTED"
        }
    }
    private var statusTint: Color {
        switch tender.status {
        case "shortlisted": return Palette.blue
        case "awarded": return goldEdge
        case "rejected": return Palette.textDim
        default: return Palette.accent
        }
    }

    // ── badges ──
    private var badgeRow: some View {
        FlexibleWrapCompare(spacing: 6, lineSpacing: 6) {
            ForEach(badges) { b in
                HStack(spacing: 3) {
                    Image(systemName: b.icon).font(.system(size: 8, weight: .black))
                    Text(b.text).font(.system(size: 10, weight: .bold))
                }
                .foregroundStyle(b.tint)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(Capsule().fill(b.tint.opacity(0.14)))
            }
        }
    }

    // ── price ──
    private var priceBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let p = tender.totalPriceAud {
                Text(TenderCompareViewModel.fullMoney(p))
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.text)
            } else {
                Text("No price")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Palette.textDim)
            }
            FlexibleWrapCompare(spacing: 6, lineSpacing: 6) {
                if let delta = insight?.priceDeltaVsMedian, delta != 0 {
                    let below = delta < 0
                    metricChip(
                        below ? "arrow.down" : "arrow.up",
                        "\(TenderCompareViewModel.compactMoney(abs(delta))) vs median",
                        below ? Palette.success : Palette.warning
                    )
                }
                if let sqm = insight?.pricePerSqm {
                    metricChip("ruler", "~\(TenderCompareViewModel.fullMoney(sqm))/m²", Palette.textMuted)
                }
                budgetChip
            }
        }
    }

    @ViewBuilder
    private var budgetChip: some View {
        if let within = insight?.withinBudget {
            if within {
                metricChip("checkmark.circle.fill", "Within budget", Palette.success)
            } else if let over = insight?.budgetOverAud {
                metricChip("exclamationmark.triangle.fill", "\(TenderCompareViewModel.compactMoney(over)) over budget", Palette.warning)
            }
        }
    }

    private func metricChip(_ icon: String, _ text: String, _ tint: Color) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 8, weight: .black))
            Text(text).font(.system(size: 10.5, weight: .semibold))
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 7).padding(.vertical, 3.5)
        .background(Capsule().fill(tint.opacity(0.12)))
    }

    // ── stats: programme + timing ──
    private var statRow: some View {
        HStack(spacing: 0) {
            statCell("Build", tender.durationWeeks.map { "\($0) wks" } ?? "—")
            divider
            statCell("Done by", insight?.completionMonth ?? "—")
            divider
            statCell("Valid", validityText)
        }
        .padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: Radius.control).fill(Palette.surfaceElev.opacity(0.5)))
    }

    private var divider: some View {
        Rectangle().fill(Palette.hairline).frame(width: 1, height: 24)
    }

    private func statCell(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .bold)).tracking(0.8)
                .foregroundStyle(Palette.textDim)
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(Palette.text)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }

    private var validityText: String {
        guard let days = insight?.expiryDaysRemaining else {
            return tender.validityDays.map { "\($0)d" } ?? "—"
        }
        if days < 0 { return "Expired" }
        if days == 0 { return "Today" }
        return "\(days)d left"
    }

    // ── completeness subtitle (itemisation depth) ──
    @ViewBuilder
    private var completenessSubtitle: some View {
        let items = insight?.itemisedTradeCount ?? 0
        if items > 0, let n = insight?.cheapestTradeCount, n > 0 {
            Text("\(items) trades · cheapest on \(n)")
                .foregroundStyle(Palette.accent)
        } else if items > 0 {
            Text("\(items) trade\(items == 1 ? "" : "s") itemised")
                .foregroundStyle(Palette.textDim)
        } else if !tender.completeness.missing.isEmpty {
            Text("Missing: \(tender.completeness.missing.prefix(2).joined(separator: ", "))")
                .foregroundStyle(Palette.textDim)
        } else {
            Text("\(Int((tender.completeness.score * 100).rounded()))% complete")
                .foregroundStyle(Palette.textDim)
        }
    }

    // ── caution chips (only when notable) ──
    @ViewBuilder
    private var cautionRow: some View {
        let provPct = insight?.provisionalPct ?? 0
        let isOutlier = insight?.isOutlier ?? false
        if provPct >= 0.08 || isOutlier {
            HStack(spacing: 6) {
                if isOutlier {
                    metricChip("exclamationmark.triangle.fill", "Outlier price", Palette.warning)
                }
                if provPct >= 0.08 {
                    metricChip("questionmark.circle.fill", "\(Int((provPct * 100).rounded()))% provisional", Palette.warning)
                }
                Spacer(minLength: 0)
            }
        }
    }

    // ── completeness ──
    private var completenessRow: some View {
        HStack(spacing: 9) {
            ZStack {
                Circle().stroke(Palette.hairlineStrong, lineWidth: 3).frame(width: 26, height: 26)
                Circle().trim(from: 0, to: CGFloat(tender.completeness.score))
                    .stroke(completeTint, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .frame(width: 26, height: 26).rotationEffect(.degrees(-90))
                Text("\(Int((tender.completeness.score * 100).rounded()))")
                    .font(.system(size: 8, weight: .black))
                    .foregroundStyle(Palette.text)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(tender.completeness.score >= 0.9 ? "Fully itemised" : "Quote completeness")
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(Palette.text)
                completenessSubtitle
                    .font(.system(size: 10, weight: .medium))
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            if tender.documentCount > 0 {
                HStack(spacing: 3) {
                    Image(systemName: "paperclip").font(.system(size: 9, weight: .bold))
                    Text("\(tender.documentCount)").font(.system(size: 10, weight: .bold))
                }
                .foregroundStyle(Palette.textMuted)
            }
        }
    }

    private var completeTint: Color {
        tender.completeness.score >= 0.8 ? Palette.accent
            : tender.completeness.score >= 0.5 ? Palette.warning : Palette.danger
    }

    // ── actions ──
    @ViewBuilder
    private var actions: some View {
        HStack(spacing: 8) {
            Press(haptic: .tap, action: onDetail) {
                Text("Details")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .frame(maxWidth: .infinity).frame(height: 44)
                    .background(Capsule().fill(Palette.surfaceElev))
                    .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
            }

            if isAwarded {
                primaryLike(label: "Awarded", icon: "trophy.fill", tint: goldEdge, filled: true) {}
                    .allowsHitTesting(false)
            } else if isRejected {
                Press(haptic: .tap, action: onReopen) {
                    Text("Reopen")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.accent)
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .background(Capsule().fill(Palette.accentMuted))
                }
            } else if isEclipsed {
                Text("Declined")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.textDim)
                    .frame(maxWidth: .infinity).frame(height: 44)
                    .background(Capsule().fill(Palette.surfaceElev))
            } else {
                // Live (submitted or shortlisted).
                if !isShortlisted {
                    Press(haptic: .tap, action: onShortlist) {
                        actionLabel("Shortlist", spinner: isDeciding, tint: Palette.text, fill: Palette.surfaceElev, stroke: true)
                    }
                }
                Press(haptic: .select, action: onAward) {
                    actionLabel("Award", icon: "trophy.fill", spinner: isDeciding, tint: Palette.accentContrast, fill: Palette.accent, glow: true)
                }
            }
        }
    }

    private func actionLabel(_ text: String, icon: String? = nil, spinner: Bool, tint: Color, fill: Color, stroke: Bool = false, glow: Bool = false) -> some View {
        ZStack {
            Capsule().fill(fill)
                .overlay(stroke ? Capsule().stroke(Palette.hairline, lineWidth: 1) : nil)
                .shadow(color: glow ? Palette.accentGlow : .clear, radius: 14, y: 5)
            if spinner {
                ProgressView().tint(tint).scaleEffect(0.7)
            } else {
                HStack(spacing: 5) {
                    if let icon { Image(systemName: icon).font(.system(size: 11, weight: .bold)) }
                    Text(text).font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(tint)
            }
        }
        .frame(maxWidth: .infinity).frame(height: 44)
    }

    private func primaryLike(label: String, icon: String, tint: Color, filled: Bool, action: @escaping () -> Void) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.system(size: 11, weight: .bold))
            Text(label).font(.system(size: 13, weight: .bold))
        }
        .foregroundStyle(Palette.accentContrast)
        .frame(maxWidth: .infinity).frame(height: 44)
        .background(Capsule().fill(tint))
    }
}

// MARK: - Trade matrix

/// Trade-by-trade price comparison. Builder initials as column headers,
/// one row per trade at least one builder itemised; the cheapest cell in
/// each row is highlighted.
struct TradeMatrix: View {
    let tenders: [OwnerTendersAPI.Tender]
    let rows: [TenderCompareViewModel.Insights.TradeRow]

    private let labelWidth: CGFloat = 92

    var body: some View {
        VStack(spacing: 0) {
            headerRow
            ForEach(Array(rows.enumerated()), id: \.element.id) { idx, row in
                tradeRow(row)
                    .background(idx % 2 == 1 ? Palette.surfaceElev.opacity(0.3) : Color.clear)
            }
        }
        .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).stroke(Palette.cardBorder, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
    }

    private var headerRow: some View {
        HStack(spacing: 6) {
            Text("TRADE")
                .font(.system(size: 8.5, weight: .bold)).tracking(1.0)
                .foregroundStyle(Palette.textDim)
                .frame(width: labelWidth, alignment: .leading)
            ForEach(tenders) { t in
                Text(t.builder.initials)
                    .font(.system(size: 10, weight: .black))
                    .foregroundStyle(Palette.textMuted)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 9)
        .background(Palette.surfaceElev.opacity(0.5))
    }

    private func tradeRow(_ row: TenderCompareViewModel.Insights.TradeRow) -> some View {
        HStack(spacing: 6) {
            Text(row.label)
                .font(.system(size: 11.5, weight: .medium))
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .frame(width: labelWidth, alignment: .leading)
            ForEach(tenders) { t in
                cell(amount: row.amounts[t.id], isCheapest: row.cheapestId == t.id)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
    }

    private func cell(amount: Int?, isCheapest: Bool) -> some View {
        Group {
            if let amount {
                Text(TenderCompareViewModel.compactMoney(amount))
                    .font(.system(size: 11.5, weight: isCheapest ? .bold : .semibold, design: .rounded))
                    .foregroundStyle(isCheapest ? Palette.accent : Palette.text)
            } else {
                Text("—")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textDim)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .background(
            isCheapest
                ? RoundedRectangle(cornerRadius: 7).fill(Palette.accentMuted)
                : nil
        )
    }
}

// MARK: - Phase styling (allocation)

enum PhaseStyle {
    static func color(_ p: TradePhase) -> Color {
        switch p {
        case .siteStructure: return Palette.blue
        case .envelope:      return Palette.accent
        case .finishes:      return Palette.accentLight
        case .services:      return Palette.warning
        case .external:      return Palette.success
        case .other:         return Palette.textDim
        }
    }
    static func short(_ p: TradePhase) -> String {
        switch p {
        case .siteStructure: return "Structure"
        case .envelope:      return "Envelope"
        case .finishes:      return "Finishes"
        case .services:      return "Services"
        case .external:      return "External"
        case .other:         return "Other"
        }
    }
}

// MARK: - Phase allocation bar

/// A slim stacked bar showing where one builder's money goes by build
/// phase. Fills left-to-right on appear.
struct PhaseAllocationBar: View {
    let slices: [TenderCompareViewModel.Insights.PhaseSlice]
    @State private var progress: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            HStack(spacing: 0) {
                ForEach(slices) { s in
                    PhaseStyle.color(s.phase)
                        .frame(width: max(0, w * CGFloat(s.fraction) * progress))
                }
                Spacer(minLength: 0)
            }
        }
        .frame(height: 12)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
        .onAppear {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.85)) { progress = 1 }
        }
    }
}

// MARK: - Timeline (mini Gantt)

/// Each builder's build window (start → estimated completion) on one
/// shared month axis. Bars grow on appear.
struct TenderTimeline: View {
    struct Row: Identifiable, Equatable {
        let id: String
        let initials: String
        let name: String
        let startIndex: Int
        let endIndex: Int
        let completionLabel: String
        let isFastest: Bool
    }

    let rows: [Row]
    let axisStart: Int
    let axisEnd: Int

    @State private var drawn = false

    private var span: CGFloat { CGFloat(max(1, axisEnd - axisStart)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            ForEach(rows) { row in
                HStack(spacing: 10) {
                    Text(row.initials)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(row.isFastest ? Palette.accent : Palette.textMuted))
                    GeometryReader { geo in
                        let w = geo.size.width
                        let lead = CGFloat(row.startIndex - axisStart) / span
                        let len = CGFloat(row.endIndex - row.startIndex) / span
                        ZStack(alignment: .leading) {
                            Capsule().fill(Palette.surfaceElev.opacity(0.6))
                                .frame(height: 8)
                            Capsule()
                                .fill(
                                    LinearGradient(
                                        colors: row.isFastest
                                            ? [Palette.accent, Palette.accentLight]
                                            : [Palette.blue, Palette.blue.opacity(0.7)],
                                        startPoint: .leading, endPoint: .trailing
                                    )
                                )
                                .frame(width: max(8, w * len * (drawn ? 1 : 0)), height: 8)
                                .offset(x: w * lead)
                        }
                        .frame(maxHeight: .infinity, alignment: .center)
                    }
                    .frame(height: 24)
                    Text(row.completionLabel)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.textMuted)
                        .frame(width: 58, alignment: .trailing)
                }
            }
            // Axis end labels.
            HStack {
                Text(TenderCompareViewModel.Insights.monthLabel(axisStart))
                Spacer()
                Text(TenderCompareViewModel.Insights.monthLabel(axisEnd))
            }
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(Palette.textDim)
            .padding(.leading, 34)
            .padding(.trailing, 58)
        }
        .onAppear {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.85).delay(0.1)) { drawn = true }
        }
    }
}

// MARK: - Wrapping layout

/// Minimal flow layout that wraps children onto new lines. (Local copy —
/// the publish + tender screens each have their own private variant.)
struct FlexibleWrapCompare: Layout {
    var spacing: CGFloat = 8
    var lineSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, lineHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0; y += lineHeight + lineSpacing; lineHeight = 0
            }
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
        return CGSize(width: maxWidth == .infinity ? x : maxWidth, height: y + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, lineHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX; y += lineHeight + lineSpacing; lineHeight = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}
