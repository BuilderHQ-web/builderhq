/// TenderCompareViewModel — state + insight engine for the owner's
/// tender comparison.
///
/// Loads the project's tenders (with cost lines + analytics) in one
/// call, then derives the comparison intelligence the owner actually
/// needs to decide: who's cheapest, fastest, most complete, most
/// trusted, the transparent "best value" pick, a trade-by-trade price
/// matrix, and an exclusions diff that surfaces hidden-cost risk.
///
/// Everything is count-agnostic — it reads identically for 1, 2, or 3
/// quotes (a project caps at 3, but nothing here assumes that).

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class TenderCompareViewModel {
    let slug: String
    let fallbackTitle: String

    enum LoadState: Equatable {
        case loading
        case ready
        case error(message: String)
    }

    var loadState: LoadState = .loading
    var projectTitle: String = ""
    var tenders: [OwnerTendersAPI.Tender] = []
    var analytics: OwnerTendersAPI.Analytics? = nil
    var project: OwnerTendersAPI.ProjectSpecs? = nil
    var insights: Insights = .empty

    // Decision flow.
    var decidingTenderId: String? = nil
    var bannerError: String? = nil
    /// Set to drive the award confirmation dialog.
    var pendingAward: OwnerTendersAPI.Tender? = nil
    /// Set to trigger the award celebration overlay.
    var awardCelebration: AwardCelebration? = nil

    struct AwardCelebration: Equatable {
        let builderName: String
        let priceAud: Int?
        let durationWeeks: Int?
    }

    init(slug: String, projectTitle: String) {
        self.slug = slug
        self.fallbackTitle = projectTitle
        self.projectTitle = projectTitle
    }

    // MARK: - Load

    func load() async {
        loadState = .loading
        await fetch()
    }

    func reload() async {
        await fetch()
    }

    private func fetch() async {
        do {
            let res = try await OwnerTendersAPI.list(slug: slug)
            projectTitle = res.projectTitle.isEmpty ? fallbackTitle : res.projectTitle
            // Stable display order: submitted (live) first, then by price
            // ascending (cheapest first) so the eye lands on value.
            tenders = res.tenders.sorted { lhs, rhs in
                let l = lhs.totalPriceAud ?? Int.max
                let r = rhs.totalPriceAud ?? Int.max
                return l < r
            }
            analytics = res.analytics
            project = res.project
            insights = Insights.compute(tenders: tenders, analytics: res.analytics, project: res.project)
            loadState = .ready
        } catch let error as APIError {
            loadState = .error(message: error.errorDescription ?? "Couldn't load tenders.")
        } catch {
            loadState = .error(message: "Couldn't load tenders.")
        }
    }

    // MARK: - Decisions

    /// True once a builder has been awarded on this project — locks the
    /// other tenders' primary actions.
    var hasAward: Bool {
        tenders.contains { $0.status == "awarded" }
    }

    var liveCount: Int {
        tenders.filter { $0.status == "submitted" || $0.status == "shortlisted" }.count
    }

    func shortlist(_ tender: OwnerTendersAPI.Tender) async {
        await runDecision(tender, action: .shortlist)
    }

    func reject(_ tender: OwnerTendersAPI.Tender) async {
        await runDecision(tender, action: .reject)
    }

    func reopen(_ tender: OwnerTendersAPI.Tender) async {
        await runDecision(tender, action: .reopen)
    }

    /// Award — always rejects the other live tenders (a project has one
    /// winner). Triggers the celebration on success.
    func award(_ tender: OwnerTendersAPI.Tender) async {
        await runDecision(tender, action: .award, rejectOthers: true)
        if decidingTenderId == nil, bannerError == nil,
           tenders.first(where: { $0.id == tender.id })?.status == "awarded" {
            awardCelebration = AwardCelebration(
                builderName: tender.builder.displayName,
                priceAud: tender.totalPriceAud,
                durationWeeks: tender.durationWeeks
            )
        }
    }

    private func runDecision(
        _ tender: OwnerTendersAPI.Tender,
        action: OwnerTendersAPI.Decision,
        rejectOthers: Bool? = nil
    ) async {
        bannerError = nil
        decidingTenderId = tender.id
        defer { decidingTenderId = nil }
        do {
            _ = try await OwnerTendersAPI.decide(
                tenderId: tender.id,
                action: action,
                rejectOthers: rejectOthers
            )
            // Refetch the full list so statuses + analytics + any
            // cascade-rejected siblings are all consistent.
            await fetch()
        } catch let error as APIError {
            bannerError = error.errorDescription ?? "Couldn't update that tender."
        } catch {
            bannerError = "Couldn't update that tender."
        }
    }

    // MARK: - Money formatting (shared by the screen)

    static func compactMoney(_ n: Int) -> String {
        if n >= 1_000_000 {
            let m = Double(n) / 1_000_000
            return String(format: m.truncatingRemainder(dividingBy: 1) == 0 ? "$%.0fM" : "$%.2fM", m)
        }
        if n >= 1_000 {
            return "$\(Int((Double(n) / 1000).rounded()))k"
        }
        return "$\(n)"
    }

    static func fullMoney(_ n: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return "$\(f.string(from: NSNumber(value: n)) ?? "\(n)")"
    }
}

// MARK: - Insights engine (pure)

extension TenderCompareViewModel {
    struct Insights: Equatable {
        /// tenderId → per-tender derived figures.
        var perTender: [String: PerTender] = [:]
        /// Superlative → winning tenderId.
        var lowestPriceId: String? = nil
        var fastestId: String? = nil
        var soonestStartId: String? = nil
        var mostCompleteId: String? = nil
        var mostTrustedId: String? = nil
        /// Transparent composite pick + the reasons behind it.
        var bestValueId: String? = nil
        var bestValueReasons: [String] = []
        /// Trade-by-trade matrix (only trades at least one builder itemised).
        var tradeRows: [TradeRow] = []
        var cheapestOnMostTradesId: String? = nil
        /// The trades where quotes diverge most (top spreads), for the
        /// "biggest gaps" callout.
        var topDivergentTrades: [TradeRow] = []
        /// Exclusions across all tenders, with divergence flagged.
        var exclusions: [ExclusionRow] = []

        // ── money / time superlatives ──
        var bestPerSqmId: String? = nil
        var finishesFirstId: String? = nil
        /// Per-tender phase allocation (where the money goes).
        var allocations: [String: [PhaseSlice]] = [:]
        /// Shared timeline axis bounds (month indices) across all tenders
        /// that gave a start month.
        var timelineStartIndex: Int? = nil
        var timelineEndIndex: Int? = nil

        static let empty = Insights()

        struct PerTender: Equatable {
            /// Signed delta vs the median price (negative = below median).
            var priceDeltaVsMedian: Int? = nil
            var pricePctVsMedian: Double? = nil
            /// Days until this quote's price expires (submitted + validity).
            /// Negative = already expired. Nil = no validity given.
            var expiryDaysRemaining: Int? = nil
            /// 0–100 trust score (verification + tenure + track record).
            var trustScore: Int = 0
            /// How many trades this builder is the cheapest on.
            var cheapestTradeCount: Int = 0

            // ── money ──
            /// Approx $/m² (price ÷ build-size midpoint). Nil when build
            /// size is unknown.
            var pricePerSqm: Int? = nil
            /// nil = no budget set; true/false = within the budget ceiling.
            var withinBudget: Bool? = nil
            /// Amount over the budget ceiling (nil when within / unknown).
            var budgetOverAud: Int? = nil
            /// Provisional/PC-sum exposure — dollars + share of the
            /// itemised breakdown (0–1).
            var provisionalAud: Int = 0
            var provisionalPct: Double = 0
            /// Price sits well outside the pack (e.g. >1.5× median).
            var isOutlier: Bool = false

            // ── quality ──
            /// Distinct trades the builder itemised.
            var itemisedTradeCount: Int = 0

            // ── timeline ──
            /// "YYYY-MM" estimated completion (start + duration).
            var completionMonth: String? = nil
            /// Month indices (year*12 + month) for the shared timeline axis.
            var startMonthIndex: Int? = nil
            var completionMonthIndex: Int? = nil
        }

        /// One phase's slice of a builder's itemised breakdown.
        struct PhaseSlice: Equatable, Identifiable {
            let phase: TradePhase
            let amount: Int
            let fraction: Double   // 0–1 of the tender's itemised total
            var id: String { phase.rawValue }
        }

        struct TradeRow: Equatable, Identifiable {
            let trade: String
            let label: String
            /// tenderId → amount (absent = builder didn't itemise it).
            let amounts: [String: Int]
            let cheapestId: String?
            let spread: Int
            var id: String { trade }
        }

        struct ExclusionRow: Equatable, Identifiable {
            let text: String
            /// tenderIds that exclude this item.
            let excludedBy: Set<String>
            /// True when some (but not all) tenders exclude it — the
            /// apples-to-apples risk worth flagging.
            let divergent: Bool
            var id: String { text }
        }

        static func compute(
            tenders: [OwnerTendersAPI.Tender],
            analytics: OwnerTendersAPI.Analytics,
            project: OwnerTendersAPI.ProjectSpecs?
        ) -> Insights {
            var out = Insights()
            guard !tenders.isEmpty else { return out }

            let median = analytics.price.median
            let buildMidpoint = BandScale.buildSizeMidpoint(project?.buildSizeBand)
            let budget = BandScale.budgetRange(project?.budgetBand)

            // ── superlatives ──
            out.lowestPriceId = tenders
                .filter { $0.totalPriceAud != nil }
                .min { ($0.totalPriceAud ?? .max) < ($1.totalPriceAud ?? .max) }?.id
            out.fastestId = tenders
                .filter { $0.durationWeeks != nil }
                .min { ($0.durationWeeks ?? .max) < ($1.durationWeeks ?? .max) }?.id
            out.soonestStartId = tenders
                .filter { $0.proposedStartMonth != nil }
                .min { ($0.proposedStartMonth ?? "9999") < ($1.proposedStartMonth ?? "9999") }?.id
            out.mostCompleteId = tenders
                .max { $0.completeness.score < $1.completeness.score }?.id

            // ── trade matrix ──
            let tradesPresent = orderedTrades(in: tenders)
            var cheapestCounts: [String: Int] = [:]
            var rows: [TradeRow] = []
            for trade in tradesPresent {
                var amounts: [String: Int] = [:]
                for t in tenders {
                    if let line = t.costLines.first(where: { $0.trade == trade }) {
                        // Sum repeats (e.g. multiple "other" lines) defensively.
                        amounts[t.id, default: 0] += line.amountAud
                    }
                }
                let values = amounts.values
                let cheapest = amounts.min { $0.value < $1.value }
                if let cheapestId = cheapest?.key, amounts.count > 1 {
                    cheapestCounts[cheapestId, default: 0] += 1
                }
                let spread = (values.max() ?? 0) - (values.min() ?? 0)
                rows.append(
                    TradeRow(
                        trade: trade,
                        label: TradeCatalog.label(trade),
                        amounts: amounts,
                        cheapestId: amounts.count > 1 ? cheapest?.key : nil,
                        spread: spread
                    )
                )
            }
            out.tradeRows = rows
            out.cheapestOnMostTradesId = cheapestCounts.max { $0.value < $1.value }?.key

            // ── per-tender derived ──
            var perTender: [String: PerTender] = [:]
            var allocations: [String: [PhaseSlice]] = [:]
            for t in tenders {
                var pt = PerTender()
                if let price = t.totalPriceAud, let med = median, med > 0 {
                    pt.priceDeltaVsMedian = price - med
                    pt.pricePctVsMedian = Double(price - med) / Double(med) * 100
                }
                pt.expiryDaysRemaining = expiryDays(submittedIso: t.submittedAtIso, validityDays: t.validityDays)
                pt.trustScore = trustScore(t.builder)
                pt.cheapestTradeCount = cheapestCounts[t.id] ?? 0

                // Money: $/m², budget, provisional exposure.
                if let price = t.totalPriceAud, let mid = buildMidpoint, mid > 0 {
                    pt.pricePerSqm = Int((Double(price) / mid).rounded())
                }
                if let price = t.totalPriceAud, let b = budget, let ceiling = b.high {
                    pt.withinBudget = price <= ceiling
                    pt.budgetOverAud = price > ceiling ? price - ceiling : nil
                } else if budget != nil {
                    pt.withinBudget = true  // open-ended top band → always within
                }
                let breakdownTotal = t.costLines.reduce(0) { $0 + $1.amountAud }
                let provisional = t.costLines
                    .filter { $0.trade == "special_provisions" }
                    .reduce(0) { $0 + $1.amountAud }
                pt.provisionalAud = provisional
                pt.provisionalPct = breakdownTotal > 0 ? Double(provisional) / Double(breakdownTotal) : 0

                // Quality: itemisation depth.
                pt.itemisedTradeCount = Set(t.costLines.map(\.trade)).count

                // Timeline: estimated completion.
                if let startIdx = monthIndex(t.proposedStartMonth) {
                    pt.startMonthIndex = startIdx
                    if let weeks = t.durationWeeks {
                        let months = Int((Double(weeks) / 4.345).rounded(.up))
                        let endIdx = startIdx + max(1, months)
                        pt.completionMonthIndex = endIdx
                        pt.completionMonth = monthLabel(endIdx)
                    }
                }

                perTender[t.id] = pt
                allocations[t.id] = phaseSlices(for: t)
            }

            // Outlier: price well above the pack (needs ≥3 to be meaningful).
            if tenders.count >= 3, let med = median, med > 0 {
                for t in tenders {
                    if let price = t.totalPriceAud, Double(price) > Double(med) * 1.5 {
                        perTender[t.id]?.isOutlier = true
                    }
                }
            }
            out.perTender = perTender
            out.allocations = allocations

            out.mostTrustedId = tenders
                .max { (perTender[$0.id]?.trustScore ?? 0) < (perTender[$1.id]?.trustScore ?? 0) }?.id
            out.bestPerSqmId = tenders
                .filter { perTender[$0.id]?.pricePerSqm != nil }
                .min { (perTender[$0.id]?.pricePerSqm ?? .max) < (perTender[$1.id]?.pricePerSqm ?? .max) }?.id
            out.finishesFirstId = tenders
                .filter { perTender[$0.id]?.completionMonthIndex != nil }
                .min { (perTender[$0.id]?.completionMonthIndex ?? .max) < (perTender[$1.id]?.completionMonthIndex ?? .max) }?.id

            // Shared timeline axis bounds.
            let starts = perTender.values.compactMap(\.startMonthIndex)
            let ends = perTender.values.compactMap(\.completionMonthIndex)
            out.timelineStartIndex = starts.min()
            out.timelineEndIndex = ends.max()

            // Biggest divergences (top spreads, multi-builder rows only).
            out.topDivergentTrades = rows
                .filter { $0.amounts.count > 1 && $0.spread > 0 }
                .sorted { $0.spread > $1.spread }
                .prefix(3)
                .map { $0 }

            // ── best value (transparent composite) ──
            let (bvId, reasons) = bestValue(
                tenders: tenders, analytics: analytics, perTender: perTender,
                lowestPriceId: out.lowestPriceId, fastestId: out.fastestId,
                mostCompleteId: out.mostCompleteId
            )
            out.bestValueId = bvId
            out.bestValueReasons = reasons

            // ── exclusions diff ──
            out.exclusions = exclusionRows(tenders: tenders)

            return out
        }

        // ── helpers ──

        private static func orderedTrades(in tenders: [OwnerTendersAPI.Tender]) -> [String] {
            var seen = Set<String>()
            for t in tenders {
                for l in t.costLines { seen.insert(l.trade) }
            }
            return seen.sorted { TradeCatalog.order($0) < TradeCatalog.order($1) }
        }

        /// "YYYY-MM" → absolute month index (year*12 + month-1).
        private static func monthIndex(_ ym: String?) -> Int? {
            guard let ym else { return nil }
            let parts = ym.split(separator: "-")
            guard parts.count == 2, let y = Int(parts[0]), let m = Int(parts[1]),
                  (1...12).contains(m) else { return nil }
            return y * 12 + (m - 1)
        }

        /// Absolute month index → "MMM YYYY" (e.g. "Mar 2027").
        static func monthLabel(_ index: Int) -> String {
            let names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            let year = index / 12
            let month = index % 12
            return "\(names[month]) \(year)"
        }

        /// Group a tender's cost lines into build-phase slices, sorted by
        /// build sequence, each with its fraction of the itemised total.
        private static let phaseOrder: [TradePhase] = [
            .siteStructure, .envelope, .finishes, .services, .external, .other,
        ]
        private static func phaseSlices(for tender: OwnerTendersAPI.Tender) -> [PhaseSlice] {
            let total = tender.costLines.reduce(0) { $0 + $1.amountAud }
            guard total > 0 else { return [] }
            var byPhase: [TradePhase: Int] = [:]
            for line in tender.costLines {
                byPhase[TradeCatalog.phase(line.trade), default: 0] += line.amountAud
            }
            return phaseOrder.compactMap { phase in
                guard let amount = byPhase[phase], amount > 0 else { return nil }
                return PhaseSlice(phase: phase, amount: amount, fraction: Double(amount) / Double(total))
            }
        }

        private static func expiryDays(submittedIso: String?, validityDays: Int?) -> Int? {
            guard let iso = submittedIso, let days = validityDays else { return nil }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let date = formatter.date(from: iso) ?? {
                let f2 = ISO8601DateFormatter()
                f2.formatOptions = [.withInternetDateTime]
                return f2.date(from: iso)
            }()
            guard let submitted = date else { return nil }
            let expiry = submitted.addingTimeInterval(Double(days) * 86_400)
            let secs = expiry.timeIntervalSinceNow
            return Int((secs / 86_400).rounded())
        }

        /// 0–100. ABN (35) + any licence (25) + tenure (up to 20) +
        /// awarded track record (up to 20).
        private static func trustScore(_ b: OwnerTendersAPI.Builder) -> Int {
            var s = 0
            if b.abnVerified { s += 35 }
            if b.anyLicenceVerified { s += 25 }
            s += min(20, (b.yearsInOperation ?? 0) * 2)
            s += min(20, b.awardedCount * 7)
            return min(100, s)
        }

        private static func bestValue(
            tenders: [OwnerTendersAPI.Tender],
            analytics: OwnerTendersAPI.Analytics,
            perTender: [String: PerTender],
            lowestPriceId: String?,
            fastestId: String?,
            mostCompleteId: String?
        ) -> (String?, [String]) {
            guard tenders.count > 1 else {
                return (tenders.first?.id, [])
            }
            let prices = tenders.compactMap { $0.totalPriceAud }
            let minP = Double(prices.min() ?? 0)
            let maxP = Double(prices.max() ?? 0)
            let durations = tenders.compactMap { $0.durationWeeks }
            let minD = Double(durations.min() ?? 0)
            let maxD = Double(durations.max() ?? 0)

            func norm(_ v: Double, _ lo: Double, _ hi: Double, invert: Bool) -> Double {
                guard hi > lo else { return 0.5 }
                let n = (v - lo) / (hi - lo)
                return invert ? 1 - n : n
            }

            var best: (id: String, score: Double)? = nil
            for t in tenders {
                // Only rank live tenders as "best value".
                guard t.status == "submitted" || t.status == "shortlisted" else { continue }
                let priceScore = t.totalPriceAud.map { norm(Double($0), minP, maxP, invert: true) } ?? 0.5
                let durScore = t.durationWeeks.map { norm(Double($0), minD, maxD, invert: true) } ?? 0.5
                let completeScore = t.completeness.score
                let trustS = Double(perTender[t.id]?.trustScore ?? 0) / 100
                // Price-led, but value isn't just cheapest.
                let score = priceScore * 0.45
                    + completeScore * 0.20
                    + trustS * 0.20
                    + durScore * 0.15
                if best == nil || score > best!.score {
                    best = (t.id, score)
                }
            }
            guard let winnerId = best?.id,
                  let winner = tenders.first(where: { $0.id == winnerId }) else {
                return (nil, [])
            }

            var reasons: [String] = []
            if winnerId == lowestPriceId { reasons.append("Lowest price") }
            else if let pct = perTender[winnerId]?.pricePctVsMedian, pct < 0 {
                reasons.append("\(Int(-pct))% below median price")
            }
            if winnerId == fastestId { reasons.append("Fastest build") }
            if winner.completeness.score >= 0.9 { reasons.append("Fully itemised quote") }
            else if winnerId == mostCompleteId { reasons.append("Most complete quote") }
            if winner.builder.abnVerified && winner.builder.anyLicenceVerified {
                reasons.append("ABN + licence verified")
            } else if winner.builder.abnVerified {
                reasons.append("ABN verified")
            }
            if winner.builder.awardedCount > 0 {
                reasons.append("\(winner.builder.awardedCount) past win\(winner.builder.awardedCount == 1 ? "" : "s")")
            }
            return (winnerId, Array(reasons.prefix(3)))
        }

        private static func exclusionRows(tenders: [OwnerTendersAPI.Tender]) -> [ExclusionRow] {
            // Normalise on lowercased text to merge "Landscaping" vs
            // "landscaping"; keep the first-seen original for display.
            var display: [String: String] = [:]
            var byKey: [String: Set<String>] = [:]
            for t in tenders {
                for raw in (t.exclusions ?? []) {
                    let key = raw.lowercased().trimmingCharacters(in: .whitespaces)
                    guard !key.isEmpty else { continue }
                    if display[key] == nil { display[key] = raw }
                    byKey[key, default: []].insert(t.id)
                }
            }
            let total = tenders.count
            return byKey
                .map { key, ids in
                    ExclusionRow(
                        text: display[key] ?? key,
                        excludedBy: ids,
                        divergent: ids.count < total && total > 1
                    )
                }
                // Divergent (risk) first, then by how many exclude it.
                .sorted {
                    if $0.divergent != $1.divergent { return $0.divergent && !$1.divergent }
                    return $0.excludedBy.count > $1.excludedBy.count
                }
        }
    }
}
