/// DocumentsAPI — typed surface for the mobile owner's document
/// upload pipeline.
///
/// The pipeline is the same one the web uses: two roundtrips to our
/// own server with a direct PUT to Cloudflare R2 in between.
///
///   1. `initUpload(...)`  → POST /api/mobile/documents (mode: "init")
///                            returns { documentId, uploadUrl, headers }
///   2. `putToR2(...)`     → PUT directly to the presigned R2 URL with
///                            the file bytes. APIClient is bypassed —
///                            this hits Cloudflare, not us, so the
///                            Bearer token would only confuse things.
///   3. `complete(...)`    → POST /api/mobile/documents (mode: "complete")
///                            server HEADs R2, verifies size, flips the
///                            row from `pending` to `active`.
///
/// The wizard runs all three for every file the owner picks. A
/// failure at any stage surfaces as an `APIError` so the UI can show
/// a per-file retry.

import Foundation

enum DocumentsAPI {
    /// All nine categories the web's document schema supports. Order
    /// here matches the order they render in the wizard.
    enum Category: String, CaseIterable, Equatable, Codable {
        case architectural
        case structuralEngineering = "structural_engineering"
        case civilEngineering      = "civil_engineering"
        case specifications
        case landReport            = "land_report"
        case soilReport            = "soil_report"
        case energyRating          = "energy_rating"
        case townPlanning          = "town_planning"
        case other
    }

    /// Server's response to mode="init".
    struct InitResponse: Decodable {
        let documentId: String
        let uploadUrl: String
        let uploadHeaders: [String: String]
    }

    /// Server's response to mode="complete".
    struct CompleteResponse: Decodable {
        struct Document: Decodable, Equatable {
            let id: String
            let category: String
            let filename: String
            let contentType: String
            let sizeBytes: Int
            let status: String
            let createdAt: String
        }
        let document: Document
    }

    // MARK: - Phase 1: init

    private struct InitRequest: Encodable {
        let mode: String
        let projectId: String
        let tenderId: String?
        let category: String
        let filename: String
        let contentType: String
        let sizeBytes: Int

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(mode, forKey: .mode)
            try c.encode(projectId, forKey: .projectId)
            try c.encodeIfPresent(tenderId, forKey: .tenderId)
            try c.encode(category, forKey: .category)
            try c.encode(filename, forKey: .filename)
            try c.encode(contentType, forKey: .contentType)
            try c.encode(sizeBytes, forKey: .sizeBytes)
        }
        enum CodingKeys: String, CodingKey {
            case mode, projectId, tenderId, category, filename, contentType, sizeBytes
        }
    }

    /// Reserve a document row on the server and mint a 5-minute
    /// presigned R2 PUT URL. The bytes haven't moved yet — that's
    /// `putToR2(...)` next.
    ///
    /// Pass `tenderId` to attach the document to a tender (builder
    /// uploads, e.g. a BoQ or insurance cert) rather than to the
    /// project itself (owner uploads). The server gates each path on
    /// the matching ownership.
    static func initUpload(
        projectId: String,
        tenderId: String? = nil,
        category: Category,
        filename: String,
        contentType: String,
        sizeBytes: Int
    ) async throws -> InitResponse {
        let body = InitRequest(
            mode: "init",
            projectId: projectId,
            tenderId: tenderId,
            category: category.rawValue,
            filename: filename,
            contentType: contentType,
            sizeBytes: sizeBytes
        )
        return try await APIClient.shared.post(
            "/api/mobile/documents",
            body: body
        )
    }

    // MARK: - Phase 2: direct R2 PUT

    /// PUT the file bytes directly to Cloudflare R2 via the presigned
    /// URL returned by `initUpload(...)`. NOT through `APIClient` —
    /// that's for our own API, this is a third-party destination. The
    /// Bearer token must NOT be attached (R2 would reject the signed
    /// URL on extra auth headers).
    ///
    /// Returns on a 2xx response. Throws `APIError.unknown(...)` on
    /// any non-2xx so the caller can show "couldn't upload".
    static func putToR2(
        uploadUrl: String,
        uploadHeaders: [String: String],
        fileData: Data
    ) async throws {
        guard let url = URL(string: uploadUrl) else {
            throw APIError.unknown(
                message: "Invalid upload URL.",
                status: 0
            )
        }
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        for (key, value) in uploadHeaders {
            req.setValue(value, forHTTPHeaderField: key)
        }
        req.httpBody = fileData

        // Dedicated URLSession with a generous resource timeout — big
        // PDF/DWG uploads can take a while on a phone hotspot. We
        // don't share `APIClient`'s session to keep its 15s/30s
        // timeouts intact for normal API calls.
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120
        config.timeoutIntervalForResource = 600
        let session = URLSession(configuration: config)

        let (_, response): (Data, URLResponse)
        do {
            (_, response) = try await session.data(for: req)
        } catch let error as URLError {
            throw APIError.network(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.unknown(
                message: "Upload failed: non-HTTP response.",
                status: 0
            )
        }
        if !(200..<300).contains(http.statusCode) {
            throw APIError.unknown(
                message: "Upload failed (\(http.statusCode)).",
                status: http.statusCode
            )
        }
    }

    // MARK: - Phase 3: complete

    private struct CompleteRequest: Encodable {
        let mode: String
        let projectId: String
        let tenderId: String?
        let documentId: String

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(mode, forKey: .mode)
            try c.encode(projectId, forKey: .projectId)
            try c.encodeIfPresent(tenderId, forKey: .tenderId)
            try c.encode(documentId, forKey: .documentId)
        }
        enum CodingKeys: String, CodingKey {
            case mode, projectId, tenderId, documentId
        }
    }

    /// Tell the server we finished uploading. Server HEADs R2 to
    /// confirm the bytes landed and flips the row to `active`. Pass the
    /// same `tenderId` used at init for tender attachments.
    static func complete(
        projectId: String,
        tenderId: String? = nil,
        documentId: String
    ) async throws -> CompleteResponse.Document {
        let body = CompleteRequest(
            mode: "complete",
            projectId: projectId,
            tenderId: tenderId,
            documentId: documentId
        )
        let response: CompleteResponse = try await APIClient.shared.post(
            "/api/mobile/documents",
            body: body
        )
        return response.document
    }

    // MARK: - Delete (soft)

    private struct DeleteRequest: Encodable {
        let mode = "delete"
        let projectId: String
        let tenderId: String?
        let documentId: String
    }

    /// Soft-delete a document. Same ownership gate as upload. Pass the
    /// same `tenderId` used at upload for tender attachments.
    @discardableResult
    static func delete(
        projectId: String,
        tenderId: String? = nil,
        documentId: String
    ) async throws -> Bool {
        struct Ack: Decodable { let ok: Bool }
        let res: Ack = try await APIClient.shared.post(
            "/api/mobile/documents",
            body: DeleteRequest(projectId: projectId, tenderId: tenderId, documentId: documentId)
        )
        return res.ok
    }
}
