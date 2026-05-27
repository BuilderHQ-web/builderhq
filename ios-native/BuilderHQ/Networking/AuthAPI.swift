/// AuthAPI — typed endpoints for /api/mobile/auth/*.
///
/// Mirrors the four routes the server exposes today:
///   · POST /login   — exchange email+password for tokens
///   · POST /refresh — rotate the refresh token
///   · POST /logout  — revoke the refresh token server-side
///   · GET  /me      — return the authenticated user
///
/// These match the existing RN client at `mobile/lib/auth.tsx` so
/// behaviour is identical across platforms.

import Foundation

enum AuthAPI {
    // MARK: - Login

    struct LoginRequest: Encodable {
        let email: String
        let password: String
    }

    struct LoginResponse: Decodable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int
        let accessExpiresAt: String
        let user: AuthSession.AuthUser
    }

    /// Calls /api/mobile/auth/login. On success, persists tokens to
    /// the Keychain and returns the user. Caller should pass the
    /// user up to AuthSession.didSignIn(user:).
    static func login(email: String, password: String) async throws -> AuthSession.AuthUser {
        let body = LoginRequest(email: email, password: password)
        let response: LoginResponse = try await APIClient.shared.post(
            "/api/mobile/auth/login",
            body: body,
            authed: false
        )
        try KeychainStore.auth.set(
            KeychainStore.Key.accessToken,
            value: response.accessToken
        )
        try KeychainStore.auth.set(
            KeychainStore.Key.refreshToken,
            value: response.refreshToken
        )
        try KeychainStore.auth.set(
            KeychainStore.Key.accessExpiresAt,
            value: response.accessExpiresAt
        )
        try KeychainStore.auth.set(
            KeychainStore.Key.userId,
            value: response.user.id
        )
        return response.user
    }

    // MARK: - Logout

    struct LogoutRequest: Encodable {
        let refreshToken: String
    }

    /// Fire-and-forget server-side revocation. Even if it fails the
    /// caller wipes local state — the refresh token expires in <=60
    /// days regardless, and logout has to feel responsive.
    static func logout() async {
        let refreshToken = try? KeychainStore.auth.get(KeychainStore.Key.refreshToken)
        if let token = refreshToken {
            let body = LogoutRequest(refreshToken: token)
            _ = try? await APIClient.shared.postDiscarding(
                "/api/mobile/auth/logout",
                body: body,
                authed: false
            )
        }
        try? KeychainStore.auth.clearAll()
    }

    // MARK: - Me

    struct MeResponse: Decodable {
        let user: AuthSession.AuthUser
    }

    /// Hydrates the current user from the server. Used on app boot
    /// when we have tokens but don't yet have a fresh user object.
    static func me() async throws -> AuthSession.AuthUser {
        let response: MeResponse = try await APIClient.shared.get(
            "/api/mobile/auth/me"
        )
        return response.user
    }
}
