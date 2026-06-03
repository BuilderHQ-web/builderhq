/// BuilderAPI — typed endpoints for builder onboarding + verification.
///
/// All routes live under `/api/mobile/profile/builder/*` (or
/// `/api/mobile/profile/abn-verify`). Auth is bearer-JWT, role-gated
/// server-side; from the iOS side we just call through APIClient.shared.
///
/// Response shapes mirror the Drizzle rows the server returns. Date
/// fields use ISO-8601 strings (JSON has no Date type); the SwiftUI
/// layer parses them on demand.

import Foundation

enum BuilderAPI {
    // MARK: - Models

    /// Database row for `builder_profiles`. Keys arrive camelCased
    /// (Drizzle's `casing: "snake_case"` is column-only — TS property
    /// accessors stay camelCase, and JSON.stringify mirrors that).
    struct Profile: Codable, Equatable {
        let userId: String
        let companyName: String
        let tradingName: String?
        let abn: String?
        let acn: String?
        let businessAddressLine1: String?
        let businessSuburb: String?
        let businessState: String?
        let businessPostcode: String?
        let hasDifferentPostal: Bool
        let postalAddressLine1: String?
        let postalSuburb: String?
        let postalState: String?
        let postalPostcode: String?
        let bio: String?
        let logoR2Key: String?
        let website: String?
        let linkedinUrl: String?
        let instagramUrl: String?
        let yearsInOperation: Int?
        let slug: String?
        let approvalStatus: String
    }

    struct Licence: Codable, Equatable, Identifiable {
        let id: String
        let builderId: String
        let state: String
        let licenceType: String
        let licenceNumber: String
        let licenceHolderName: String?
        let issuedAt: String?
        let expiresAt: String?
        let verificationStatus: String?
    }

    struct ServiceArea: Codable, Equatable, Identifiable {
        let id: String
        let builderId: String
        let state: String
        let suburb: String?
        let postcode: String?
        let radiusKm: Int
    }

    struct ProjectCategory: Codable, Equatable {
        let builderId: String
        let category: String
    }

    /// Mirrors the server's `BuilderLockState` exactly:
    ///   - `abn`       — whether the current ABN is server-verified and
    ///                    therefore field-locked (ABN + legal entity
    ///                    name can't be edited from the client).
    ///   - `licences`  — per-licence lock map keyed by licence id;
    ///                    `true` = verified, can't be edited.
    struct LockState: Codable, Equatable {
        let abn: Bool
        let licences: [String: Bool]
    }

    /// Full bundle returned by GET /api/mobile/profile/builder.
    struct Bundle: Codable, Equatable {
        let profile: Profile?
        let licences: [Licence]
        let serviceAreas: [ServiceArea]
        let categories: [ProjectCategory]
        let lockState: LockState
        /// User-row contact phone (E.164), top-level because it lives
        /// on `users`, not the builder profile. Seeds the wizard's
        /// phone field on resume. Optional for backward-compat with
        /// any cached/legacy response that predates the field.
        let phone: String?
    }

    // MARK: - Fetch bundle

    /// Returns the builder's full bundle (profile + licences + service
    /// areas + categories + lockState). Mobile uses this on wizard
    /// mount to drive resume-from-step.
    static func fetchBundle() async throws -> Bundle {
        try await APIClient.shared.get("/api/mobile/profile/builder")
    }

    // MARK: - Profile patch

    /// Partial profile patch. Send any subset of the schema fields; the
    /// server merges with the existing row before validating + saving.
    /// Returns the fresh profile so the view model can refresh state.
    struct ProfilePatchResponse: Decodable {
        let profile: Profile
    }

    static func patchProfile(_ patch: [String: Any?]) async throws -> Profile {
        let body = JSONAnyEncodable(patch.compactMapValues { $0 })
        let response: ProfilePatchResponse = try await APIClient.shared.post(
            "/api/mobile/profile/builder",
            body: body
        )
        return response.profile
    }

    // MARK: - Categories (replace-all)

    struct SetCategoriesRequest: Encodable {
        let categories: [String]
    }

    static func setCategories(_ categories: [String]) async throws {
        try await APIClient.shared.postDiscarding(
            "/api/mobile/profile/builder/categories",
            body: SetCategoriesRequest(categories: categories)
        )
    }

    // MARK: - Service areas (replace-all)

    struct ServiceAreaPayload: Encodable {
        let state: String
        let suburb: String?
        let postcode: String?
        let radiusKm: Int
    }

    struct SetServiceAreasRequest: Encodable {
        let areas: [ServiceAreaPayload]
    }

    static func setServiceAreas(_ areas: [ServiceAreaPayload]) async throws {
        try await APIClient.shared.postDiscarding(
            "/api/mobile/profile/builder/service-areas",
            body: SetServiceAreasRequest(areas: areas)
        )
    }

    // MARK: - Licences (add + delete)

    struct AddLicenceRequest: Encodable {
        let state: String
        let licenceType: String
        let licenceNumber: String
        let licenceHolderName: String?
        let issuedAt: String?
        let expiresAt: String?
    }

    /// Verification status returned alongside an added licence. Matches
    /// the discriminated union the server returns from `verifyLicence`.
    struct VerifyLicenceResult: Decodable, Equatable {
        let status: String          // verified | inactive | not_found | mismatch | manual_review | error
        let verificationId: String
        let matchedName: String?
        let expiresAt: String?
        let classLabel: String?
        let provider: String?
        let reason: String?
    }

    struct AddLicenceResponse: Decodable {
        let licence: Licence
        let verification: VerifyLicenceResult?
    }

    /// Add a licence. Server immediately runs verifyLicence afterwards
    /// (VIC live via VBA; other states return `manual_review`). The
    /// response includes both the inserted row + the verify outcome.
    static func addLicence(
        state: String,
        licenceType: String,
        licenceNumber: String,
        licenceHolderName: String?,
        issuedAt: String?,
        expiresAt: String?
    ) async throws -> AddLicenceResponse {
        try await APIClient.shared.post(
            "/api/mobile/profile/builder/licences",
            body: AddLicenceRequest(
                state: state,
                licenceType: licenceType,
                licenceNumber: licenceNumber,
                licenceHolderName: licenceHolderName,
                issuedAt: issuedAt,
                expiresAt: expiresAt
            )
        )
    }

    static func removeLicence(id: String) async throws {
        // DELETE doesn't exist on APIClient yet — we mint a one-off
        // URLRequest. Bearer token attached the same way the rest of
        // the client does it.
        let url = APIBase.url.appending(
            path: "/api/mobile/profile/builder/licences/\(id)"
        )
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = try? KeychainStore.auth.get(
            KeychainStore.Key.accessToken
        ) {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (_, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode)
        else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if code == 404 {
                throw APIError.notFound(message: "Licence not found.")
            }
            throw APIError.unknown(
                message: "Failed to remove licence (\(code))",
                status: code
            )
        }
    }

    // MARK: - ABN verify

    struct AbrAutofill: Codable, Equatable {
        let legalEntityName: String
        let acn: String?
        let state: String?
        let postcode: String?
        let entityTypeLabel: String
        let gstRegistered: Bool
    }

    /// Verified outcome includes the autofill the server already applied
    /// to the profile. The wizard reflects the autofill in its local
    /// state and locks the ABN field.
    struct VerifyAbnSuccess: Codable, Equatable {
        let status: String   // "verified"
        let matchedName: String
        let autofill: AbrAutofill
        let applied: Bool
    }

    struct VerifyAbnFailure: Codable, Equatable {
        let status: String   // "inactive" | "not_found" | "error"
        let reason: String
    }

    /// Discriminated result. Caller pattern-matches on `.success` vs
    /// `.failure` to render either the autofill confirmation card or
    /// the inline error chip.
    enum VerifyAbnResult: Equatable {
        case success(VerifyAbnSuccess)
        case failure(VerifyAbnFailure)
    }

    private struct VerifyAbnEnvelope: Decodable {
        let status: String
        // Verified path
        let matchedName: String?
        let autofill: AbrAutofill?
        let applied: Bool?
        // Failure path
        let reason: String?
    }

    struct VerifyAbnRequest: Encodable {
        let abn: String
    }

    static func verifyAbn(_ abn: String) async throws -> VerifyAbnResult {
        let response: VerifyAbnEnvelope = try await APIClient.shared.post(
            "/api/mobile/profile/abn-verify",
            body: VerifyAbnRequest(abn: abn)
        )
        if response.status == "verified",
           let matchedName = response.matchedName,
           let autofill = response.autofill {
            return .success(
                VerifyAbnSuccess(
                    status: "verified",
                    matchedName: matchedName,
                    autofill: autofill,
                    applied: response.applied ?? false
                )
            )
        }
        return .failure(
            VerifyAbnFailure(
                status: response.status,
                reason: response.reason ?? "We couldn't verify that ABN."
            )
        )
    }

    // MARK: - Submit for approval

    struct SubmitResponse: Decodable {
        let ok: Bool
        let approved: Bool
        let reasons: [String]
        let user: AuthSession.AuthUser
    }

    /// Finalize the wizard. Returns whether the builder was
    /// auto-approved (ABN + ≥1 licence verified) or routed to
    /// `pending_review`. The fresh user object has
    /// `needsOnboarding: false` so AuthSession can swap to MainTabs.
    static func submit() async throws -> SubmitResponse {
        try await APIClient.shared.post(
            "/api/mobile/profile/builder/submit",
            body: EmptyBody()
        )
    }
}

// MARK: - JSONAnyEncodable helper

/// Encodes a `[String: Any]` as JSON — used by partial-profile patches
/// where the keys are dynamic and the values are a mix of primitive
/// types (String, Int, Bool, nil). Avoids declaring a struct per slice
/// of the profile schema.
private struct JSONAnyEncodable: Encodable {
    let dict: [String: Any]

    init(_ dict: [String: Any]) { self.dict = dict }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: AnyKey.self)
        for (key, value) in dict {
            let k = AnyKey(stringValue: key)!
            switch value {
            case let v as String: try container.encode(v, forKey: k)
            case let v as Int: try container.encode(v, forKey: k)
            case let v as Bool: try container.encode(v, forKey: k)
            case let v as Double: try container.encode(v, forKey: k)
            case is NSNull: try container.encodeNil(forKey: k)
            default:
                // Unknown / unsupported type — skip silently. The wizard
                // never sends complex shapes through this code path.
                continue
            }
        }
    }

    private struct AnyKey: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { return nil }
    }
}
