/// BuilderWizardViewModel — the @Observable state holder behind the
/// 7-step builder onboarding wizard.
///
/// Responsibilities:
///   · Fetch the existing bundle on first load and decide which step
///     to land on (resume-from-lowest-incomplete, mirrors the web).
///   · Track the current step + direction-of-travel so the container
///     can animate forward / backward transitions.
///   · Hold local form state per step (ABN draft, address fields,
///     selected categories, draft service area, draft licence, about
///     bio + URLs).
///   · Wrap BuilderAPI calls + surface load + error state.
///
/// The view model is @Observable (iOS 17+). Each step view reads
/// what it needs via `@Bindable` projection on the view model.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class BuilderWizardViewModel {
    // MARK: - Step machine

    enum Step: Int, CaseIterable, Comparable {
        case company = 0
        case address
        case categories
        case serviceAreas
        case licences
        case about
        case review

        static func < (lhs: Step, rhs: Step) -> Bool {
            lhs.rawValue < rhs.rawValue
        }

        /// Short label shown beneath the headline ("01 / COMPANY").
        var label: String {
            switch self {
            case .company: return "Company"
            case .address: return "Address"
            case .categories: return "Project types"
            case .serviceAreas: return "Service areas"
            case .licences: return "Licences"
            case .about: return "About"
            case .review: return "Review"
            }
        }

        /// "01" … "07" — keeps the section indices in sync with the web
        /// wizard's numeric labels.
        var index: String {
            String(format: "%02d", rawValue + 1)
        }
    }

    enum Direction { case forward, backward }

    // MARK: - State

    /// Current step shown in the container. Defaults to .company; the
    /// hydrate() call may jump forward to a later step on resume.
    var step: Step = .company

    /// Last user-initiated direction-of-travel. Drives the asymmetric
    /// transition animation in BuilderWizard.
    var direction: Direction = .forward

    /// True until hydrate() has finished its first read.
    var isHydrating: Bool = true

    /// Server-side bundle (fetched on appear + refetched after each
    /// successful save so locks + verification chips stay in sync).
    var bundle: BuilderAPI.Bundle? = nil

    /// Generic top-level error banner displayed at the bottom of any
    /// step. Cleared on each step change.
    var bannerError: String? = nil

    /// Field-level validation errors keyed by JSON path (`abn`, `acn`,
    /// `companyName`, `licenceNumber`, etc.). Populated when the server
    /// returns a 400 with `details: { fieldName: message }`. Each step
    /// view reads its specific keys to surface inline errors instead of
    /// the generic banner.
    var fieldErrors: [String: String] = [:]

    // ── Step 01 — Company ────────────────────────────────────────────
    var abnDraft: String = ""
    var companyNameDraft: String = ""
    var tradingNameDraft: String = ""
    var acnDraft: String = ""
    var yearsInOperationDraft: String = ""
    /// Contact phone (raw, as typed). Required to leave step 1.
    /// Normalized to E.164 on save.
    var phoneDraft: String = ""
    var abnVerifyState: AbnVerifyState = .idle

    enum AbnVerifyState: Equatable {
        case idle
        case verifying
        case verified(matchedName: String)
        case failed(reason: String)
    }

    // ── Step 02 — Address ────────────────────────────────────────────
    var businessAddressLine1Draft: String = ""
    var businessPostcodeSelection: PostcodeSuburbField.Selection? = nil
    var hasDifferentPostal: Bool = false
    var postalAddressLine1Draft: String = ""
    var postalPostcodeSelection: PostcodeSuburbField.Selection? = nil

    // ── Step 03 — Categories ─────────────────────────────────────────
    var selectedCategories: Set<String> = []

    // ── Step 04 — Service areas ──────────────────────────────────────
    /// In-flight draft for the area being added. Once the user confirms
    /// it via "Add area", the row is appended to `draftServiceAreas`.
    /// The container submits the whole array on Continue.
    var draftServiceAreas: [BuilderAPI.ServiceAreaPayload] = []
    var areaDraftPostcode: PostcodeSuburbField.Selection? = nil
    var areaDraftRadiusKm: Double = 25

    // ── Step 05 — Licences ───────────────────────────────────────────
    var licences: [BuilderAPI.Licence] = []   // server snapshot
    /// Form state for the next licence to add.
    var licenceDraftState: String? = nil
    var licenceDraftType: String = ""
    var licenceDraftNumber: String = ""
    var licenceDraftHolderName: String = ""
    var licenceDraftIssuedAt: Date? = nil
    var licenceDraftExpiresAt: Date? = nil
    /// True while addLicence is in flight; locks the row form.
    var isAddingLicence: Bool = false

    // ── Step 06 — About ──────────────────────────────────────────────
    var bioDraft: String = ""
    var websiteDraft: String = ""
    var linkedinUrlDraft: String = ""
    var instagramUrlDraft: String = ""

    // ── Saving state ─────────────────────────────────────────────────
    /// Per-step saving flag drives the Continue button's spinner.
    var isSaving: Bool = false

    /// After Submit completes successfully, this holds the user so the
    /// container can hand it to AuthSession.didCompleteOnboarding(...).
    var completionUser: AuthSession.AuthUser? = nil

    // MARK: - Hydrate + resume

    /// Pull the bundle, seed the drafts from saved state, jump to the
    /// first incomplete step.
    func hydrate() async {
        isHydrating = true
        defer { isHydrating = false }

        do {
            let bundle = try await BuilderAPI.fetchBundle()
            self.bundle = bundle
            seedDraftsFromBundle()
            self.step = resumeStep(for: bundle)
        } catch {
            bannerError = friendlyMessage(error)
        }
    }

    /// Mirrors the web's lowest-incomplete pick. Returns the first step
    /// whose required state is missing. If everything is filled,
    /// returns `.review`.
    private func resumeStep(for bundle: BuilderAPI.Bundle) -> Step {
        let p = bundle.profile
        // Step 1 needs companyName + abn.
        if p == nil || (p?.companyName.isEmpty ?? true) || (p?.abn == nil) {
            return .company
        }
        // Step 2 is recommended-but-not-required; skip unless empty.
        // Treat any field present as "engaged enough" — only stop here
        // if the user has nothing yet.
        if (p?.businessAddressLine1 == nil) && (p?.businessSuburb == nil) {
            return .address
        }
        if bundle.categories.isEmpty { return .categories }
        if bundle.serviceAreas.isEmpty { return .serviceAreas }
        if bundle.licences.isEmpty { return .licences }
        return .review
    }

    private func seedDraftsFromBundle() {
        guard let bundle = bundle else { return }

        if let p = bundle.profile {
            abnDraft = p.abn ?? ""
            companyNameDraft = p.companyName
            tradingNameDraft = p.tradingName ?? ""
            acnDraft = p.acn ?? ""
            yearsInOperationDraft =
                p.yearsInOperation.map { String($0) } ?? ""
            businessAddressLine1Draft = p.businessAddressLine1 ?? ""
            if let postcode = p.businessPostcode,
               let suburb = p.businessSuburb,
               let state = p.businessState {
                businessPostcodeSelection = .init(
                    postcode: postcode,
                    suburb: suburb,
                    state: state
                )
            }
            hasDifferentPostal = p.hasDifferentPostal
            postalAddressLine1Draft = p.postalAddressLine1 ?? ""
            if let postcode = p.postalPostcode,
               let suburb = p.postalSuburb,
               let state = p.postalState {
                postalPostcodeSelection = .init(
                    postcode: postcode,
                    suburb: suburb,
                    state: state
                )
            }
            bioDraft = p.bio ?? ""
            websiteDraft = p.website ?? ""
            linkedinUrlDraft = p.linkedinUrl ?? ""
            instagramUrlDraft = p.instagramUrl ?? ""

            // ABN lock chip
            if bundle.lockState.abn, !abnDraft.isEmpty {
                abnVerifyState = .verified(matchedName: p.companyName)
            }
        }

        // Phone lives on the user row (top-level on the bundle), not
        // the builder profile. Seed it in friendly domestic form.
        if let storedPhone = bundle.phone, !storedPhone.isEmpty {
            phoneDraft = AuPhone.displayFromE164(storedPhone)
        }

        selectedCategories = Set(bundle.categories.map(\.category))
        draftServiceAreas = bundle.serviceAreas.map { area in
            .init(
                state: area.state,
                suburb: area.suburb,
                postcode: area.postcode,
                radiusKm: area.radiusKm
            )
        }
        licences = bundle.licences
    }

    // MARK: - Navigation

    func goBack() {
        guard let prev = Step(rawValue: step.rawValue - 1) else { return }
        bannerError = nil
        fieldErrors = [:]
        direction = .backward
        step = prev
    }

    func goForward() {
        guard let next = Step(rawValue: step.rawValue + 1) else { return }
        bannerError = nil
        fieldErrors = [:]
        direction = .forward
        step = next
    }

    /// Jumps the user back to step X (review screen "edit" affordances).
    func jump(to target: Step) {
        bannerError = nil
        fieldErrors = [:]
        direction = target < step ? .backward : .forward
        step = target
    }

    // MARK: - Save handlers per step

    /// Step 01 — company. We don't write the profile here unless the
    /// user already ran ABN-verify (which auto-applies). On Continue,
    /// patch trading name + ACN + years if the user filled them.
    func saveCompanyStep() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        fieldErrors = [:]
        isSaving = true
        defer { isSaving = false }

        // Years in operation: optional integer.
        var years: Int? = nil
        let trimmedYears = yearsInOperationDraft
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedYears.isEmpty {
            guard let n = Int(trimmedYears), (0...150).contains(n) else {
                fieldErrors["yearsInOperation"] =
                    "Must be a number between 0 and 150."
                return false
            }
            years = n
        }

        // Phone is required to leave step 1. Validate + normalize to
        // E.164 before sending.
        guard let phoneE164 = AuPhone.normalise(phoneDraft) else {
            fieldErrors["phone"] =
                "Enter a valid AU mobile or landline (e.g. 0412 345 678)."
            return false
        }

        // CompanyName + ABN are required to leave step 1. The ABN-verify
        // path auto-applies them. If the user typed companyName manually
        // (e.g. ABN couldn't verify) we send it through too.
        var patch: [String: Any?] = [
            "companyName": companyNameDraft.trimmingCharacters(
                in: .whitespacesAndNewlines
            ),
            "tradingName": tradingNameDraft.trimmingCharacters(
                in: .whitespacesAndNewlines
            ),
            "yearsInOperation": years,
            "phone": phoneE164,
        ]
        if !abnDraft.isEmpty {
            patch["abn"] = abnDraft.replacingOccurrences(of: " ", with: "")
        }
        if !acnDraft.isEmpty {
            patch["acn"] = acnDraft.replacingOccurrences(of: " ", with: "")
        }

        do {
            _ = try await BuilderAPI.patchProfile(patch)
            try await refreshBundle()
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    /// Step 02 — business + optional postal address.
    func saveAddressStep() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        isSaving = true
        defer { isSaving = false }

        var patch: [String: Any?] = [
            "businessAddressLine1": businessAddressLine1Draft.trimmingCharacters(
                in: .whitespacesAndNewlines
            ),
            "businessSuburb": businessPostcodeSelection?.suburb,
            "businessState": businessPostcodeSelection?.state,
            "businessPostcode": businessPostcodeSelection?.postcode,
            "hasDifferentPostal": hasDifferentPostal,
        ]
        if hasDifferentPostal {
            patch["postalAddressLine1"] = postalAddressLine1Draft
                .trimmingCharacters(in: .whitespacesAndNewlines)
            patch["postalSuburb"] = postalPostcodeSelection?.suburb
            patch["postalState"] = postalPostcodeSelection?.state
            patch["postalPostcode"] = postalPostcodeSelection?.postcode
        } else {
            patch["postalAddressLine1"] = nil
            patch["postalSuburb"] = nil
            patch["postalState"] = nil
            patch["postalPostcode"] = nil
        }

        do {
            _ = try await BuilderAPI.patchProfile(patch)
            try await refreshBundle()
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    /// Step 03 — project categories. Replace-all.
    func saveCategoriesStep() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        if selectedCategories.isEmpty {
            bannerError = "Pick at least one project type."
            return false
        }
        isSaving = true
        defer { isSaving = false }

        do {
            try await BuilderAPI.setCategories(Array(selectedCategories))
            try await refreshBundle()
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    /// Step 04 — service areas. Replace-all.
    func saveServiceAreasStep() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        if draftServiceAreas.isEmpty {
            bannerError = "Add at least one service area."
            return false
        }
        isSaving = true
        defer { isSaving = false }

        do {
            try await BuilderAPI.setServiceAreas(draftServiceAreas)
            try await refreshBundle()
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    /// Add the currently-drafted area to the local list (server save
    /// happens on Continue). UI clears the draft so the user can add
    /// the next one.
    func addDraftServiceArea() {
        guard let sel = areaDraftPostcode else { return }
        let payload = BuilderAPI.ServiceAreaPayload(
            state: sel.state,
            suburb: sel.suburb,
            postcode: sel.postcode,
            radiusKm: Int(areaDraftRadiusKm)
        )
        // Dedup by state+suburb.
        let key = "\(payload.state)|\(payload.suburb ?? "")"
        let exists = draftServiceAreas.contains { a in
            "\(a.state)|\(a.suburb ?? "")" == key
        }
        if !exists { draftServiceAreas.append(payload) }
        areaDraftPostcode = nil
        areaDraftRadiusKm = 25
    }

    func removeDraftServiceArea(at offsets: IndexSet) {
        draftServiceAreas.remove(atOffsets: offsets)
    }

    /// Step 05 — add one licence. Server returns the inserted row + the
    /// auto-verify outcome.
    func addLicence() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        guard let state = licenceDraftState else {
            bannerError = "Pick the state your licence is from."
            return false
        }
        let type = licenceDraftType.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        let number = licenceDraftNumber.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        if type.count < 2 {
            bannerError = "Licence type is required (e.g. 'Domestic Builder Unlimited')."
            return false
        }
        if number.count < 2 {
            bannerError = "Licence number is required."
            return false
        }

        isAddingLicence = true
        defer { isAddingLicence = false }

        let isoFormatter = ISO8601DateFormatter()
        do {
            let response = try await BuilderAPI.addLicence(
                state: state,
                licenceType: type,
                licenceNumber: number,
                licenceHolderName: licenceDraftHolderName
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                    .nilIfEmpty,
                issuedAt: licenceDraftIssuedAt.map(isoFormatter.string),
                expiresAt: licenceDraftExpiresAt.map(isoFormatter.string)
            )
            licences.append(response.licence)
            // Clear draft for the next add.
            licenceDraftState = nil
            licenceDraftType = ""
            licenceDraftNumber = ""
            licenceDraftHolderName = ""
            licenceDraftIssuedAt = nil
            licenceDraftExpiresAt = nil
            try? await refreshBundle()
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    func removeLicence(_ licence: BuilderAPI.Licence) async {
        do {
            try await BuilderAPI.removeLicence(id: licence.id)
            licences.removeAll { $0.id == licence.id }
            try? await refreshBundle()
        } catch {
            bannerError = friendlyMessage(error)
        }
    }

    /// Step 06 — about. Bio + 3 social URLs, all optional.
    func saveAboutStep() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        isSaving = true
        defer { isSaving = false }

        let patch: [String: Any?] = [
            "bio": bioDraft.trimmingCharacters(in: .whitespacesAndNewlines),
            "website": websiteDraft.trimmingCharacters(in: .whitespacesAndNewlines),
            "linkedinUrl": linkedinUrlDraft.trimmingCharacters(in: .whitespacesAndNewlines),
            "instagramUrl": instagramUrlDraft.trimmingCharacters(in: .whitespacesAndNewlines),
        ]
        do {
            _ = try await BuilderAPI.patchProfile(patch)
            try await refreshBundle()
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    /// Step 07 — submit for approval. On success we stash the fresh
    /// user so the container can flip AuthSession.
    func submitForApproval() async -> Bool {
        bannerError = nil
        fieldErrors = [:]
        isSaving = true
        defer { isSaving = false }

        do {
            let result = try await BuilderAPI.submit()
            completionUser = result.user
            return true
        } catch {
            handleSaveError(error)
            return false
        }
    }

    // MARK: - ABN verify

    func runAbnVerify() async {
        bannerError = nil
        fieldErrors = [:]
        let cleaned = abnDraft.replacingOccurrences(of: " ", with: "")
        if cleaned.count != 11 {
            abnVerifyState = .failed(reason: "ABN must be 11 digits.")
            return
        }
        abnVerifyState = .verifying
        do {
            let result = try await BuilderAPI.verifyAbn(cleaned)
            switch result {
            case .success(let v):
                abnVerifyState = .verified(matchedName: v.matchedName)
                // Reflect autofill in local drafts so the form shows
                // the freshly-saved values.
                companyNameDraft = v.autofill.legalEntityName
                if let acn = v.autofill.acn { acnDraft = acn }
                try? await refreshBundle()
            case .failure(let f):
                abnVerifyState = .failed(reason: f.reason)
            }
        } catch {
            abnVerifyState = .failed(reason: friendlyMessage(error))
        }
    }

    // MARK: - Helpers

    private func refreshBundle() async throws {
        let bundle = try await BuilderAPI.fetchBundle()
        self.bundle = bundle
        licences = bundle.licences
    }

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? "Something went wrong. Try again in a moment."
        }
        return "Something went wrong. Try again in a moment."
    }

    /// Centralised error handler for save/patch calls. Captures
    /// field-level errors so the step views can render them inline,
    /// and falls back to a banner when the failure is non-field
    /// (network, server error, etc.).
    ///
    /// Safety net: if the server returns field errors but NONE of those
    /// keys map to fields visible on the current step (e.g. step 1
    /// receives errors for `website`/`linkedinUrl`/`instagramUrl` from
    /// a merge-with-existing oddity), we ALSO surface them as a banner.
    /// Otherwise the user sees nothing and "Continue silently doesn't
    /// work" — exactly the failure mode this method was added to avoid.
    fileprivate func handleSaveError(_ error: Error) {
        if let apiError = error as? APIError,
           case .validation(let message, let errors) = apiError {
            fieldErrors = errors
            if errors.isEmpty {
                bannerError = message
            } else {
                let visibleKeys = visibleFieldKeysForCurrentStep
                let hasVisibleError = errors.keys.contains { visibleKeys.contains($0) }
                if hasVisibleError {
                    bannerError = nil
                } else {
                    // None of these errors will render against a field
                    // the user can see — show them as a banner instead.
                    let firstError = errors.first.map { "\($0.key): \($0.value)" }
                    bannerError = firstError ?? message
                }
            }
        } else {
            fieldErrors = [:]
            bannerError = friendlyMessage(error)
        }
    }

    /// The set of field keys each step is rendering against today.
    /// Keep in sync with the `error:` props passed to PremiumTextField
    /// / PostcodeSuburbField inside each step view.
    private var visibleFieldKeysForCurrentStep: Set<String> {
        switch step {
        case .company:
            return [
                "abn", "companyName", "tradingName", "acn", "yearsInOperation",
                "phone",
            ]
        case .address:
            return [
                "businessAddressLine1", "businessSuburb", "businessState",
                "businessPostcode", "postalAddressLine1", "postalSuburb",
                "postalState", "postalPostcode",
            ]
        case .categories:
            return ["categories"]
        case .serviceAreas:
            return ["areas", "serviceAreas"]
        case .licences:
            return [
                "state", "licenceType", "licenceNumber",
                "licenceHolderName", "issuedAt", "expiresAt",
            ]
        case .about:
            return ["bio", "website", "linkedinUrl", "instagramUrl"]
        case .review:
            return []
        }
    }
}

// MARK: - Small string helper

private extension String {
    /// Returns nil for empty strings; used to coerce optional URL /
    /// holder-name fields into null on the wire.
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
