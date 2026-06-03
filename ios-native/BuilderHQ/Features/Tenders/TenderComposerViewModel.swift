/// TenderComposerViewModel — state for the builder's tender composer.
///
/// Lifecycle:
///   1. `load()` on appear → creates (or fetches) the draft tender for
///      the project slug, seeds the editable fields from it.
///   2. The view edits local `@Published`-style fields.
///   3. `saveDraft()` → PATCH the fields, stay in the composer.
///   4. `submit()` → PATCH the fields then POST submit. On success the
///      tender is locked and the detail screen refetches to show the
///      submitted state.
///
/// Required to submit (server-enforced): total price, duration,
/// validity. Everything else strengthens the bid but is optional.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class TenderComposerViewModel {
    let slug: String
    let projectTitle: String

    enum LoadState: Equatable {
        case loading
        case ready
        case error(message: String)
    }

    var loadState: LoadState = .loading
    var tenderId: String? = nil
    var status: String = "draft"

    // Editable fields.
    var priceText: String = ""        // raw digits, AUD
    var durationWeeksText: String = ""
    var validityDays: Int? = nil      // 7 / 14 / 30 / 60 / 90
    var startMonth: String? = nil     // "YYYY-MM"
    var pitch: String = ""
    var conditions: String = ""
    var exclusions: [String] = []

    /// Server projectId for the tender's project — needed to scope
    /// tender document uploads. Set from the draft payload.
    var projectId: String? = nil

    /// Optional itemized cost breakdown. Persisted via the cost-lines
    /// endpoint; the server auto-balances any remaining variance into
    /// an "other" line on submit, so this is never required.
    var costLines: [DraftCostLine] = []

    /// Tender document attachments (BoQ, insurance certs, drawings).
    /// In-session upload state — mirrors the publish wizard's pattern.
    var docs: [DocUpload] = []

    // In-flight + outcome state.
    var isSaving: Bool = false
    var isSubmitting: Bool = false
    var bannerError: String? = nil
    var didSubmit: Bool = false

    // MARK: - Quote scan (PDF auto-fill)

    /// Where the scan-a-quote flow is. Drives the immersive scanner
    /// overlay + the post-fill review banner.
    enum ScanPhase: Equatable {
        case idle
        case uploading
        case reading
        case done(filled: Int, warnings: [String])
        case failed(message: String)
    }
    var scanPhase: ScanPhase = .idle

    /// Fields the last scan populated — the form badges these with a
    /// subtle "from your quote" marker until the builder edits them.
    enum AutofillField: Hashable {
        case price, duration, validity, startMonth, pitch, conditions, exclusions, breakdown
    }
    var autofilledFields: Set<AutofillField> = []

    /// True while the immersive scanner overlay should be on screen.
    var isScanning: Bool {
        switch scanPhase {
        case .uploading, .reading: return true
        default: return false
        }
    }

    /// The allowed validity options, in days.
    static let validityOptions: [Int] = [7, 14, 30, 60, 90]

    // MARK: - Cost line + doc models

    struct DraftCostLine: Identifiable, Equatable {
        let id: UUID
        var trade: String       // canonical trade id
        var amountText: String  // raw digits
        var label: String       // required for trade == "other"

        var amount: Int? {
            let digits = amountText.filter(\.isNumber)
            guard !digits.isEmpty, let n = Int(digits) else { return nil }
            return n
        }
    }

    struct DocUpload: Identifiable, Equatable {
        let id: UUID
        let filename: String
        let contentType: String
        let sizeBytes: Int
        var state: State

        enum State: Equatable {
            case uploading(progress: Double)
            case completed(documentId: String)
            case failed(message: String)
        }
        var isCompleted: Bool {
            if case .completed = state { return true }
            return false
        }
    }

    init(slug: String, projectTitle: String) {
        self.slug = slug
        self.projectTitle = projectTitle
    }

    // MARK: - Derived

    var priceAud: Int? {
        let digits = priceText.filter(\.isNumber)
        guard !digits.isEmpty, let n = Int(digits), n > 0 else { return nil }
        return n
    }

    var durationWeeks: Int? {
        let digits = durationWeeksText.filter(\.isNumber)
        guard !digits.isEmpty, let n = Int(digits), (1...200).contains(n) else {
            return nil
        }
        return n
    }

    /// Client-side mirror of the server's submit gate so the CTA can
    /// enable/disable without a round-trip. Server re-validates.
    var canSubmit: Bool {
        priceAud != nil && durationWeeks != nil && validityDays != nil
    }

    /// Human list of what's still required — drives the helper text
    /// under the submit button.
    var missingForSubmit: [String] {
        var out: [String] = []
        if priceAud == nil { out.append("price") }
        if durationWeeks == nil { out.append("duration") }
        if validityDays == nil { out.append("validity") }
        return out
    }

    // MARK: - Breakdown derived

    /// Sum of all cost-line amounts entered.
    var breakdownTotal: Int {
        costLines.reduce(0) { $0 + ($1.amount ?? 0) }
    }

    /// Count of lines that carry a real amount — drives the summary
    /// chip on the composer ("6 lines · balanced").
    var breakdownLineCount: Int {
        costLines.filter { ($0.amount ?? 0) > 0 }.count
    }

    /// breakdownTotal − headline price. Positive = over, negative =
    /// under (remaining to allocate). Nil when there's no price yet.
    var breakdownVariance: Int? {
        guard let price = priceAud else { return nil }
        return breakdownTotal - price
    }

    /// True when there are lines and they sum exactly to the price.
    var breakdownBalanced: Bool {
        breakdownLineCount > 0 && breakdownVariance == 0
    }

    // MARK: - Load

    func load() async {
        loadState = .loading
        do {
            let draft = try await TendersAPI.createDraft(slug: slug)
            apply(draft)
            loadState = .ready
        } catch let error as APIError {
            loadState = .error(message: error.errorDescription
                ?? "Couldn't start your tender.")
        } catch {
            loadState = .error(message: "Couldn't start your tender.")
        }
    }

    private func apply(_ p: TendersAPI.Payload) {
        tenderId = p.id
        projectId = p.projectId
        status = p.status
        if let price = p.totalPriceAud { priceText = String(price) }
        if let weeks = p.durationWeeks { durationWeeksText = String(weeks) }
        validityDays = p.validityDays
        startMonth = p.proposedStartMonth
        pitch = p.pitch ?? ""
        conditions = p.conditions ?? ""
        exclusions = p.exclusions ?? []
        // Hydrate the breakdown from any persisted lines (resume).
        // Only seed once — don't clobber in-progress local edits on a
        // mid-session refresh (patch/submit responses re-call apply).
        if costLines.isEmpty, !p.costLines.isEmpty {
            costLines = p.costLines
                .sorted { $0.sortOrder < $1.sortOrder }
                .map {
                    DraftCostLine(
                        id: UUID(),
                        trade: $0.trade,
                        amountText: String($0.amountAud),
                        label: $0.label ?? ""
                    )
                }
        }
    }

    private func currentFields() -> TendersAPI.PatchFields {
        TendersAPI.PatchFields(
            totalPriceAud: priceAud,
            durationWeeks: durationWeeks,
            validityDays: validityDays,
            proposedStartMonth: startMonth,
            exclusions: exclusions.isEmpty ? nil : exclusions,
            conditions: conditions.trimmingCharacters(in: .whitespacesAndNewlines)
                .nilIfBlank,
            pitch: pitch.trimmingCharacters(in: .whitespacesAndNewlines)
                .nilIfBlank
        )
    }

    // MARK: - Save draft

    @discardableResult
    func saveDraft() async -> Bool {
        guard let id = tenderId else { return false }
        bannerError = nil
        isSaving = true
        defer { isSaving = false }
        do {
            let updated = try await TendersAPI.patch(id: id, fields: currentFields())
            apply(updated)
            try await persistCostLines(id: id)
            return true
        } catch let error as APIError {
            bannerError = error.errorDescription ?? "Couldn't save your tender."
            return false
        } catch {
            bannerError = "Couldn't save your tender."
            return false
        }
    }

    // MARK: - Submit

    func submit() async -> Bool {
        guard let id = tenderId else { return false }
        bannerError = nil
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            // Persist the latest field values + breakdown first, then
            // submit. The server auto-balances any remaining variance
            // into an "other" line at submit time.
            _ = try await TendersAPI.patch(id: id, fields: currentFields())
            try await persistCostLines(id: id)
            let submitted = try await TendersAPI.submit(id: id)
            apply(submitted)
            didSubmit = true
            return true
        } catch let error as APIError {
            bannerError = error.errorDescription
                ?? "Couldn't submit your tender. Check the required fields."
            return false
        } catch {
            bannerError = "Couldn't submit your tender. Try again."
            return false
        }
    }

    // MARK: - Cost lines

    /// PUT the current breakdown (lines with a real amount only). A
    /// no-op-friendly clear when empty. "other" lines get a fallback
    /// label so the server's "other requires a label" rule passes.
    private func persistCostLines(id: String) async throws {
        let lines: [TendersAPI.CostLineInput] = costLines.compactMap { line in
            guard let amount = line.amount, amount > 0 else { return nil }
            let isOther = line.trade == "other"
            let label = line.label.trimmingCharacters(in: .whitespacesAndNewlines)
            return TendersAPI.CostLineInput(
                trade: line.trade,
                amountAud: amount,
                label: isOther ? (label.isEmpty ? "Other" : label) : nil
            )
        }
        let updated = try await TendersAPI.putCostLines(id: id, lines: lines)
        // Keep the server's authoritative state but don't re-seed local
        // edits (apply guards costLines reseed on non-empty local set).
        status = updated.status
    }

    /// Add a line for `trade` if not already present (except "other",
    /// which can repeat). Returns the new/existing line id so the UI
    /// can focus its amount field.
    @discardableResult
    func addCostLine(trade: String) -> UUID {
        if trade != "other", let existing = costLines.first(where: { $0.trade == trade }) {
            return existing.id
        }
        let line = DraftCostLine(id: UUID(), trade: trade, amountText: "", label: "")
        costLines.append(line)
        return line.id
    }

    func removeCostLine(id: UUID) {
        costLines.removeAll { $0.id == id }
    }

    func updateCostLineAmount(id: UUID, amountText: String) {
        guard let idx = costLines.firstIndex(where: { $0.id == id }) else { return }
        costLines[idx].amountText = amountText.filter(\.isNumber)
    }

    func updateCostLineLabel(id: UUID, label: String) {
        guard let idx = costLines.firstIndex(where: { $0.id == id }) else { return }
        costLines[idx].label = String(label.prefix(80))
    }

    /// Add (or update) an "other" line so the breakdown sums exactly to
    /// the headline price. Mirrors the server's auto-balance, but lets
    /// the builder see + name it before submitting.
    func balanceRemainder() {
        guard let price = priceAud else { return }
        let remainder = price - breakdownTotal
        guard remainder != 0 else { return }
        if remainder > 0 {
            // Money still to allocate → add a "Balance" other line.
            let line = DraftCostLine(
                id: UUID(),
                trade: "other",
                amountText: String(remainder),
                label: "Balance"
            )
            costLines.append(line)
        }
        // If over (remainder < 0) we don't silently trim — the UI shows
        // the over-variance so the builder can fix it deliberately.
    }

    // MARK: - Tender documents

    /// Upload a file as a tender attachment. Returns the finalised
    /// server documentId on success (so callers like the quote scanner
    /// can hand it straight to the extractor), or nil on failure.
    @discardableResult
    func uploadDoc(filename: String, contentType: String, data: Data) async -> String? {
        guard let tenderId = tenderId, let projectId = projectId else {
            bannerError = "Couldn't attach the file. Try reopening the tender."
            return nil
        }
        let id = UUID()
        docs.append(
            DocUpload(
                id: id,
                filename: filename,
                contentType: contentType,
                sizeBytes: data.count,
                state: .uploading(progress: 0.05)
            )
        )
        do {
            let initRes = try await DocumentsAPI.initUpload(
                projectId: projectId,
                tenderId: tenderId,
                category: .other,
                filename: filename,
                contentType: contentType,
                sizeBytes: data.count
            )
            mutateDoc(id) { $0.state = .uploading(progress: 0.4) }
            try await DocumentsAPI.putToR2(
                uploadUrl: initRes.uploadUrl,
                uploadHeaders: initRes.uploadHeaders,
                fileData: data
            )
            mutateDoc(id) { $0.state = .uploading(progress: 0.85) }
            let finalised = try await DocumentsAPI.complete(
                projectId: projectId,
                tenderId: tenderId,
                documentId: initRes.documentId
            )
            mutateDoc(id) { $0.state = .completed(documentId: finalised.id) }
            return finalised.id
        } catch let error as APIError {
            mutateDoc(id) {
                $0.state = .failed(message: error.errorDescription ?? "Upload failed.")
            }
            return nil
        } catch {
            mutateDoc(id) { $0.state = .failed(message: "Upload failed.") }
            return nil
        }
    }

    func removeDoc(id: UUID) {
        docs.removeAll { $0.id == id }
    }

    private func mutateDoc(_ id: UUID, _ apply: (inout DocUpload) -> Void) {
        guard let idx = docs.firstIndex(where: { $0.id == id }) else { return }
        var copy = docs[idx]
        apply(&copy)
        docs[idx] = copy
    }

    // MARK: - Scan a quote (PDF → autofill)

    /// Upload a quote PDF (attaching it to the tender), then send it to
    /// the server's Claude extractor and prefill whatever it returns.
    /// Never clobbers fields the builder already filled — extraction is
    /// additive, and they review everything before submitting.
    func scanQuote(filename: String, contentType: String, data: Data) async {
        autofilledFields = []
        scanPhase = .uploading

        guard let documentId = await uploadDoc(
            filename: filename,
            contentType: contentType,
            data: data
        ) else {
            scanPhase = .failed(message: bannerError ?? "Couldn't upload that quote.")
            return
        }
        guard let id = tenderId else {
            scanPhase = .failed(message: "Couldn't read that quote. Try reopening the tender.")
            return
        }

        scanPhase = .reading
        do {
            let suggestions = try await TendersAPI.extract(id: id, documentId: documentId)
            let filled = applySuggestions(suggestions)
            scanPhase = .done(filled: filled, warnings: suggestions.warnings)
        } catch let error as APIError {
            scanPhase = .failed(
                message: error.errorDescription
                    ?? "Couldn't read that quote. Fill the form in below."
            )
        } catch {
            scanPhase = .failed(message: "Couldn't read that quote. Fill the form in below.")
        }
    }

    /// Apply extracted suggestions to empty fields only. Returns the
    /// count of distinct fields populated (drives the review banner).
    @discardableResult
    private func applySuggestions(_ s: TendersAPI.ExtractionSuggestions) -> Int {
        var filled = 0

        if priceAud == nil, let price = s.totalPriceAud, price > 0 {
            priceText = String(price)
            autofilledFields.insert(.price)
            filled += 1
        }
        if durationWeeks == nil, let weeks = s.durationWeeks, weeks > 0 {
            durationWeeksText = String(weeks)
            autofilledFields.insert(.duration)
            filled += 1
        }
        if validityDays == nil, let v = s.validityDays,
           Self.validityOptions.contains(v) {
            validityDays = v
            autofilledFields.insert(.validity)
            filled += 1
        }
        if startMonth == nil, let m = s.proposedStartMonth, !m.isEmpty {
            startMonth = m
            autofilledFields.insert(.startMonth)
            filled += 1
        }
        if pitch.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           let p = s.pitch, !p.isEmpty {
            pitch = p
            autofilledFields.insert(.pitch)
            filled += 1
        }
        if conditions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           let c = s.conditions, !c.isEmpty {
            conditions = c
            autofilledFields.insert(.conditions)
            filled += 1
        }
        if exclusions.isEmpty, !s.exclusions.isEmpty {
            exclusions = Array(s.exclusions.prefix(20)).map { String($0.prefix(80)) }
            autofilledFields.insert(.exclusions)
            filled += 1
        }
        if costLines.isEmpty, !s.costLines.isEmpty {
            costLines = s.costLines.prefix(60).map { line in
                let isOther = line.trade == "other"
                let label = String((line.label ?? "").prefix(80))
                return DraftCostLine(
                    id: UUID(),
                    trade: line.trade,
                    amountText: String(max(0, line.amountAud)),
                    label: isOther ? (label.isEmpty ? "Other" : label) : label
                )
            }
            autofilledFields.insert(.breakdown)
            filled += 1
        }

        return filled
    }

    /// Clear a field's "from your quote" badge once the builder edits it.
    func clearAutofill(_ field: AutofillField) {
        autofilledFields.remove(field)
    }

    /// Dismiss the scan result banner. Treated as "I've reviewed" — also
    /// clears the per-field highlight badges.
    func dismissScanReview() {
        autofilledFields = []
        switch scanPhase {
        case .done, .failed: scanPhase = .idle
        default: break
        }
    }

    // MARK: - Exclusions editing

    func addExclusion(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, exclusions.count < 20 else { return }
        let capped = String(trimmed.prefix(80))
        guard !exclusions.contains(capped) else { return }
        exclusions.append(capped)
    }

    func removeExclusion(_ value: String) {
        exclusions.removeAll { $0 == value }
    }
}

private extension String {
    var nilIfBlank: String? { isEmpty ? nil : self }
}
