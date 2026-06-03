/// TenderCompareScreen — the owner's tender comparison.
///
/// The payoff moment of the whole marketplace: the owner sees every
/// builder's bid side by side, with the insight to choose confidently.
/// Vertical scroll of intelligence, top to bottom:
///   · Hero — project + how many bids, how long they've been collecting
///   · Price range band — min ▸ median ▸ max with a marker per builder
///   · Superlative tiles — lowest / fastest / soonest start / verified
///   · Best value — a transparent crowned pick with the reasons why
///   · Quote rail — a rich, swipeable card per builder + decision actions
///   · Trade-by-trade — the price matrix, cheapest highlighted per trade
///   · Exclusions diff — what each leaves out, divergences flagged
///
/// Reads identically for 1, 2, or 3 quotes. Awarding a builder fires a
/// gold celebration and locks the rest.

import SwiftUI

/// The peak-moment gold (tender awarded). Local — distinct from the
/// teal/amber semantic tokens.
private let goldTint = Color(hex: 0xF5C24A)

struct TenderCompareScreen: View {
    @State private var vm: TenderCompareViewModel
    let onClose: () -> Void
    private let slug: String

    @State private var detailTender: OwnerTendersAPI.Tender? = nil
    @State private var builderLink: BuilderProfileLink? = nil
    @State private var showCelebration: Bool = false
    @State private var appear: Bool = false

    init(slug: String, projectTitle: String, onClose: @escaping () -> Void) {
        _vm = State(initialValue: TenderCompareViewModel(slug: slug, projectTitle: projectTitle))
        self.onClose = onClose
        self.slug = slug
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()

            switch vm.loadState {
            case .loading: loadingState
            case .error(let message): errorState(message)
            case .ready:
                if vm.tenders.isEmpty { emptyState } else { content }
            }

            if showCelebration, let c = vm.awardCelebration {
                celebration(c).transition(.opacity).zIndex(5)
            }
        }
        .task { await vm.load() }
        .onChange(of: vm.loadState) { _, state in
            if state == .ready {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.85).delay(0.05)) {
                    appear = true
                }
            }
        }
        .onChange(of: vm.awardCelebration) { _, c in
            guard c != nil else { return }
            withAnimation(.spring(response: 0.5, dampingFraction: 0.82)) {
                showCelebration = true
            }
        }
        .sheet(item: $detailTender) { tender in
            TenderDetailSheet(
                tender: tender,
                slug: slug,
                insight: vm.insights.perTender[tender.id],
                onClose: { detailTender = nil }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(item: $builderLink) { link in
            BuilderProfileScreen(builderId: link.id, projectSlug: link.projectSlug)
                .presentationDetents([.large])
        }
        .confirmationDialog(
            "Award this tender?",
            isPresented: Binding(
                get: { vm.pendingAward != nil },
                set: { if !$0 { vm.pendingAward = nil } }
            ),
            titleVisibility: .visible,
            presenting: vm.pendingAward
        ) { tender in
            Button("Award to \(tender.builder.displayName)", role: .none) {
                let t = tender
                vm.pendingAward = nil
                Task { await vm.award(t) }
            }
            Button("Cancel", role: .cancel) { vm.pendingAward = nil }
        } message: { tender in
            let others = max(0, vm.liveCount - 1)
            Text(others > 0
                ? "\(tender.builder.displayName) will be awarded this project. The other \(others) live quote\(others == 1 ? "" : "s") will be declined."
                : "\(tender.builder.displayName) will be awarded this project.")
        }
    }

    // MARK: - Content

    private var content: some View {
        VStack(spacing: 0) {
            topBar
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    heroHeader
                    if let a = vm.analytics, vm.tenders.count > 1 {
                        priceRangeBand(a)
                        superlativeTiles(a)
                    }
                    if vm.tenders.count > 1, let bvId = vm.insights.bestValueId,
                       let bv = vm.tenders.first(where: { $0.id == bvId }) {
                        bestValueCard(bv)
                    }
                    quotesSection
                    timelineSection
                    allocationSection
                    if !vm.insights.tradeRows.isEmpty {
                        tradeMatrixSection
                    }
                    if !vm.insights.exclusions.isEmpty {
                        exclusionsSection
                    }
                    if let banner = vm.bannerError {
                        bannerRow(banner)
                    }
                    Spacer(minLength: 36)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .scrollIndicators(.hidden)
        }
    }

    private func revealed<V: View>(_ index: Int, @ViewBuilder _ build: () -> V) -> some View {
        build()
            .opacity(appear ? 1 : 0)
            .offset(y: appear ? 0 : 18)
            .animation(
                .spring(response: 0.55, dampingFraction: 0.86).delay(Double(index) * 0.06),
                value: appear
            )
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: 12) {
            Press(haptic: .tap, action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
            VStack(alignment: .leading, spacing: 1) {
                Text("TENDER REVIEW")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2.0)
                    .foregroundStyle(Palette.accent)
                Text(vm.projectTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(Rectangle().fill(.ultraThinMaterial).ignoresSafeArea(edges: .top))
    }

    // MARK: - Hero

    private var heroHeader: some View {
        revealed(0) {
            VStack(alignment: .leading, spacing: 8) {
                (
                    Text("\(vm.tenders.count) ")
                        .font(Typography.ui(size: 32, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    + Text(vm.tenders.count == 1 ? "tender." : "tenders.")
                        .font(Typography.serifItalic(size: 34))
                        .foregroundStyle(Palette.accent)
                )
                Text(heroSubtitle)
                    .font(.system(size: 13.5, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
            }
        }
    }

    private var heroSubtitle: String {
        var parts: [String] = []
        let uniq = vm.analytics?.uniqueBuilders ?? vm.tenders.count
        parts.append("\(uniq) builder\(uniq == 1 ? "" : "s")")
        if let days = vm.analytics?.daysLive, days >= 0 {
            parts.append(days == 0 ? "live today" : "live \(days) day\(days == 1 ? "" : "s")")
        }
        if vm.hasAward { parts.append("awarded") }
        return parts.joined(separator: " · ")
    }

    // MARK: - Price range band

    private func priceRangeBand(_ a: OwnerTendersAPI.Analytics) -> some View {
        revealed(1) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Kicker("Price range")
                    Spacer()
                    if let lo = a.price.min, let hi = a.price.max, hi > lo {
                        Text("\(TenderCompareViewModel.compactMoney(hi - lo)) spread")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Palette.textDim)
                    }
                }
                PriceRangeBar(
                    min: a.price.min,
                    median: a.price.median,
                    max: a.price.max,
                    markers: vm.tenders.compactMap { t in
                        t.totalPriceAud.map {
                            PriceRangeBar.Marker(id: t.id, value: $0, initials: t.builder.initials)
                        }
                    },
                    budgetCeiling: BandScale.budgetRange(vm.project?.budgetBand)?.high
                )
            }
            .padding(16)
            .cardSurface(.flat, radius: Radius.card)
        }
    }

    // MARK: - Superlative tiles

    private func superlativeTiles(_ a: OwnerTendersAPI.Analytics) -> some View {
        revealed(2) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                if let id = vm.insights.lowestPriceId, let t = tender(id), let p = t.totalPriceAud {
                    statTile("arrow.down.circle.fill", Palette.accent, "Lowest price",
                             TenderCompareViewModel.compactMoney(p), t.builder.displayName)
                }
                if let id = vm.insights.bestPerSqmId, let t = tender(id),
                   let sqm = vm.insights.perTender[id]?.pricePerSqm {
                    statTile("ruler.fill", Palette.accentLight, "Best $/m²",
                             "~\(TenderCompareViewModel.fullMoney(sqm))", t.builder.displayName)
                }
                if let id = vm.insights.fastestId, let t = tender(id), let w = t.durationWeeks {
                    statTile("bolt.fill", Palette.accent, "Fastest build",
                             "\(w) wks", t.builder.displayName)
                }
                if let id = vm.insights.finishesFirstId, let t = tender(id),
                   let done = vm.insights.perTender[id]?.completionMonth {
                    statTile("flag.checkered", Palette.blue, "Finishes first",
                             done, t.builder.displayName)
                } else if let id = vm.insights.soonestStartId, let t = tender(id),
                          let m = t.proposedStartMonth {
                    statTile("calendar", Palette.blue, "Soonest start",
                             monthLabel(m), t.builder.displayName)
                }
            }
        }
    }

    private func statTile(_ icon: String, _ tint: Color, _ label: String, _ value: String, _ sub: String) -> some View {
        HStack(spacing: 11) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(tint.opacity(0.14))
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
            }
            .frame(width: 38, height: 38)
            VStack(alignment: .leading, spacing: 1) {
                Text(label.uppercased())
                    .font(.system(size: 8.5, weight: .bold))
                    .tracking(1.0)
                    .foregroundStyle(Palette.textDim)
                Text(value)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.text)
                Text(sub)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(.flat, radius: Radius.control)
    }

    // MARK: - Best value

    private func bestValueCard(_ t: OwnerTendersAPI.Tender) -> some View {
        revealed(3) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Palette.accent))
                    Text("BEST VALUE")
                        .font(.system(size: 11, weight: .black))
                        .tracking(1.6)
                        .foregroundStyle(Palette.accent)
                    Spacer()
                }
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Press(haptic: .tap) { builderLink = BuilderProfileLink(id: t.builder.id, projectSlug: slug) } content: {
                        HStack(spacing: 5) {
                            Text(t.builder.displayName)
                                .font(.system(size: 19, weight: .bold))
                                .foregroundStyle(Palette.text)
                                .lineLimit(1)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Palette.textDim)
                        }
                    }
                    Spacer()
                    if let p = t.totalPriceAud {
                        Text(TenderCompareViewModel.fullMoney(p))
                            .font(.system(size: 19, weight: .bold, design: .rounded))
                            .foregroundStyle(Palette.accent)
                    }
                }
                if !vm.insights.bestValueReasons.isEmpty {
                    FlexibleWrapCompare(spacing: 7, lineSpacing: 7) {
                        ForEach(vm.insights.bestValueReasons, id: \.self) { reason in
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 8, weight: .black))
                                Text(reason)
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundStyle(Palette.accentLight)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(Capsule().fill(Palette.accentMuted))
                        }
                    }
                }
                Text("Our pick balancing price, completeness, verification and timeline — not just the cheapest. Always your call.")
                    .font(.system(size: 11.5, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                        .fill(Palette.accent.opacity(0.08))
                    BlueprintGrid(spacing: 18, tint: Palette.accentLight, minorOpacity: 0.05)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                    .stroke(Palette.accent.opacity(0.35), lineWidth: 1)
            )
            .shadow(color: Palette.accentGlow.opacity(0.25), radius: 18, y: 6)
        }
    }

    // MARK: - Quotes rail

    private var quotesSection: some View {
        revealed(4) {
            VStack(alignment: .leading, spacing: 12) {
                Kicker(vm.tenders.count > 1 ? "The quotes" : "The quote",
                       trailing: vm.tenders.count > 1 ? "Swipe to compare" : nil)
                if vm.tenders.count == 1, let only = vm.tenders.first {
                    QuoteCard(
                        tender: only,
                        insight: vm.insights.perTender[only.id],
                        badges: badges(for: only.id),
                        isDeciding: vm.decidingTenderId == only.id,
                        hasAward: vm.hasAward,
                        onDetail: { detailTender = only },
                        onViewBuilder: { builderLink = BuilderProfileLink(id: only.builder.id, projectSlug: slug) },
                        onShortlist: { Task { await vm.shortlist(only) } },
                        onAward: { vm.pendingAward = only },
                        onReject: { Task { await vm.reject(only) } },
                        onReopen: { Task { await vm.reopen(only) } }
                    )
                } else {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 14) {
                            ForEach(vm.tenders) { t in
                                QuoteCard(
                                    tender: t,
                                    insight: vm.insights.perTender[t.id],
                                    badges: badges(for: t.id),
                                    isDeciding: vm.decidingTenderId == t.id,
                                    hasAward: vm.hasAward,
                                    onDetail: { detailTender = t },
                                    onViewBuilder: { builderLink = BuilderProfileLink(id: t.builder.id, projectSlug: slug) },
                                    onShortlist: { Task { await vm.shortlist(t) } },
                                    onAward: { vm.pendingAward = t },
                                    onReject: { Task { await vm.reject(t) } },
                                    onReopen: { Task { await vm.reopen(t) } }
                                )
                                .frame(width: 300)
                                .scrollTransition(.interactive, axis: .horizontal) { c, phase in
                                    c.opacity(1 - abs(phase.value) * 0.25)
                                        .scaleEffect(1 - abs(phase.value) * 0.04)
                                }
                            }
                        }
                        .scrollTargetLayout()
                        .padding(.horizontal, 2)
                    }
                    .scrollTargetBehavior(.viewAligned)
                }
            }
        }
    }

    /// Superlative badges a given tender has earned.
    private func badges(for id: String) -> [QuoteCard.Badge] {
        var out: [QuoteCard.Badge] = []
        if id == vm.insights.bestValueId { out.append(.init(text: "Best value", icon: "sparkles", tint: Palette.accent)) }
        if id == vm.insights.lowestPriceId { out.append(.init(text: "Lowest", icon: "arrow.down", tint: Palette.success)) }
        if id == vm.insights.fastestId { out.append(.init(text: "Fastest", icon: "bolt.fill", tint: Palette.accentLight)) }
        if id == vm.insights.mostTrustedId, vm.tenders.count > 1 {
            out.append(.init(text: "Most trusted", icon: "checkmark.shield.fill", tint: Palette.blue))
        }
        return out
    }

    // MARK: - Timeline

    @ViewBuilder
    private var timelineSection: some View {
        let rows: [TenderTimeline.Row] = vm.tenders.compactMap { t in
            guard let pt = vm.insights.perTender[t.id],
                  let s = pt.startMonthIndex, let e = pt.completionMonthIndex,
                  let label = pt.completionMonth else { return nil }
            return TenderTimeline.Row(
                id: t.id, initials: t.builder.initials, name: t.builder.displayName,
                startIndex: s, endIndex: e, completionLabel: label,
                isFastest: t.id == vm.insights.finishesFirstId
            )
        }
        if rows.count >= 1,
           let start = vm.insights.timelineStartIndex,
           let end = vm.insights.timelineEndIndex {
            revealed(5) {
                VStack(alignment: .leading, spacing: 14) {
                    Kicker("Timeline", trailing: "Start → handover")
                    TenderTimeline(rows: rows, axisStart: start, axisEnd: max(end, start + 1))
                }
                .padding(16)
                .cardSurface(.flat, radius: Radius.card)
            }
        }
    }

    // MARK: - Allocation (where the money goes)

    @ViewBuilder
    private var allocationSection: some View {
        let withAlloc = vm.tenders.filter { !(vm.insights.allocations[$0.id]?.isEmpty ?? true) }
        if !withAlloc.isEmpty {
            revealed(6) {
                VStack(alignment: .leading, spacing: 14) {
                    Kicker("Where the money goes")
                    VStack(spacing: 13) {
                        ForEach(withAlloc) { t in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(t.builder.displayName)
                                    .font(.system(size: 12.5, weight: .semibold))
                                    .foregroundStyle(Palette.text)
                                    .lineLimit(1)
                                PhaseAllocationBar(slices: vm.insights.allocations[t.id] ?? [])
                            }
                        }
                    }
                    phaseLegend(for: withAlloc)
                }
                .padding(16)
                .cardSurface(.flat, radius: Radius.card)
            }
        }
    }

    private func phaseLegend(for tenders: [OwnerTendersAPI.Tender]) -> some View {
        // Phases present across all shown allocations, in build order.
        var seen: [TradePhase] = []
        for t in tenders {
            for slice in vm.insights.allocations[t.id] ?? [] where !seen.contains(slice.phase) {
                seen.append(slice.phase)
            }
        }
        return FlexibleWrapCompare(spacing: 10, lineSpacing: 6) {
            ForEach(seen) { phase in
                HStack(spacing: 5) {
                    Circle().fill(PhaseStyle.color(phase)).frame(width: 7, height: 7)
                    Text(PhaseStyle.short(phase))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                }
            }
        }
    }

    // MARK: - Trade matrix

    private var tradeMatrixSection: some View {
        revealed(7) {
            VStack(alignment: .leading, spacing: 12) {
                Kicker("Trade by trade", trailing: vm.insights.cheapestOnMostTradesId != nil
                    ? "\(tender(vm.insights.cheapestOnMostTradesId!)?.builder.displayName ?? "") leads"
                    : nil)
                if !vm.insights.topDivergentTrades.isEmpty {
                    biggestGaps
                }
                TradeMatrix(
                    tenders: vm.tenders,
                    rows: vm.insights.tradeRows
                )
            }
        }
    }

    /// The handful of trades where the quotes diverge most — where the
    /// owner's scrutiny (or negotiation) pays off.
    private var biggestGaps: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("BIGGEST GAPS")
                .font(.system(size: 9, weight: .bold)).tracking(1.2)
                .foregroundStyle(Palette.textDim)
            ForEach(vm.insights.topDivergentTrades) { row in
                HStack(spacing: 10) {
                    Text(row.label)
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                        .frame(width: 110, alignment: .leading)
                    Text("\(TenderCompareViewModel.compactMoney(row.spread)) spread")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.warning)
                    Spacer(minLength: 6)
                    if let id = row.cheapestId, let t = tender(id) {
                        Text("\(t.builder.initials) cheapest")
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(Palette.accent)
                    }
                }
                .padding(.horizontal, 13).padding(.vertical, 9)
                .cardSurface(.flat, radius: Radius.control)
            }
        }
    }

    // MARK: - Exclusions

    private var exclusionsSection: some View {
        revealed(8) {
            VStack(alignment: .leading, spacing: 12) {
                let divergent = vm.insights.exclusions.filter(\.divergent).count
                Kicker("Exclusions", trailing: divergent > 0 ? "\(divergent) to check" : nil)
                if divergent > 0 {
                    Text("Items some builders exclude but others don't — worth clarifying so you're comparing like for like.")
                        .font(.system(size: 11.5, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                VStack(spacing: 8) {
                    ForEach(vm.insights.exclusions) { row in
                        exclusionRow(row)
                    }
                }
            }
        }
    }

    private func exclusionRow(_ row: TenderCompareViewModel.Insights.ExclusionRow) -> some View {
        HStack(spacing: 10) {
            Image(systemName: row.divergent ? "exclamationmark.triangle.fill" : "minus.circle.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(row.divergent ? Palette.warning : Palette.textDim)
            Text(row.text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .lineLimit(1)
            Spacer(minLength: 8)
            // Which builders exclude it (initials chips).
            HStack(spacing: 4) {
                ForEach(vm.tenders) { t in
                    Text(t.builder.initials)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(row.excludedBy.contains(t.id) ? Palette.accentContrast : Palette.textDim)
                        .frame(width: 20, height: 20)
                        .background(
                            Circle().fill(row.excludedBy.contains(t.id)
                                ? Palette.warning.opacity(0.9)
                                : Palette.surface)
                        )
                        .overlay(Circle().stroke(Palette.hairline, lineWidth: row.excludedBy.contains(t.id) ? 0 : 1))
                        .opacity(row.excludedBy.contains(t.id) ? 1 : 0.4)
                }
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .cardSurface(.flat, radius: Radius.control)
    }

    // MARK: - Helpers

    private func tender(_ id: String) -> OwnerTendersAPI.Tender? {
        vm.tenders.first { $0.id == id }
    }

    private func monthLabel(_ ym: String) -> String {
        let parts = ym.split(separator: "-")
        guard parts.count == 2, let m = Int(parts[1]) else { return ym }
        let names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        let mn = (1...12).contains(m) ? names[m] : ym
        return "\(mn) \(parts[0])"
    }

    private func bannerRow(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Palette.danger)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 12).fill(Palette.dangerMuted))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.danger.opacity(0.35), lineWidth: 1))
    }

    // MARK: - Celebration

    private func celebration(_ c: TenderCompareViewModel.AwardCelebration) -> some View {
        CelebrationScene(
            symbol: "trophy.fill",
            tone: .gold,
            titlePlain: "Tender",
            titleEmphasis: "awarded.",
            detail: c.builderName,
            subtitle: "We've let \(c.builderName) know. The other quotes were declined. Time to build.",
            metric: awardMetric(c),
            cta: CelebrationCTA(label: "Done", action: {
                showCelebration = false
                vm.awardCelebration = nil
                onClose()
            })
        )
    }

    private func awardMetric(_ c: TenderCompareViewModel.AwardCelebration) -> String? {
        var parts: [String] = []
        if let p = c.priceAud { parts.append(TenderCompareViewModel.fullMoney(p)) }
        if let w = c.durationWeeks { parts.append("\(w) wks") }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    // MARK: - Load / empty / error states

    private var loadingState: some View {
        VStack(spacing: 16) {
            ProgressView().tint(Palette.accent)
            Text("Gathering your tenders…")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.textMuted)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "paperplane")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Palette.accentLight)
            Text("No tenders yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text("Builders in your area are reviewing your project. You'll be notified the moment a tender lands.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
            Press(haptic: .tap, action: onClose) {
                Text("Back")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 24).frame(height: 46)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 12, y: 4)
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 28)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't load tenders")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
            HStack(spacing: 12) {
                Press(haptic: .tap, action: onClose) {
                    Text("Close")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .padding(.horizontal, 22).frame(height: 46)
                        .background(Capsule().fill(Palette.surface))
                        .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
                }
                Press(haptic: .tap) { Task { await vm.load() } } content: {
                    Text("Try again")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 22).frame(height: 46)
                        .background(Capsule().fill(Palette.accent))
                        .shadow(color: Palette.accentGlow, radius: 12, y: 4)
                }
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 28)
    }
}
