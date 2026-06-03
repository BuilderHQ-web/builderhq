/// HomeScreen — role-aware dispatcher for the Home tab.
///
/// Reads the current signed-in user's role from AuthSession and
/// renders the right dashboard:
///   · `.builder`      → BuilderHomeScreen (FBA hero, suggested feed)
///   · `.projectOwner` → OwnerDashboardScreen (your projects, tenders)
///   · `.admin`        → falls through to BuilderHomeScreen (admins
///                        rarely use mobile — guard cheaply)
///
/// Splitting the two role experiences into separate screens keeps each
/// focused on the metrics + actions that role actually cares about,
/// rather than a single conditional-laden screen.

import SwiftUI

struct HomeScreen: View {
    @Environment(AuthSession.self) private var session

    var body: some View {
        switch role {
        case .builder, .admin:
            BuilderHomeScreen()
        case .projectOwner:
            OwnerDashboardScreen()
        }
    }

    private var role: AuthSession.Role {
        if case let .signedIn(user) = session.state {
            return user.role
        }
        return .builder
    }
}
