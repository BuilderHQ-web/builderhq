/// TendersAPI — typed surface for the builder tender flow.
///
/// The server mirrors the project-publish pattern: a tender is a
/// draft you create against a project you've unlocked, autosave
/// fields into, then submit. Every endpoint returns the same
/// `MobileTenderPayload` shape so the composer can hydrate from any
/// response identically.
///
///   1. `createDraft(slug:)`  → POST /api/mobile/projects/:slug/tender
///                              (idempotent — returns the existing
///                              draft if one exists)
///   2. `patch(id:fields:)`   → PATCH /api/mobile/tenders/:id
///                              (draft-only autosave of any subset)
///   3. `submit(id:)`         → POST /api/mobile/tenders/:id/submit
///                              (validates readiness, locks the tender)
///
/// Routes return the payload directly (not wrapped), so the Decodable
/// target is `MobileTenderPayload` itself.

import Foundation

enum TendersAPI {
    // MARK: - Payload

    struct CostLine: Codable, Equatable, Identifiable {
        let id: String
        let trade: String
        let label: String?
        let amountAud: Int
        let sortOrder: Int
    }

    /// Server-computed readiness — drives the completeness ring + the
    /// submit gate without the client re-deriving the rules.
    struct Readiness: Codable, Equatable {
        let canSubmit: Bool
        let missing: [String]
        let variance: Int?
    }

    struct Payload: Codable, Equatable, Identifiable {
        let id: String
        let projectId: String
        let builderId: String
        let status: String
        let totalPriceAud: Int?
        let durationWeeks: Int?
        let validityDays: Int?
        let proposedStartMonth: String?
        let exclusions: [String]?
        let conditions: String?
        let pitch: String?
        let costLines: [CostLine]
        let readiness: Readiness
        let createdAt: String
        let updatedAt: String
        let submittedAt: String?
    }

    // MARK: - Create draft

    /// Create (or idempotently fetch) a draft tender for a project the
    /// builder has unlocked. Server 403s if they haven't unlocked it.
    static func createDraft(slug: String) async throws -> Payload {
        try await APIClient.shared.post(
            "/api/mobile/projects/\(slug)/tender",
            body: EmptyBody()
        )
    }

    // MARK: - Get

    static func get(id: String) async throws -> Payload {
        try await APIClient.shared.get("/api/mobile/tenders/\(id)")
    }

    // MARK: - Patch (draft autosave)

    /// Partial update of a draft tender. Only non-nil fields are sent,
    /// matching the server's "patch any subset" contract. Encodes with
    /// explicit-null suppression via `PatchBody`.
    struct PatchFields {
        var totalPriceAud: Int?
        var durationWeeks: Int?
        var validityDays: Int?
        var proposedStartMonth: String?
        var exclusions: [String]?
        var conditions: String?
        var pitch: String?
    }

    private struct PatchBody: Encodable {
        let totalPriceAud: Int?
        let durationWeeks: Int?
        let validityDays: Int?
        let proposedStartMonth: String?
        let exclusions: [String]?
        let conditions: String?
        let pitch: String?

        enum CodingKeys: String, CodingKey {
            case totalPriceAud
            case durationWeeks
            case validityDays
            case proposedStartMonth
            case exclusions
            case conditions
            case pitch
        }

        // Only encode keys that are present — the server treats an
        // absent key as "leave unchanged". Without this, sending
        // `nil` for every untouched field would be ambiguous.
        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encodeIfPresent(totalPriceAud, forKey: .totalPriceAud)
            try c.encodeIfPresent(durationWeeks, forKey: .durationWeeks)
            try c.encodeIfPresent(validityDays, forKey: .validityDays)
            try c.encodeIfPresent(proposedStartMonth, forKey: .proposedStartMonth)
            try c.encodeIfPresent(exclusions, forKey: .exclusions)
            try c.encodeIfPresent(conditions, forKey: .conditions)
            try c.encodeIfPresent(pitch, forKey: .pitch)
        }
    }

    static func patch(id: String, fields: PatchFields) async throws -> Payload {
        let body = PatchBody(
            totalPriceAud: fields.totalPriceAud,
            durationWeeks: fields.durationWeeks,
            validityDays: fields.validityDays,
            proposedStartMonth: fields.proposedStartMonth,
            exclusions: fields.exclusions,
            conditions: fields.conditions,
            pitch: fields.pitch
        )
        return try await APIClient.shared.patch(
            "/api/mobile/tenders/\(id)",
            body: body
        )
    }

    // MARK: - Cost lines (itemized BoQ breakdown)

    /// One line in the cost breakdown. `label` is required only when
    /// `trade == "other"` (server-enforced).
    struct CostLineInput: Encodable {
        let trade: String
        let amountAud: Int
        let label: String?

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(trade, forKey: .trade)
            try c.encode(amountAud, forKey: .amountAud)
            try c.encodeIfPresent(label, forKey: .label)
        }
        enum CodingKeys: String, CodingKey { case trade, amountAud, label }
    }

    /// Replace the entire cost-line set (server wraps delete-then-insert
    /// in a transaction). Returns the refreshed tender payload.
    static func putCostLines(id: String, lines: [CostLineInput]) async throws -> Payload {
        struct Body: Encodable { let lines: [CostLineInput] }
        return try await APIClient.shared.put(
            "/api/mobile/tenders/\(id)/cost-lines",
            body: Body(lines: lines)
        )
    }

    // MARK: - Submit

    /// Flip a draft → submitted. Server validates readiness (price +
    /// duration + validity) and auto-balances cost lines. Throws
    /// `APIError.validation` with a `missing` detail when not ready.
    static func submit(id: String) async throws -> Payload {
        try await APIClient.shared.post(
            "/api/mobile/tenders/\(id)/submit",
            body: EmptyBody()
        )
    }

    // MARK: - Quote extraction (PDF auto-fill)

    /// A single extracted breakdown line. `trade` is one of the 28
    /// taxonomy ids (or "other"); `label` carries the quote's own
    /// heading.
    struct SuggestedCostLine: Decodable, Equatable {
        let trade: String
        let label: String?
        let amountAud: Int
    }

    /// Structured suggestions extracted from a builder's uploaded quote
    /// PDF. Every field is optional — the composer fills only what came
    /// back and leaves the rest for the builder. `warnings` surfaces
    /// reconcile hints (e.g. breakdown vs headline mismatch).
    struct ExtractionSuggestions: Decodable, Equatable {
        let totalPriceAud: Int?
        let durationWeeks: Int?
        let validityDays: Int?
        let proposedStartMonth: String?
        let pitch: String?
        let conditions: String?
        let exclusions: [String]
        let costLines: [SuggestedCostLine]
        let warnings: [String]
    }

    private struct ExtractResponse: Decodable {
        let suggestions: ExtractionSuggestions
    }

    private struct ExtractBody: Encodable { let documentId: String }

    /// Send a previously-uploaded tender document (a quote PDF) to the
    /// server's Claude-backed extractor and get back structured fields
    /// to prefill the composer. The document must already be attached to
    /// this tender (uploaded via DocumentsAPI with the same tenderId).
    ///
    /// Surfaces typed `APIError`s the UI maps to a friendly message:
    /// 503 (auto-fill disabled), 422 (not a readable PDF), 502 (model
    /// couldn't read it) — in every case the manual form still works.
    static func extract(id: String, documentId: String) async throws -> ExtractionSuggestions {
        let res: ExtractResponse = try await APIClient.shared.post(
            "/api/mobile/tenders/\(id)/extract",
            body: ExtractBody(documentId: documentId)
        )
        return res.suggestions
    }
}
