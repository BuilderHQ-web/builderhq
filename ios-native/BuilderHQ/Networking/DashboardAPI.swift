/// DashboardAPI — typed accessor for the mobile dashboard bundle endpoints.
///
/// One round-trip per dashboard mount. The server composes everything
/// the home screen needs (approval status, FBA credits, stats, the
/// suggested project feed, recent unlocks, active tenders, activity
/// feed). The view model picks what it renders.
///
/// Endpoints:
///   · GET /api/mobile/dashboard/builder
///   · GET /api/mobile/dashboard/owner  (next session)

import Foundation

enum DashboardAPI {
    // MARK: - Builder bundle

    /// Mirror of the `BuilderProjectRow` shape the server emits in the
    /// `suggested` and `unlocked` arrays.
    struct ProjectRow: Codable, Equatable, Identifiable {
        let id: String
        let slug: String
        let title: String
        let status: String
        let type: String
        let suburb: String?
        let state: String?
        let postcode: String?
        let budgetBand: String?
        let bedrooms: Int?
        let bathrooms: Int?
        let unlockedCount: Int
        let publishedAt: String?
    }

    struct TenderRow: Codable, Equatable, Identifiable {
        let id: String
        let projectId: String
        let projectSlug: String
        let projectTitle: String
        let status: String
        let totalPriceAud: Int?
        let durationWeeks: Int?
        let submittedAt: String?
        let updatedAt: String
    }

    struct ActivityRow: Codable, Equatable, Identifiable {
        let id: String
        let kind: String
        let title: String
        let body: String?
        let actionUrl: String?
        let readAt: String?
        let createdAt: String
    }

    struct ServiceAreaPreview: Codable, Equatable {
        let state: String
        let suburb: String?
        let statewide: Bool
    }

    struct ProfileSummary: Codable, Equatable {
        let hasProfile: Bool
        let approvalStatus: String?
        let companyName: String?
        let tradingName: String?
        let serviceAreas: [ServiceAreaPreview]
    }

    struct Verification: Codable, Equatable {
        let abnVerified: Bool
        let anyLicenceVerified: Bool
        let reasons: [String]
    }

    struct Stats: Codable, Equatable {
        let activeTenders: Int
        let unlockedProjects: Int
        let savedProjects: Int
        let suggestedCount: Int
    }

    /// Discriminated union — `active: true` carries the cycle detail;
    /// `active: false` only carries a reason ("no_grant" / "expired" /
    /// "revoked"). The decoder builds the right case based on the flag.
    enum FbaStatus: Equatable {
        case active(Active)
        case inactive(reason: String)

        struct Active: Equatable {
            let remainingThisCycle: Int
            let monthlyQuota: Int
            let daysToRefresh: Int
            let daysToGrantEnd: Int
            let cycleIndex: Int
            let totalCycles: Int
            let totalSavedAud: Int
        }
    }

    struct BuilderBundle: Decodable, Equatable {
        let profile: ProfileSummary
        let verification: Verification
        let stats: Stats
        let fba: FbaStatus
        let suggested: [ProjectRow]
        let unlocked: [ProjectRow]
        let myTenders: [TenderRow]
        let activity: [ActivityRow]
    }

    /// Fetch the builder dashboard bundle. One call serves the home screen.
    static func fetchBuilderBundle() async throws -> BuilderBundle {
        try await APIClient.shared.get("/api/mobile/dashboard/builder")
    }
}

// MARK: - FbaStatus custom decoder

extension DashboardAPI.FbaStatus: Decodable {
    private enum CodingKeys: String, CodingKey {
        case active, reason
        case remainingThisCycle, monthlyQuota, daysToRefresh, daysToGrantEnd
        case cycleIndex, totalCycles, totalSavedAud
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let isActive = try c.decode(Bool.self, forKey: .active)
        if isActive {
            self = .active(
                Active(
                    remainingThisCycle: try c.decode(Int.self, forKey: .remainingThisCycle),
                    monthlyQuota: try c.decode(Int.self, forKey: .monthlyQuota),
                    daysToRefresh: try c.decode(Int.self, forKey: .daysToRefresh),
                    daysToGrantEnd: try c.decode(Int.self, forKey: .daysToGrantEnd),
                    cycleIndex: try c.decode(Int.self, forKey: .cycleIndex),
                    totalCycles: try c.decode(Int.self, forKey: .totalCycles),
                    totalSavedAud: try c.decode(Int.self, forKey: .totalSavedAud)
                )
            )
        } else {
            self = .inactive(
                reason: try c.decodeIfPresent(String.self, forKey: .reason) ?? "unknown"
            )
        }
    }
}
