/// AuthSession — observable session state, wired to real auth.
///
/// State machine:
///   · loading   — at boot, while we read keychain + call /me
///   · signedOut — no valid session
///   · signedIn  — confirmed by a successful /me call
///
/// Single source of truth for "who's logged in" across the app.
/// SwiftUI views read `@Environment(AuthSession.self)` and rerender
/// when the state changes (iOS 17 `@Observable`).

import Foundation
import Observation

@Observable
@MainActor
final class AuthSession {
    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(user: AuthUser)
    }

    /// Server payload shape. snake_case in JSON, camelCase in Swift —
    /// the APIClient decoder handles the conversion.
    struct AuthUser: Codable, Equatable {
        let id: String
        let email: String
        let name: String?
        let role: Role
        /// True when the user has signed in / verified but hasn't yet
        /// finished the role-specific onboarding wizard. Mirrors the
        /// gate the web's (app) layout uses to bounce to /onboarding.
        /// Decoded with a `true`-default so a stale server response
        /// (pre-onboarding-gate API version) never lets an unbaked
        /// account slip past — better to over-show the wizard than
        /// land in a half-populated dashboard.
        let needsOnboarding: Bool

        enum CodingKeys: String, CodingKey {
            case id, email, name, role, needsOnboarding
        }

        init(
            id: String,
            email: String,
            name: String?,
            role: Role,
            needsOnboarding: Bool
        ) {
            self.id = id
            self.email = email
            self.name = name
            self.role = role
            self.needsOnboarding = needsOnboarding
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            self.id = try c.decode(String.self, forKey: .id)
            self.email = try c.decode(String.self, forKey: .email)
            self.name = try c.decodeIfPresent(String.self, forKey: .name)
            self.role = try c.decode(Role.self, forKey: .role)
            self.needsOnboarding =
                try c.decodeIfPresent(Bool.self, forKey: .needsOnboarding) ?? true
        }
    }

    enum Role: String, Codable {
        case projectOwner = "project_owner"
        case builder
        case admin
    }

    private(set) var state: State = .loading

    init() {
        // Hook the forced-logout handler. APIClient calls this when
        // the refresh chain dies; we wipe local state and flip to
        // signedOut so the UI bounces back to the login screen.
        APIClient.shared.onForcedLogout = { [weak self] in
            await self?.didSignOut()
        }
        Task { await hydrate() }
    }

    // MARK: - Hydrate from boot

    /// Called at app launch. Reads cached tokens; if present, validates
    /// them by hitting /me. Three outcomes:
    ///   · No tokens                    → signedOut
    ///   · Tokens valid (or refreshable) → signedIn with the user
    ///   · Tokens dead                  → signedOut + keychain cleared
    func hydrate() async {
        let access = try? KeychainStore.auth.get(KeychainStore.Key.accessToken)
        let refresh = try? KeychainStore.auth.get(KeychainStore.Key.refreshToken)
        if access == nil && refresh == nil {
            state = .signedOut
            return
        }
        do {
            let user = try await AuthAPI.me()
            state = .signedIn(user: user)
        } catch APIError.unauthorized {
            // Both access AND refresh chains dead. Wipe everything.
            try? KeychainStore.auth.clearAll()
            state = .signedOut
        } catch {
            // Network blip on cold start. Keep whatever state we had
            // — a flaky connection on boot shouldn't bounce the user
            // to login. We default to signedOut so the user can at
            // least try to log in manually.
            state = .signedOut
        }
    }

    // MARK: - Sign in (from LoginScreen success)

    func didSignIn(user: AuthUser) {
        state = .signedIn(user: user)
    }

    // MARK: - Onboarding completion

    /// Called by an onboarding wizard after the server confirms the
    /// profile is saved + onboarding is marked complete. Just swaps in
    /// the fresh user (which has needsOnboarding = false), which trips
    /// the RootView to render MainTabs instead of OnboardingFlow.
    func didCompleteOnboarding(user: AuthUser) {
        state = .signedIn(user: user)
    }

    // MARK: - Sign out

    func didSignOut() async {
        // Fire-and-forget server-side revocation + wipe local state.
        await AuthAPI.logout()
        state = .signedOut
    }
}
