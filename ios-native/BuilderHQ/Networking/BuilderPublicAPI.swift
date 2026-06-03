/// BuilderPublicAPI — a builder's PUBLIC profile (trust page).
///
/// What a project owner fetches to vet a builder they received a tender
/// from, or are messaging. Public-safe subset only (no address, ACN,
/// licence holder names, contact details) — mirrors the server's
/// `MobileBuilderPublicProfile`. `id` is the builder's user id (matches
/// `tender.builder.id` and a conversation's `other.id`).

import Foundation

enum BuilderPublicAPI {
    struct Licence: Decodable, Equatable, Identifiable {
        let id: String
        let state: String
        let licenceType: String
        let licenceNumber: String
        let verificationStatus: String
        let expiresAtIso: String?
    }

    struct ServiceArea: Decodable, Equatable, Identifiable {
        let id: String
        let state: String
        let suburb: String?
        let radiusKm: Int
    }

    struct Stats: Decodable, Equatable {
        let awardedCount: Int
        let licenceCount: Int
        let verifiedLicenceCount: Int
        let serviceAreaCount: Int
    }

    struct Profile: Decodable, Equatable, Identifiable {
        let id: String
        let companyName: String
        let tradingName: String?
        let bio: String?
        let yearsInOperation: Int?
        let state: String?
        let suburb: String?
        let website: String?
        let linkedinUrl: String?
        let instagramUrl: String?
        let slug: String?
        let memberSinceIso: String?
        let abnVerified: Bool
        let licences: [Licence]
        let serviceAreas: [ServiceArea]
        let categories: [String]
        let stats: Stats
    }

    private struct Response: Decodable { let builder: Profile }

    static func fetch(id: String) async throws -> Profile {
        let res: Response = try await APIClient.shared.get("/api/mobile/builders/\(id)")
        return res.builder
    }
}
