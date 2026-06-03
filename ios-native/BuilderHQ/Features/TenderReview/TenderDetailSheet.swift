/// TenderDetailSheet — the full read of one builder's bid.
///
/// Opened from a quote card's "Details". Everything the comparison card
/// summarises, in full: the complete cost breakdown, every exclusion,
/// conditions, and the builder's pitch — so the owner can go as deep as
/// they want before deciding.

import SwiftUI

struct TenderDetailSheet: View {
    let tender: OwnerTendersAPI.Tender
    let slug: String
    let insight: TenderCompareViewModel.Insights.PerTender?
    let onClose: () -> Void

    @State private var builderLink: BuilderProfileLink? = nil

    // Tender attachments (BoQ, insurance, drawings…). Lazily loaded —
    // each carries a short-lived presigned URL we hand to the previewer.
    @State private var documents: [OwnerTendersAPI.Document] = []
    @State private var docsLoaded = false
    @State private var docsFailed = false
    @State private var preview: DocumentPreviewLink? = nil

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                grabberBar
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        header
                        viewProfileButton
                        priceBlock
                        statRow
                        keyFacts
                        if !tender.costLines.isEmpty { breakdown }
                        if let ex = tender.exclusions, !ex.isEmpty { exclusions(ex) }
                        if let c = tender.conditions, !c.isEmpty { textSection("Conditions", c) }
                        if let p = tender.pitch, !p.isEmpty { textSection("Builder's pitch", p) }
                        if tender.documentCount > 0 { documentsSection }
                        askFor
                        Spacer(minLength: 30)
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, 8)
                }
                .scrollIndicators(.hidden)
            }
        }
        .task { await loadDocuments() }
        .sheet(item: $builderLink) { link in
            BuilderProfileScreen(builderId: link.id, projectSlug: link.projectSlug)
                .presentationDetents([.large])
        }
        .sheet(item: $preview) { link in
            DocumentPreviewView(link: link)
        }
    }

    // ── documents (builder's tender attachments) ──
    @ViewBuilder
    private var documentsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Attached documents")
            if !docsLoaded && documents.isEmpty && !docsFailed {
                // Placeholder rows while the presigned URLs are minted.
                VStack(spacing: 8) {
                    ForEach(0..<min(tender.documentCount, 3), id: \.self) { _ in docSkeleton }
                }
            } else if docsFailed && documents.isEmpty {
                Press(haptic: .tap) { Task { await loadDocuments(force: true) } } content: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.clockwise").font(.system(size: 12, weight: .bold))
                        Text("Couldn't load documents — tap to retry").font(.system(size: 13, weight: .semibold))
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(Palette.warning)
                    .padding(.horizontal, 13).padding(.vertical, 12)
                    .cardSurface(.flat, radius: Radius.control)
                }
            } else {
                VStack(spacing: 8) {
                    ForEach(documents) { doc in docRow(doc) }
                }
            }
        }
    }

    private var docSkeleton: some View {
        HStack(spacing: 11) {
            RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Palette.surfaceElev)
                .frame(width: 38, height: 38)
            VStack(alignment: .leading, spacing: 5) {
                RoundedRectangle(cornerRadius: 4).fill(Palette.surfaceElev).frame(width: 150, height: 11)
                RoundedRectangle(cornerRadius: 4).fill(Palette.surfaceElev).frame(width: 80, height: 9)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 13).padding(.vertical, 11)
        .cardSurface(.flat, radius: Radius.control)
        .redacted(reason: .placeholder)
    }

    private func docRow(_ doc: OwnerTendersAPI.Document) -> some View {
        Press(haptic: .tap) {
            guard let urlString = doc.downloadUrl, let url = URL(string: urlString) else { return }
            preview = DocumentPreviewLink(url: url, filename: doc.filename)
        } content: {
            HStack(spacing: 11) {
                ZStack {
                    RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Palette.accentMuted)
                    Image(systemName: docIcon(doc.contentType))
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(Palette.accent)
                }
                .frame(width: 38, height: 38)
                VStack(alignment: .leading, spacing: 2) {
                    Text(doc.filename)
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text)
                        .lineLimit(1).truncationMode(.middle)
                    Text("\(prettyCategory(doc.category)) · \(prettySize(doc.sizeBytes))")
                        .font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim)
                }
                Spacer(minLength: 8)
                Image(systemName: "eye").font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.textMuted)
            }
            .padding(.horizontal, 13).padding(.vertical, 11)
            .cardSurface(.flat, radius: Radius.control)
        }
        .disabled(doc.downloadUrl == nil)
    }

    private func loadDocuments(force: Bool = false) async {
        guard tender.documentCount > 0 else { return }
        guard force || (!docsLoaded && documents.isEmpty) else { return }
        docsFailed = false
        do {
            documents = try await OwnerTendersAPI.listDocuments(tenderId: tender.id)
            docsLoaded = true
        } catch {
            docsFailed = true
        }
    }

    private func docIcon(_ contentType: String) -> String {
        if contentType.contains("pdf") { return "doc.fill" }
        if contentType.hasPrefix("image/") { return "photo.fill" }
        return "doc.text.fill"
    }

    private func prettyCategory(_ raw: String) -> String {
        switch raw {
        case "architectural": return "Architectural"
        case "structural_engineering": return "Structural"
        case "civil_engineering": return "Civil"
        case "specifications": return "Specifications"
        case "land_report": return "Land report"
        case "soil_report": return "Soil report"
        case "energy_rating": return "Energy rating"
        case "town_planning": return "Town planning"
        case "other": return "Document"
        default: return raw.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private func prettySize(_ bytes: Int) -> String {
        let kb = Double(bytes) / 1024
        if kb < 1024 { return "\(Int(kb.rounded())) KB" }
        return String(format: "%.1f MB", kb / 1024)
    }

    private var grabberBar: some View {
        HStack {
            Text("TENDER DETAIL")
                .font(.system(size: 10, weight: .bold)).tracking(2.0)
                .foregroundStyle(Palette.accent)
            Spacer()
            Press(haptic: .tap, action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 30, height: 30)
                    .background(Circle().fill(Palette.surface))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(.horizontal, 22).padding(.top, 16).padding(.bottom, 10)
    }

    // ── header ──
    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Palette.accentMuted)
                Text(tender.builder.initials)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Palette.accent)
            }
            .frame(width: 52, height: 52)
            VStack(alignment: .leading, spacing: 3) {
                Text(tender.builder.displayName)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    if tender.builder.abnVerified { chip("ABN verified", "checkmark.seal.fill", Palette.success) }
                    if tender.builder.anyLicenceVerified { chip("Licensed", "checkmark.seal.fill", Palette.success) }
                }
                if let y = tender.builder.yearsInOperation, y > 0 {
                    Text("\(y) year\(y == 1 ? "" : "s") in operation · \(tender.builder.awardedCount) past win\(tender.builder.awardedCount == 1 ? "" : "s")")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                }
            }
            Spacer(minLength: 0)
        }
    }

    private var viewProfileButton: some View {
        Press(haptic: .tap) { builderLink = BuilderProfileLink(id: tender.builder.id, projectSlug: slug) } content: {
            HStack(spacing: 6) {
                Image(systemName: "person.crop.circle").font(.system(size: 13, weight: .semibold))
                Text("View full profile").font(.system(size: 13, weight: .bold))
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold))
            }
            .foregroundStyle(Palette.accent)
            .frame(maxWidth: .infinity).frame(height: 42)
            .background(Capsule().fill(Palette.accentMuted))
            .overlay(Capsule().stroke(Palette.accent.opacity(0.3), lineWidth: 1))
        }
    }

    private func chip(_ text: String, _ icon: String, _ tint: Color) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 8, weight: .bold))
            Text(text).font(.system(size: 10, weight: .bold))
        }
        .foregroundStyle(tint)
    }

    // ── price ──
    private var priceBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("Total price")
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(tender.totalPriceAud.map { TenderCompareViewModel.fullMoney($0) } ?? "No price")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.text)
                Spacer()
            }
            if let delta = insight?.priceDeltaVsMedian, let pct = insight?.pricePctVsMedian, delta != 0 {
                let below = delta < 0
                Text("\(TenderCompareViewModel.compactMoney(abs(delta))) (\(Int(abs(pct)))%) \(below ? "below" : "above") the median quote")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(below ? Palette.success : Palette.warning)
            }
        }
    }

    // ── stats ──
    private var statRow: some View {
        HStack(spacing: 0) {
            cell("Build", tender.durationWeeks.map { "\($0) wks" } ?? "—")
            div
            cell("Valid", validity)
            div
            cell("Start", start)
        }
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: Radius.card).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.card).stroke(Palette.cardBorder, lineWidth: 1))
    }

    private var div: some View { Rectangle().fill(Palette.hairline).frame(width: 1, height: 28) }

    private func cell(_ l: String, _ v: String) -> some View {
        VStack(spacing: 3) {
            Text(l.uppercased()).font(.system(size: 9, weight: .bold)).tracking(1.0).foregroundStyle(Palette.textDim)
            Text(v).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Palette.text)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }

    private var validity: String {
        guard let days = insight?.expiryDaysRemaining else { return tender.validityDays.map { "\($0)d" } ?? "—" }
        if days < 0 { return "Expired" }
        if days == 0 { return "Today" }
        return "\(days)d left"
    }

    private var start: String {
        guard let m = tender.proposedStartMonth else { return "—" }
        let parts = m.split(separator: "-")
        guard parts.count == 2, let mi = Int(parts[1]) else { return m }
        let names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return (1...12).contains(mi) ? "\(names[mi]) \(parts[0])" : m
    }

    // ── key facts ──
    @ViewBuilder
    private var keyFacts: some View {
        let facts = buildFacts()
        if !facts.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                sectionLabel("Key facts")
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                    spacing: 10
                ) {
                    ForEach(facts, id: \.label) { f in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(f.label.uppercased())
                                .font(.system(size: 9, weight: .bold)).tracking(0.8)
                                .foregroundStyle(Palette.textDim)
                            Text(f.value)
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundStyle(f.tint)
                                .lineLimit(1).minimumScaleFactor(0.7)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 13).padding(.vertical, 11)
                        .cardSurface(.flat, radius: Radius.control)
                    }
                }
            }
        }
    }

    private func buildFacts() -> [(label: String, value: String, tint: Color)] {
        var out: [(String, String, Color)] = []
        if let sqm = insight?.pricePerSqm {
            out.append(("$/m²", "~\(TenderCompareViewModel.fullMoney(sqm))", Palette.text))
        }
        if let within = insight?.withinBudget {
            if within {
                out.append(("Budget", "Within", Palette.success))
            } else if let over = insight?.budgetOverAud {
                out.append(("Budget", "\(TenderCompareViewModel.compactMoney(over)) over", Palette.warning))
            }
        }
        let provPct = insight?.provisionalPct ?? 0
        out.append((
            "Provisional",
            provPct > 0 ? "\(Int((provPct * 100).rounded()))%" : "None",
            provPct >= 0.08 ? Palette.warning : Palette.text
        ))
        if let n = insight?.itemisedTradeCount, n > 0 {
            out.append(("Itemised", "\(n) trades", Palette.text))
        }
        if let done = insight?.completionMonth {
            out.append(("Completion", done, Palette.text))
        }
        return out
    }

    // ── ask the builder for (completeness gaps) ──
    @ViewBuilder
    private var askFor: some View {
        let missing = tender.completeness.missing
        if !missing.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                sectionLabel("Ask the builder for")
                VStack(spacing: 8) {
                    ForEach(missing, id: \.self) { item in
                        HStack(spacing: 9) {
                            Image(systemName: "questionmark.circle.fill")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Palette.accent)
                            Text(item)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Palette.text)
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 13).padding(.vertical, 11)
                        .cardSurface(.flat, radius: Radius.control)
                    }
                }
            }
        }
    }

    // ── breakdown ──
    private var breakdown: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Cost breakdown")
            VStack(spacing: 0) {
                ForEach(Array(sortedLines.enumerated()), id: \.element.id) { idx, line in
                    HStack {
                        Text(lineLabel(line))
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Palette.text)
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        Text(TenderCompareViewModel.fullMoney(line.amountAud))
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(Palette.text)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 11)
                    .background(idx % 2 == 1 ? Palette.surfaceElev.opacity(0.3) : Color.clear)
                }
                // Total.
                HStack {
                    Text("Itemised total")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.accent)
                    Spacer()
                    Text(TenderCompareViewModel.fullMoney(breakdownTotal))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.accent)
                }
                .padding(.horizontal, 14).padding(.vertical, 12)
                .background(Palette.accentMuted)
            }
            .background(RoundedRectangle(cornerRadius: Radius.card).fill(Palette.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.card).stroke(Palette.cardBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        }
    }

    private var sortedLines: [OwnerTendersAPI.CostLine] {
        tender.costLines.sorted {
            let a = TradeCatalog.order($0.trade), b = TradeCatalog.order($1.trade)
            return a != b ? a < b : $0.sortOrder < $1.sortOrder
        }
    }
    private var breakdownTotal: Int { tender.costLines.reduce(0) { $0 + $1.amountAud } }

    private func lineLabel(_ line: OwnerTendersAPI.CostLine) -> String {
        if line.trade == "other" {
            return line.label?.isEmpty == false ? line.label! : "Other"
        }
        return TradeCatalog.label(line.trade)
    }

    // ── exclusions ──
    private func exclusions(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Exclusions")
            FlexibleWrapCompare(spacing: 8, lineSpacing: 8) {
                ForEach(items, id: \.self) { item in
                    HStack(spacing: 5) {
                        Image(systemName: "minus.circle.fill").font(.system(size: 9, weight: .bold))
                        Text(item).font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 10).padding(.vertical, 7)
                    .background(Capsule().fill(Palette.surfaceElev))
                    .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
                }
            }
        }
    }

    private func textSection(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel(title)
            Text(body)
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold)).tracking(2.0)
            .foregroundStyle(Palette.textDim)
    }
}
