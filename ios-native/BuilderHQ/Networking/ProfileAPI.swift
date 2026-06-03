/// ProfileAPI — the owner's profile read.
///
/// Builders already have a rich surface in `BuilderAPI` (bundle, patch,
/// categories, service areas, licences, ABN). Owners only had a POST
/// (onboarding submit), so this adds the read the "You" tab + edit form
/// need. Owner *edits* reuse `AuthAPI.completeOwnerOnboarding` (an
/// idempotent upsert).

import Foundation

enum ProfileAPI {
    struct OwnerProfile: Decodable, Equatable {
        let entityType: String?
        let companyName: String?
        let defaultSuburb: String?
        let defaultState: String?
        let defaultPostcode: String?
        let contactPref: String?
    }

    struct OwnerResponse: Decodable, Equatable {
        let profile: OwnerProfile?
        let name: String?
        let email: String?
        let phone: String?
    }

    static func fetchOwner() async throws -> OwnerResponse {
        try await APIClient.shared.get("/api/mobile/profile/owner")
    }
}
