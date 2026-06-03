/// OwnerTendersAPI — the owner's tender comparison + decision surface.
///
/// Two endpoints power the whole review experience:
///   · `list(slug:)`   → GET /api/mobile/projects/:slug/tenders
///                       returns the project's tenders (full detail incl.
///                       cost lines, since a project caps at 3) plus
///                       server-computed analytics, in one round-trip.
///   · `decide(...)`   → POST /api/mobile/tenders/:id/decision
///                       shortlist / award / reject / reopen. Returns the
///                       updated tender in the same detail shape so the
///                       screen swaps state without a refetch.
///
/// Every field mirrors `ownerTenderPayload.ts` verbatim.

import Foundation

enum OwnerTendersAPI {
    // MARK: - Builder

    struct Builder: Decodable, Equatable, Identifiable {
        let id: String
        /// companyName → name → "Builder", resolved server-side.
        let displayName: String
        let initials: String
        let companyName: String?
        let slug: String?
        let state: String?
        let yearsInOperation: Int?
        let abnVerified: Bool
        let anyLicenceVerified: Bool
        /// How many tenders this builder has won across the platform —
        /// a track-record signal.
        let awardedCount: Int
    }

    // MARK: - Cost line

    struct CostLine: Decodable, Equatable, Identifiable {
        let id: String
        let trade: String
        let label: String?
        let amountAud: Int
        let sortOrder: Int
    }

    // MARK: - Completeness

    struct Completeness: Decodable, Equatable {
        /// 0–1 ratio of how fully the builder filled out their bid
        /// (filled / total). Multiply by 100 for a percentage.
        let score: Double
        let filled: Int
        let total: Int
        /// Human labels of what's missing (e.g. "cost breakdown").
        let missing: [String]
    }

    // MARK: - Tender (owner detail shape)

    struct Tender: Decodable, Equatable, Identifiable {
        let id: String
        let status: String
        let totalPriceAud: Int?
        let durationWeeks: Int?
        let validityDays: Int?
        let proposedStartMonth: String?
        let exclusions: [String]?
        let conditions: String?
        let pitch: String?
        let submittedAtIso: String?
        let decidedAtIso: String?
        let documentCount: Int
        let builder: Builder
        let completeness: Completeness
        let costLines: [CostLine]
    }

    // MARK: - Analytics (server-computed)

    struct PriceStats: Decodable, Equatable {
        let min: Int?
        let median: Int?
        let max: Int?
        // NOTE: the server also sends `spread`, but as a RATIO
        // ((max−min)/median, a fraction) — not a dollar amount. We don't
        // decode it (a fractional value into Int would fail the whole
        // response); the UI derives the dollar spread from max − min.
    }

    struct DurationStats: Decodable, Equatable {
        let min: Int?
        let median: Int?
        let max: Int?
    }

    struct Analytics: Decodable, Equatable {
        let count: Int
        let uniqueBuilders: Int
        let price: PriceStats
        let duration: DurationStats
        let daysLive: Int?
        let daysSinceLatest: Int?
        /// 0–1 share of tenders from ABN-verified builders.
        let verifiedRatio: Double
    }

    // MARK: - Responses

    /// Project specs the comparison uses for $/m² (buildSizeBand) and
    /// price-vs-budget (budgetBand).
    struct ProjectSpecs: Decodable, Equatable {
        let type: String
        let buildSizeBand: String?
        let budgetBand: String?
        let bedrooms: Int?
        let bathrooms: Int?
    }

    struct ListResponse: Decodable, Equatable {
        let projectId: String
        let projectTitle: String
        let project: ProjectSpecs
        let analytics: Analytics
        let tenders: [Tender]
    }

    struct DecisionResponse: Decodable, Equatable {
        let tender: Tender
        /// Present on `award` with rejectOthers — the siblings auto-rejected.
        let rejectedIds: [String]?
    }

    // MARK: - Calls

    static func list(slug: String) async throws -> ListResponse {
        try await APIClient.shared.get("/api/mobile/projects/\(slug)/tenders")
    }

    enum Decision: String {
        case shortlist, award, reject, reopen
    }

    private struct DecisionBody: Encodable {
        let action: String
        let rejectOthers: Bool?

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(action, forKey: .action)
            try c.encodeIfPresent(rejectOthers, forKey: .rejectOthers)
        }
        enum CodingKeys: String, CodingKey { case action, rejectOthers }
    }

    /// Apply an owner decision. `rejectOthers` only matters for `.award`
    /// (auto-rejects the other live tenders on the project).
    static func decide(
        tenderId: String,
        action: Decision,
        rejectOthers: Bool? = nil
    ) async throws -> DecisionResponse {
        try await APIClient.shared.post(
            "/api/mobile/tenders/\(tenderId)/decision",
            body: DecisionBody(action: action.rawValue, rejectOthers: rejectOthers)
        )
    }

    // MARK: - Tender documents (owner-only)

    /// A document the builder submitted with their tender, with a
    /// short-lived presigned download URL for the owner to preview.
    struct Document: Decodable, Equatable, Identifiable {
        let id: String
        let filename: String
        let contentType: String
        let sizeBytes: Int
        let category: String
        let createdAt: String
        let downloadUrl: String?
    }

    private struct DocumentsResponse: Decodable { let documents: [Document] }

    /// List the documents on a tender (owner of the tender's project only).
    static func listDocuments(tenderId: String) async throws -> [Document] {
        let res: DocumentsResponse = try await APIClient.shared.get(
            "/api/mobile/tenders/\(tenderId)/documents"
        )
        return res.documents
    }
}
