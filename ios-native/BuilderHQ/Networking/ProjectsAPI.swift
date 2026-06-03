/// ProjectsAPI — typed accessors for the mobile project surfaces.
///
/// Routes today:
///   · POST /api/mobile/projects       — owner publishes (single-shot)
///   · GET  /api/mobile/dashboard/owner — owner dashboard bundle
///
/// Future:
///   · GET  /api/mobile/projects/:slug — project detail (week 4)
///   · POST /api/mobile/projects/:id/documents — doc upload (later)

import Foundation

enum ProjectsAPI {
    // MARK: - Owner dashboard bundle

    struct OwnerStats: Codable, Equatable {
        let activeProjects: Int
        let draftProjects: Int
        let totalTenders: Int
        let unreadMessages: Int
    }

    struct OwnerProjectStats: Codable, Equatable {
        let unlockCount: Int
        let tenderCount: Int
        let unreadMessages: Int
    }

    struct OwnerProjectRow: Codable, Equatable, Identifiable {
        let id: String
        let slug: String
        let title: String
        let status: String
        let type: String
        let suburb: String?
        let state: String?
        let postcode: String?
        let publishedAt: String?
        let createdAt: String
        let stats: OwnerProjectStats
    }

    struct OwnerActivityRow: Codable, Equatable, Identifiable {
        let id: String
        let kind: String
        let title: String
        let body: String?
        let actionUrl: String?
        let readAt: String?
        let createdAt: String
    }

    struct OwnerDashboardBundle: Decodable, Equatable {
        let stats: OwnerStats
        let projects: [OwnerProjectRow]
        let activity: [OwnerActivityRow]
    }

    static func fetchOwnerDashboard() async throws -> OwnerDashboardBundle {
        try await APIClient.shared.get("/api/mobile/dashboard/owner")
    }

    // MARK: - Owner full project list (Projects tab)

    /// Owner's full project list, server-side filtered. Drives the
    /// mobile owner "Projects" tab — drafts + published + tendering +
    /// completed all returned in one call so the tab's scope pills
    /// can switch client-side without re-fetching.
    struct OwnerProjectsResponse: Decodable {
        let items: [OwnerProjectRow]
    }

    /// `status` optionally narrows server-side (matches the scope
    /// pills). `q` is a case-insensitive title substring filter.
    static func fetchMyProjects(
        status: String? = nil,
        query: String? = nil
    ) async throws -> [OwnerProjectRow] {
        var components = URLComponents()
        var items: [URLQueryItem] = []
        if let status = status {
            items.append(.init(name: "status", value: status))
        }
        if let q = query?.trimmingCharacters(in: .whitespacesAndNewlines),
           !q.isEmpty {
            items.append(.init(name: "q", value: q))
        }
        components.queryItems = items.isEmpty ? nil : items
        let query = components.percentEncodedQuery ?? ""
        let path = "/api/mobile/projects/mine"
            + (query.isEmpty ? "" : "?\(query)")
        let response: OwnerProjectsResponse = try await APIClient.shared.get(path)
        return response.items
    }

    // MARK: - Publish wizard (draft → docs → publish)

    /// The wizard now runs in two server roundtrips:
    ///
    ///   1. `createDraft(_:)` — POSTs every field the wizard has
    ///      collected so far, and the server saves the row as a
    ///      `draft`. Returns `{ id, slug }` so the next steps
    ///      (documents) can upload against that projectId.
    ///   2. `publishDraft(slug:_:)` — re-sends the (possibly edited)
    ///      payload, the server patches the draft with any tweaks
    ///      from the review step, then flips it to `published`. The
    ///      flip is gated on at least one architectural plan being
    ///      attached, so an owner with no plans gets a 400 here and
    ///      the wizard saves silently as a draft instead.
    ///
    /// `PublishRequest` is shared between the two calls — same shape
    /// on the wire so we don't duplicate field plumbing.
    struct PublishRequest: Encodable {
        let type: String
        let title: String
        let description: String?

        let addressLine1: String?
        let suburb: String
        let state: String
        let postcode: String

        let bedrooms: Int?
        let bathrooms: Int?
        let floors: Int?
        let landSizeBand: String?
        let buildSizeBand: String?

        let dwellingCount: Int?

        let renovationScopeTags: [String]?
        let existingAgeBand: String?

        let extensionType: String?
        let extensionSizeBand: String?

        let budgetBand: String?
        let targetStartMonth: String?
        let targetCompletionMonth: String?
    }

    struct PublishResponse: Decodable {
        struct Project: Decodable, Equatable {
            let id: String
            let slug: String
            let title: String
            let type: String
            let status: String
            let suburb: String?
            let state: String?
            let postcode: String?
            let publishedAt: String?
        }
        let project: Project
        /// `true` when the wizard requested a publish but the server's
        /// gate (architectural plans, required fields, …) wasn't
        /// satisfied. The body patches still landed; the project just
        /// stays as a draft. UI uses this to show "Saved as draft"
        /// instead of "Published" on the celebration screen.
        let savedAsDraft: Bool?
        /// Names of the missing requirements when `savedAsDraft` is
        /// true. Mirrors the keys from `checkPublishability`'s report
        /// (e.g. `["architectural_plan"]`).
        let missing: [String]?
    }

    /// Step 1 of the wizard's server flow — saves whatever fields the
    /// owner has filled in so far as a `draft`. Returns the project
    /// id + slug so the documents step can upload against it. Safe to
    /// retry: each call creates a fresh draft, so the wizard should
    /// only call this once when it enters the documents step.
    static func createDraft(_ payload: PublishRequest) async throws -> PublishResponse.Project {
        let response: PublishResponse = try await APIClient.shared.post(
            "/api/mobile/projects",
            body: payload
        )
        return response.project
    }

    /// Result of the second wizard call: either a successfully
    /// published project, or the patched draft with a list of what
    /// was missing so the UI can show "Saved as draft" instead.
    struct FinalizeResult: Equatable {
        let project: PublishResponse.Project
        /// `true` when the publish gate didn't pass and the project
        /// stayed as a draft. The patch still landed on the server.
        let savedAsDraft: Bool
        /// Missing publishability requirements (e.g.
        /// `"architectural_plan"`) when `savedAsDraft` is true.
        let missing: [String]
    }

    /// Step 2 of the wizard's server flow — re-applies any field
    /// edits from the review step then attempts to flip the draft to
    /// `published`. The server's publish endpoint is tolerant: if the
    /// gate fails (e.g. no architectural plans), it still returns 200
    /// with `savedAsDraft: true` and a list of what was missing. So
    /// this call only throws on actual failures (5xx, auth, etc).
    static func publishDraft(
        slug: String,
        _ payload: PublishRequest
    ) async throws -> FinalizeResult {
        let response: PublishResponse = try await APIClient.shared.post(
            "/api/mobile/projects/\(slug)/publish",
            body: payload
        )
        return FinalizeResult(
            project: response.project,
            savedAsDraft: response.savedAsDraft ?? false,
            missing: response.missing ?? []
        )
    }

    /// Owner edit — partial update of an existing project's fields
    /// (status untouched). Reuses the PublishRequest shape; the server
    /// only applies the editable keys. Returns the refreshed project.
    static func updateProject(
        slug: String,
        _ payload: PublishRequest
    ) async throws -> PublishResponse.Project {
        let response: PublishResponse = try await APIClient.shared.patch(
            "/api/mobile/projects/\(slug)",
            body: payload
        )
        return response.project
    }

    // MARK: - Delete + document download

    struct DeleteResponse: Decodable {
        struct Deleted: Decodable { let id: String }
        let deleted: Deleted
    }

    /// Owner delete — gated server-side on zero unlocks. Throws
    /// `APIError.validation` (with `fieldErrors["reason"] == "has_active_unlocks"`
    /// + `fieldErrors["unlockCount"]`) when the project is already
    /// unlocked and therefore can't be deleted.
    @discardableResult
    static func deleteProject(slug: String) async throws -> String {
        let res: DeleteResponse = try await APIClient.shared.delete("/api/mobile/projects/\(slug)")
        return res.deleted.id
    }

    struct DocumentDownloadResponse: Decodable {
        let url: String
        let filename: String
    }

    /// Mint a short-lived presigned URL for a project document the caller
    /// has unlocked (builder viewing the owner's plans). 403 if not unlocked.
    static func downloadDocument(documentId: String) async throws -> DocumentDownloadResponse {
        try await APIClient.shared.get("/api/mobile/documents/\(documentId)/download")
    }

    // MARK: - Plan auto-fill (AI extraction)

    /// Structured project fields extracted from an uploaded architectural
    /// plan set. Every field is optional — the wizard pre-fills only what
    /// came back and leaves the rest for the owner to complete on review.
    struct ProjectSuggestions: Decodable, Equatable {
        let type: String?
        let title: String?
        let description: String?
        let addressLine1: String?
        let suburb: String?
        let state: String?
        let postcode: String?
        let bedrooms: Int?
        let bathrooms: Int?
        let floors: Int?
        let landSizeBand: String?
        let buildSizeBand: String?
        let dwellingCount: Int?
        let renovationScopeTags: [String]
        let existingAgeBand: String?
        let extensionType: String?
        let extensionSizeBand: String?
        let budgetBand: String?
        let targetStartMonth: String?
        let targetCompletionMonth: String?
        let warnings: [String]
    }

    private struct ExtractResponse: Decodable {
        let suggestions: ProjectSuggestions
    }

    /// Send an architectural plan PDF to the server's Claude-backed
    /// extractor and get back fields to pre-fill the publish wizard.
    /// Stateless — runs before any project exists. Surfaces typed
    /// `APIError`s the UI maps to a friendly message (503 disabled,
    /// 422 not a readable PDF, 502 model couldn't read it); in every
    /// case the manual wizard still works.
    static func extractFromPlans(data: Data) async throws -> ProjectSuggestions {
        let res: ExtractResponse = try await APIClient.shared.postData(
            "/api/mobile/projects/extract",
            data: data,
            contentType: "application/pdf"
        )
        return res.suggestions
    }

    // MARK: - Browse (marketplace list)

    /// One row in the browse feed. Mirrors the shape `/api/mobile/projects/browse`
    /// returns. Decorated with the caller's `isSaved` + `isUnlocked` flags.
    struct BrowseProject: Codable, Equatable, Identifiable {
        let id: String
        let slug: String
        let title: String
        let type: String
        let status: String
        let suburb: String?
        let state: String?
        let postcode: String?
        let budgetBand: String?
        let bedrooms: Int?
        let bathrooms: Int?
        let documentCount: Int
        let unlockedCount: Int
        let unlockCap: Int
        let unlockPriceAud: Int
        let publishedAt: String?
        let isSaved: Bool
        let isUnlocked: Bool
    }

    struct BrowseResponse: Decodable {
        let items: [BrowseProject]
        let hasMore: Bool
    }

    /// Scope pill state — narrows the marketplace feed to the
    /// builder's own saved/unlocked projects. Default `.all` returns
    /// every published project. Matches the server's `scope` query
    /// param (all / saved / unlocked).
    enum BrowseScope: String, Equatable {
        case all
        case saved
        case unlocked
    }

    /// Optional filters for the browse query. Nil values are omitted
    /// from the URL — the server treats absence as "any".
    struct BrowseFilters: Equatable {
        var q: String? = nil
        var type: String? = nil
        var state: String? = nil
        var postcode: String? = nil
        var budgets: [String]? = nil
        /// When true, scope to the caller's saved service areas.
        var serviceAreaScope: Bool = false
        /// Scope pill — restricts the feed to the caller's saved or
        /// unlocked projects. `.all` is the default marketplace view.
        var scope: BrowseScope = .all
        var limit: Int = 20
        var offset: Int = 0
    }

    static func browse(_ filters: BrowseFilters) async throws -> BrowseResponse {
        var components = URLComponents()
        var items: [URLQueryItem] = []
        if let q = filters.q?.trimmingCharacters(in: .whitespacesAndNewlines),
           !q.isEmpty {
            items.append(.init(name: "q", value: q))
        }
        if let type = filters.type {
            items.append(.init(name: "type", value: type))
        }
        if let state = filters.state {
            items.append(.init(name: "state", value: state))
        }
        if let postcode = filters.postcode {
            items.append(.init(name: "postcode", value: postcode))
        }
        if let budgets = filters.budgets, !budgets.isEmpty {
            items.append(.init(name: "budgets", value: budgets.joined(separator: ",")))
        }
        if filters.serviceAreaScope {
            items.append(.init(name: "serviceArea", value: "1"))
        }
        if filters.scope != .all {
            items.append(.init(name: "scope", value: filters.scope.rawValue))
        }
        items.append(.init(name: "limit", value: String(filters.limit)))
        items.append(.init(name: "offset", value: String(filters.offset)))
        components.queryItems = items
        let query = components.percentEncodedQuery ?? ""
        let path = "/api/mobile/projects/browse" + (query.isEmpty ? "" : "?\(query)")
        return try await APIClient.shared.get(path)
    }

    // MARK: - Project detail (slug-based)

    /// All the fields the detail screen reads from `project.*`. The
    /// server returns these regardless of mode (preview/unlocked).
    /// `addressLine1` is only populated on `unlocked_builder` mode.
    struct DetailProjectFields: Codable, Equatable {
        let id: String
        let slug: String
        let title: String
        let status: String
        let type: String
        let suburb: String?
        let state: String?
        let postcode: String?
        let bedrooms: Int?
        let bathrooms: Int?
        let floors: Int?
        let dwellingCount: Int?
        let landSizeBand: String?
        let buildSizeBand: String?
        let renovationScope: String?
        let existingAgeBand: String?
        let extensionType: String?
        let extensionSizeBand: String?
        let budgetBand: String?
        let targetStartMonth: String?
        let targetCompletionMonth: String?
        let description: String?
        let publishedAtIso: String?
        /// Only present on `unlocked_builder` mode.
        let addressLine1: String?
    }

    enum UnlockPricing: Decodable, Equatable {
        case free(remainingThisCycle: Int)
        case paid(priceAud: Int)
        case unavailable(reason: String)

        private enum CodingKeys: String, CodingKey {
            case kind, reason, priceAud, remainingThisCycle
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            let kind = try c.decode(String.self, forKey: .kind)
            switch kind {
            case "free":
                let n = try c.decodeIfPresent(Int.self, forKey: .remainingThisCycle) ?? 0
                self = .free(remainingThisCycle: n)
            case "paid":
                self = .paid(
                    priceAud: try c.decode(Int.self, forKey: .priceAud)
                )
            default:
                self = .unavailable(
                    reason: try c.decodeIfPresent(String.self, forKey: .reason) ?? "unavailable"
                )
            }
        }
    }

    struct UnlockAffordance: Decodable, Equatable {
        let canUnlock: Bool
        let slotsRemaining: Int
        let unlockCap: Int
        /// Underlying paid-path price, always present. Drives the
        /// slashed-price treatment on the sticky CTA (so a builder
        /// covered by FBA still sees the dollar value they're saving).
        let basePriceAud: Int
        let pricing: UnlockPricing
    }

    struct DocumentRow: Codable, Equatable, Identifiable {
        let id: String
        let category: String
        let filename: String
        let contentType: String
        let sizeBytes: Int
        let version: Int
        let status: String
        let createdAt: String
    }

    struct TenderSnapshot: Codable, Equatable, Identifiable {
        let id: String
        let status: String
        let totalPriceAud: Int?
        let durationWeeks: Int?
        let submittedAt: String?
        let updatedAt: String
    }

    /// Tagged-union response — the mobile detail screen reads `mode` first
    /// and renders the matching variant.
    enum ProjectDetailResponse: Decodable, Equatable {
        case preview(Preview)
        case unlockedBuilder(UnlockedBuilder)
        /// Owner mode — only fires when an owner taps their own listing
        /// from the dashboard. Subset of fields exposed for now (the
        /// owner already has the publish UI for editing).
        case owner(Owner)

        struct Preview: Decodable, Equatable {
            let project: DetailProjectFields
            let documentCount: Int
            let unlockedCount: Int
            let isSaved: Bool
            let unlock: UnlockAffordance
        }

        struct UnlockedBuilder: Decodable, Equatable {
            let project: DetailProjectFields
            let documents: [DocumentRow]
            let unlockedCount: Int
            let isSaved: Bool
            let myTender: TenderSnapshot?
            let owner: OwnerCard
        }

        /// Public-safe owner identity, only present on
        /// `unlocked_builder` mode. Drives the post-unlock owner card.
        struct OwnerCard: Decodable, Equatable {
            let id: String
            let name: String
            let joinedAtIso: String
            let publishedProjectCount: Int
        }

        struct Owner: Decodable, Equatable {
            let project: DetailProjectFields
            let stats: OwnerStatsBlock
            let documents: [DocumentRow]
        }

        /// Owner-mode counts surfaced in the project detail payload.
        /// `tenderCount` drives the "Review tenders" entry.
        struct OwnerStatsBlock: Decodable, Equatable {
            let unlockCount: Int
            let tenderCount: Int
            let unreadMessages: Int
        }

        private enum DiscriminatorKey: String, CodingKey {
            case mode
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: DiscriminatorKey.self)
            let mode = try c.decode(String.self, forKey: .mode)
            switch mode {
            case "preview":
                self = .preview(try Preview(from: decoder))
            case "unlocked_builder":
                self = .unlockedBuilder(try UnlockedBuilder(from: decoder))
            case "owner":
                self = .owner(try Owner(from: decoder))
            default:
                throw DecodingError.dataCorruptedError(
                    forKey: .mode,
                    in: c,
                    debugDescription: "Unknown detail mode: \(mode)"
                )
            }
        }
    }

    static func detail(slug: String) async throws -> ProjectDetailResponse {
        try await APIClient.shared.get("/api/mobile/projects/\(slug)")
    }

    // MARK: - Save / unsave

    /// Both endpoints return `{ ok: bool, saved: bool }`. The decoder
    /// uses `.convertFromSnakeCase`, but `saved` is single-word so no
    /// conversion is needed — match the server's key verbatim.
    struct SaveResponse: Decodable {
        let ok: Bool
        let saved: Bool
    }

    static func save(slug: String) async throws -> Bool {
        let response: SaveResponse = try await APIClient.shared.post(
            "/api/mobile/projects/\(slug)/save",
            body: EmptyBody()
        )
        return response.saved
    }

    static func unsave(slug: String) async throws -> Bool {
        // DELETE through APIClient so we get the shared auth/refresh
        // chain + the snake_case decoder. The previous hand-rolled
        // URLSession path skipped both.
        let response: SaveResponse = try await APIClient.shared.delete(
            "/api/mobile/projects/\(slug)/save"
        )
        return response.saved
    }

    // MARK: - Unlock

    struct UnlockResponse: Decodable {
        let ok: Bool
        let unlockId: String?
        let source: String?
        let remainingThisCycle: Int?
    }

    static func unlock(slug: String) async throws -> UnlockResponse {
        try await APIClient.shared.post(
            "/api/mobile/projects/\(slug)/unlock",
            body: EmptyBody()
        )
    }
}

