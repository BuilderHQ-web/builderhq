/// ProjectPublishViewModel — state holder for the publish wizard.
///
/// Tracks the in-progress `ProjectDraft` + the current step + direction
/// of travel (for transition animations). Single source of truth that
/// every step view + the LivePreviewCard subscribe to via `@Bindable`.
///
/// Conventions match BuilderWizardViewModel (auth wizard) for
/// consistency: enum-driven step machine, direction-of-travel for
/// asymmetric transitions, isSaving flag for the publish CTA.

import Foundation
import Observation
import SwiftUI

/// In-progress project state. Built up step by step as the user
/// answers wizard questions. Mirrors the shape the server's
/// PublishRequest expects on submit.
struct ProjectDraft: Equatable {
    var type: String? = nil

    // Title + description
    var title: String = ""
    var description: String = ""

    // Location — wraps PostcodeSuburbField's selection so we can ALSO
    // capture an optional street address line.
    struct Location: Equatable {
        var addressLine1: String = ""
        var postcode: String
        var suburb: String
        var state: String
    }
    var location: Location? = nil

    // Specs
    var bedrooms: Int? = nil
    var bathrooms: Int? = nil
    var floors: Int? = nil
    var landSizeBand: String? = nil
    var buildSizeBand: String? = nil

    // Type-specific
    var dwellingCount: Int? = nil
    var renovationScopeTags: [String] = []
    var existingAgeBand: String? = nil
    var extensionType: String? = nil
    var extensionSizeBand: String? = nil

    // Budget + timeline
    var budgetBand: String? = nil
    var targetStartMonth: String? = nil
    var targetCompletionMonth: String? = nil
}

@Observable
@MainActor
final class ProjectPublishViewModel {
    enum Step: Int, CaseIterable, Comparable {
        case type = 0
        case location
        case specs
        case budgetTimeline
        case titleDescription
        case documents
        case review

        static func < (lhs: Step, rhs: Step) -> Bool {
            lhs.rawValue < rhs.rawValue
        }

        var index: String { String(format: "%02d", rawValue + 1) }
    }

    enum Direction { case forward, backward }

    var step: Step = .type
    var direction: Direction = .forward
    var draft: ProjectDraft = .init()
    var isSaving: Bool = false
    var bannerError: String? = nil

    // MARK: - Start mode + AI plan scan

    /// How the owner chose to begin: fill the form themselves, or upload
    /// architectural plans and let Claude pre-fill it. `nil` until they
    /// pick on the intro screen.
    enum StartMode: Equatable { case manual, ai }
    var mode: StartMode? = nil

    /// State of the plan-scan round-trip (AI path only).
    enum ScanPhase: Equatable {
        case idle
        case reading
        case done(filled: Int)
        case failed(message: String)
    }
    var scanPhase: ScanPhase = .idle

    /// True while the immersive scanner overlay should be on screen.
    var isScanning: Bool {
        if case .reading = scanPhase { return true }
        return false
    }

    /// Flips true once the AI scan finishes (or is skipped) so the
    /// wizard advances from the scan screen into the step flow.
    var planScanComplete: Bool = false

    /// Drives the "filled from your plans — review each step" banner that
    /// rides above the wizard until the owner dismisses it.
    var showPlanReview: Bool = false
    /// Count of fields the scan populated (for the banner copy).
    var planFilledCount: Int = 0

    /// The plan PDF the owner picked for the AI scan, stashed so it can
    /// be attached as a project document automatically once the draft is
    /// created (the docs step). Cleared after it attaches.
    struct PickedPlan: Equatable {
        let filename: String
        let contentType: String
        let data: Data
    }
    var pickedPlan: PickedPlan? = nil
    private var planAttached: Bool = false
    var publishedProject: ProjectsAPI.PublishResponse.Project? = nil
    /// `true` when the server fell back to "saved as draft" on the
    /// final publish call (e.g. owner skipped architectural plans).
    /// Drives the celebration copy.
    var savedAsDraft: Bool = false

    // MARK: - Draft + documents state

    /// Server-side draft id, set after the first POST to
    /// `/api/mobile/projects`. Used as the projectId for document
    /// uploads. Nil until the owner reaches the documents step for
    /// the first time.
    var draftId: String? = nil
    /// Slug of the same draft. Used in the publish-finalize URL.
    var draftSlug: String? = nil
    /// Whether a draft-create call is in flight. Drives the docs
    /// step's loading state on first entry.
    var isCreatingDraft: Bool = false
    /// Per-file upload state, keyed by a transient local UUID we
    /// generate when the owner picks a file. Tracks the upload
    /// through init → R2 PUT → complete → done.
    var uploads: [UploadFile] = []

    /// One uploaded (or in-flight) document. State transitions:
    ///   `.pending` → `.uploading(progress:)` → `.completed(documentId:)`
    /// or → `.failed(message:)` at any point.
    struct UploadFile: Identifiable, Equatable {
        let id: UUID
        let category: DocumentsAPI.Category
        let filename: String
        let contentType: String
        let sizeBytes: Int
        var state: State

        enum State: Equatable {
            case pending
            case uploading(progress: Double)
            case completed(documentId: String)
            case failed(message: String)
        }

        var isCompleted: Bool {
            if case .completed = state { return true }
            return false
        }
        var documentId: String? {
            if case .completed(let id) = state { return id }
            return nil
        }
    }

    // MARK: - Navigation

    func goForward() {
        guard let next = Step(rawValue: step.rawValue + 1) else { return }
        bannerError = nil
        direction = .forward
        step = next
    }

    func goBack() {
        guard let prev = Step(rawValue: step.rawValue - 1) else { return }
        bannerError = nil
        direction = .backward
        step = prev
    }

    /// Jump-to (used from the review screen to edit a section).
    func jump(to target: Step) {
        bannerError = nil
        direction = target < step ? .backward : .forward
        step = target
    }

    // MARK: - Start mode + plan scan

    func chooseManual() {
        mode = .manual
        planScanComplete = true
    }

    func chooseAI() {
        mode = .ai
    }

    /// Owner picked the AI path but wants to skip uploading — drop them
    /// into the empty wizard exactly like the manual path.
    func skipPlanScan() {
        pickedPlan = nil
        scanPhase = .idle
        planScanComplete = true
    }

    /// Upload an architectural plan PDF to the stateless extractor and
    /// pre-fill the draft from what comes back. Stashes the file so it
    /// auto-attaches as a project document once the draft is created.
    func scanPlans(filename: String, contentType: String, data: Data) async {
        pickedPlan = PickedPlan(filename: filename, contentType: contentType, data: data)
        bannerError = nil
        scanPhase = .reading
        do {
            let suggestions = try await ProjectsAPI.extractFromPlans(data: data)
            let filled = applyProjectSuggestions(suggestions)
            planFilledCount = filled
            scanPhase = .done(filled: filled)
            showPlanReview = filled > 0
            planScanComplete = true
        } catch let error as APIError {
            scanPhase = .failed(
                message: error.errorDescription
                    ?? "Couldn't read those plans. Fill the form in instead."
            )
        } catch {
            scanPhase = .failed(message: "Couldn't read those plans. Fill the form in instead.")
        }
    }

    func dismissPlanReview() {
        showPlanReview = false
    }

    /// Apply extracted suggestions to empty draft fields only (never
    /// clobbers anything the owner already set). Returns the count of
    /// fields populated, for the review banner.
    @discardableResult
    private func applyProjectSuggestions(_ s: ProjectsAPI.ProjectSuggestions) -> Int {
        var filled = 0

        if draft.type == nil, let t = s.type { draft.type = t; filled += 1 }
        if draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           let title = s.title, !title.isEmpty {
            draft.title = title; filled += 1
        }
        if draft.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           let d = s.description, !d.isEmpty {
            draft.description = d; filled += 1
        }
        // Location needs suburb + state + postcode to be useful; street
        // line rides along (may be empty — the owner confirms it).
        if draft.location == nil,
           let suburb = s.suburb, let state = s.state, let postcode = s.postcode {
            draft.location = ProjectDraft.Location(
                addressLine1: s.addressLine1 ?? "",
                postcode: postcode,
                suburb: suburb,
                state: state
            )
            filled += 1
        }
        if draft.bedrooms == nil, let n = s.bedrooms { draft.bedrooms = n; filled += 1 }
        if draft.bathrooms == nil, let n = s.bathrooms { draft.bathrooms = n; filled += 1 }
        if draft.floors == nil, let n = s.floors { draft.floors = n; filled += 1 }
        if draft.landSizeBand == nil, let b = s.landSizeBand { draft.landSizeBand = b; filled += 1 }
        if draft.buildSizeBand == nil, let b = s.buildSizeBand { draft.buildSizeBand = b; filled += 1 }
        if draft.dwellingCount == nil, let n = s.dwellingCount { draft.dwellingCount = n; filled += 1 }
        if draft.renovationScopeTags.isEmpty, !s.renovationScopeTags.isEmpty {
            draft.renovationScopeTags = s.renovationScopeTags; filled += 1
        }
        if draft.existingAgeBand == nil, let b = s.existingAgeBand { draft.existingAgeBand = b; filled += 1 }
        if draft.extensionType == nil, let t = s.extensionType { draft.extensionType = t; filled += 1 }
        if draft.extensionSizeBand == nil, let b = s.extensionSizeBand { draft.extensionSizeBand = b; filled += 1 }
        if draft.budgetBand == nil, let b = s.budgetBand { draft.budgetBand = b; filled += 1 }
        if draft.targetStartMonth == nil, let m = s.targetStartMonth { draft.targetStartMonth = m; filled += 1 }
        if draft.targetCompletionMonth == nil, let m = s.targetCompletionMonth {
            draft.targetCompletionMonth = m; filled += 1
        }

        return filled
    }

    // MARK: - Per-step validation

    /// Whether the current step has the minimum data to allow Continue.
    var canContinueFromCurrentStep: Bool {
        switch step {
        case .type:
            return draft.type != nil
        case .location:
            // Both suburb resolution AND a street address are required.
            // Street stays private until unlock — see PublishStep2Location.
            guard let location = draft.location else { return false }
            return !location.addressLine1
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .isEmpty
        case .specs:
            return specsAreValid
        case .budgetTimeline:
            return draft.budgetBand != nil && draft.targetStartMonth != nil
        case .titleDescription:
            return !draft.title.trimmingCharacters(
                in: .whitespacesAndNewlines
            ).isEmpty
        case .documents:
            // Always allow continue from documents — owners without an
            // architectural plan publish as a draft (with an explicit
            // "Saved as draft" outcome at the celebration), so we
            // don't want to gate forward navigation here.
            return !isCreatingDraft && draftId != nil
        case .review:
            return true
        }
    }

    /// Whether the owner has uploaded at least one architectural plan.
    /// Drives the review-step CTA ("Publish project" vs "Save as
    /// draft") and the wizard's hint copy.
    var hasArchitecturalPlan: Bool {
        uploads.contains { $0.category == .architectural && $0.isCompleted }
    }

    /// Type-aware specs validation — each type has its own "minimum
    /// required" set.
    private var specsAreValid: Bool {
        guard let type = draft.type else { return false }
        switch type {
        case "single_dwelling":
            return draft.bedrooms != nil && draft.bathrooms != nil
        case "multi_dwelling":
            return draft.dwellingCount != nil
                && draft.bedrooms != nil
                && draft.bathrooms != nil
        case "renovation":
            return !draft.renovationScopeTags.isEmpty
        case "extension":
            return draft.extensionType != nil
                && draft.extensionSizeBand != nil
        default:
            return false
        }
    }

    // MARK: - Server flow

    /// Build the canonical `PublishRequest` payload from the current
    /// draft state. Used by both the draft-create and publish-finalize
    /// calls so they always agree on field shape.
    private func buildPayload() -> ProjectsAPI.PublishRequest? {
        guard let type = draft.type, let location = draft.location else {
            return nil
        }
        let title = draft.title.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        let description = draft.description.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        return ProjectsAPI.PublishRequest(
            type: type,
            title: title.isEmpty ? defaultTitle(for: type) : title,
            description: description.isEmpty ? nil : description,
            addressLine1: location.addressLine1,
            suburb: location.suburb,
            state: location.state,
            postcode: location.postcode,
            bedrooms: draft.bedrooms,
            bathrooms: draft.bathrooms,
            floors: draft.floors,
            landSizeBand: draft.landSizeBand,
            buildSizeBand: draft.buildSizeBand,
            dwellingCount: draft.dwellingCount,
            renovationScopeTags: draft.renovationScopeTags.isEmpty
                ? nil
                : draft.renovationScopeTags,
            existingAgeBand: draft.existingAgeBand,
            extensionType: draft.extensionType,
            extensionSizeBand: draft.extensionSizeBand,
            budgetBand: draft.budgetBand,
            targetStartMonth: draft.targetStartMonth,
            targetCompletionMonth: draft.targetCompletionMonth
        )
    }

    /// Idempotent draft create — call this on entering the docs step.
    /// On success, stores `draftId` + `draftSlug` so subsequent file
    /// uploads have a projectId to attach to. Safe to call multiple
    /// times; if a draft already exists locally, returns immediately
    /// (we don't yet PATCH the draft mid-wizard).
    @discardableResult
    func ensureDraftExists() async -> Bool {
        if draftId != nil { return true }
        guard let payload = buildPayload() else {
            bannerError = "Some required info is missing. Tap back and check."
            return false
        }
        isCreatingDraft = true
        defer { isCreatingDraft = false }
        do {
            let project = try await ProjectsAPI.createDraft(payload)
            draftId = project.id
            draftSlug = project.slug
            // AI path: the plan the owner scanned hasn't been persisted
            // yet (extraction was stateless). Now that the draft exists,
            // attach it as the architectural document automatically so
            // they don't have to re-pick it — and so the publish gate is
            // satisfied.
            await attachScannedPlanIfNeeded()
            return true
        } catch let error as APIError {
            bannerError = error.errorDescription
                ?? "Couldn't save your project. Try again."
            return false
        } catch {
            bannerError = "Couldn't save your project. Try again."
            return false
        }
    }

    /// AI path: upload the stashed scanned plan as the architectural
    /// document, exactly once, after the draft exists. No-op when there's
    /// nothing stashed (manual path, or already attached).
    private func attachScannedPlanIfNeeded() async {
        guard !planAttached, let plan = pickedPlan, draftId != nil else { return }
        planAttached = true
        pickedPlan = nil
        await uploadFile(
            category: .architectural,
            filename: plan.filename,
            contentType: plan.contentType,
            data: plan.data
        )
    }

    /// Upload one file end-to-end: init → R2 PUT → complete. Inserts
    /// a row into `uploads` immediately so the UI has something to
    /// render with a progress state. Throws nothing — failure surfaces
    /// as a `.failed(message:)` state on the row.
    func uploadFile(
        category: DocumentsAPI.Category,
        filename: String,
        contentType: String,
        data: Data
    ) async {
        guard let projectId = draftId else {
            bannerError = "Couldn't start the upload. Try going back a step."
            return
        }
        let id = UUID()
        let file = UploadFile(
            id: id,
            category: category,
            filename: filename,
            contentType: contentType,
            sizeBytes: data.count,
            state: .pending
        )
        uploads.append(file)
        await mutateUpload(id) { $0.state = .uploading(progress: 0.05) }

        do {
            let initRes = try await DocumentsAPI.initUpload(
                projectId: projectId,
                category: category,
                filename: filename,
                contentType: contentType,
                sizeBytes: data.count
            )
            await mutateUpload(id) { $0.state = .uploading(progress: 0.35) }

            try await DocumentsAPI.putToR2(
                uploadUrl: initRes.uploadUrl,
                uploadHeaders: initRes.uploadHeaders,
                fileData: data
            )
            await mutateUpload(id) { $0.state = .uploading(progress: 0.85) }

            let finalised = try await DocumentsAPI.complete(
                projectId: projectId,
                documentId: initRes.documentId
            )
            await mutateUpload(id) {
                $0.state = .completed(documentId: finalised.id)
            }
        } catch let error as APIError {
            await mutateUpload(id) {
                $0.state = .failed(
                    message: error.errorDescription
                        ?? "Upload failed. Tap to retry."
                )
            }
        } catch {
            await mutateUpload(id) {
                $0.state = .failed(message: "Upload failed. Tap to retry.")
            }
        }
    }

    /// Drop a file from the upload list. Server-side soft delete will
    /// land in a follow-up — for now, completed uploads still exist
    /// on the project but won't show in the wizard's local count.
    func removeUpload(id: UUID) {
        uploads.removeAll { $0.id == id }
    }

    private func mutateUpload(
        _ id: UUID,
        _ apply: (inout UploadFile) -> Void
    ) async {
        guard let idx = uploads.firstIndex(where: { $0.id == id }) else { return }
        var copy = uploads[idx]
        apply(&copy)
        uploads[idx] = copy
    }

    // MARK: - Publish (final)

    /// Final call from the review step. Re-sends the full payload
    /// (any review-screen tweaks land server-side as a PATCH), then
    /// either publishes (if the architectural-plan gate passes) or
    /// returns the same draft with `savedAsDraft: true`.
    func publish() async -> Bool {
        bannerError = nil
        isSaving = true
        defer { isSaving = false }

        guard let payload = buildPayload() else {
            bannerError = "Something's missing. Step back and check the form."
            return false
        }
        guard let slug = draftSlug else {
            bannerError = "Couldn't find your saved draft. Try going back."
            return false
        }

        do {
            let result = try await ProjectsAPI.publishDraft(slug: slug, payload)
            publishedProject = result.project
            savedAsDraft = result.savedAsDraft
            return true
        } catch let error as APIError {
            bannerError = error.errorDescription
                ?? "Couldn't publish. Try again."
            return false
        } catch {
            bannerError = "Couldn't publish. Try again."
            return false
        }
    }

    private func defaultTitle(for type: String) -> String {
        switch type {
        case "single_dwelling": return "New single dwelling"
        case "multi_dwelling":  return "New multi-dwelling project"
        case "renovation":      return "Renovation project"
        case "extension":       return "Home extension"
        default:                return "Project"
        }
    }
}
