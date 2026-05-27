/// AuthSession — observable session state.
///
/// Owns the authenticated-user lifecycle. Hydrates from the Keychain
/// on launch (where we store the bearer access + refresh tokens) and
/// publishes a state enum the root view can switch on.
///
/// The networking layer (APIClient) reaches the session for the
/// current access token and the forced-logout callback when refresh
/// fails.
///
/// Implemented with the iOS 17 `@Observable` macro — no
/// `@Published` / `ObservableObject` boilerplate.

import Foundation
import Observation

@Observable
final class AuthSession {
    enum State {
        case loading
        case signedOut
        case signedIn(user: AuthUser)
    }

    /// Mirrors the RN AuthUser shape so backend payloads parse cleanly.
    struct AuthUser: Codable, Equatable {
        let id: String
        let email: String
        let name: String?
        let role: Role
    }

    enum Role: String, Codable {
        case projectOwner = "project_owner"
        case builder
        case admin
    }

    private(set) var state: State = .loading

    init() {
        Task { await hydrate() }
    }

    /// Pulls cached tokens from the Keychain, calls /api/mobile/auth/me
    /// to validate, and sets `state` accordingly. Stubbed for now —
    /// actual implementation lands when APIClient does.
    @MainActor
    private func hydrate() async {
        // TODO: replace with Keychain read + /api/mobile/auth/me.
        // For now, start signed out so the project compiles + the
        // auth flow renders.
        try? await Task.sleep(for: .milliseconds(200))
        state = .signedOut
    }

    /// Called by the login flow on successful auth.
    @MainActor
    func didSignIn(user: AuthUser) {
        state = .signedIn(user: user)
    }

    /// Called on explicit sign-out OR when the refresh chain dies.
    @MainActor
    func didSignOut() {
        state = .signedOut
    }
}
