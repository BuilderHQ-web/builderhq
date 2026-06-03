/// AuthAPI — typed endpoints for /api/mobile/auth/*.
///
/// Mirrors the seven routes the server exposes:
///   · POST /login        — exchange email+password for tokens
///   · POST /signup       — create account, email a 6-digit code
///   · POST /verify       — exchange code for tokens (auto sign-in)
///   · POST /resend-code  — re-mint a 6-digit code (throttled)
///   · POST /refresh      — rotate the refresh token
///   · POST /logout       — revoke the refresh token server-side
///   · GET  /me           — return the authenticated user
///
/// Login + verify both persist tokens to the Keychain so the caller can
/// hand directly to AuthSession.didSignIn(user:).

import Foundation

enum AuthAPI {
    // MARK: - Login

    struct LoginRequest: Encodable {
        let email: String
        let password: String
    }

    /// Shared session-bearing response. Used by /login AND /verify — the
    /// mobile-signup verify step issues the same session shape so the
    /// client treats them identically.
    struct SessionResponse: Decodable {
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
        let response: SessionResponse = try await APIClient.shared.post(
            "/api/mobile/auth/login",
            body: body,
            authed: false
        )
        try persistSession(response)
        return response.user
    }

    // MARK: - Sign up (6-digit OTP flow)

    struct SignupRequest: Encodable {
        let firstName: String
        let lastName: String
        let email: String
        let password: String
        /// `project_owner` or `builder` — admin is server-enforced off.
        let role: String
    }

    struct SignupResponse: Decodable {
        let email: String
        /// ISO-8601 expiry stamp — drives the countdown on the OTP
        /// screen ("expires in 14:53").
        let codeExpiresAt: String
    }

    /// Submit the sign-up form. Returns the email + code expiry so the
    /// verify screen can show a live countdown. The server has emailed
    /// the 6-digit code by the time this resolves.
    static func signup(
        firstName: String,
        lastName: String,
        email: String,
        password: String,
        role: AuthSession.Role
    ) async throws -> SignupResponse {
        let body = SignupRequest(
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            // Use the raw enum value so the server's zod schema accepts
            // the snake_case form ("project_owner").
            role: role.rawValue
        )
        let response: SignupResponse = try await APIClient.shared.post(
            "/api/mobile/auth/signup",
            body: body,
            authed: false
        )
        return response
    }

    struct VerifyCodeRequest: Encodable {
        let email: String
        let code: String
    }

    /// Submit the 6-digit code. On success, persists session tokens
    /// (same as /login) and returns the user — caller hands to
    /// AuthSession.didSignIn(user:).
    static func verifyCode(email: String, code: String) async throws -> AuthSession.AuthUser {
        let body = VerifyCodeRequest(email: email, code: code)
        let response: SessionResponse = try await APIClient.shared.post(
            "/api/mobile/auth/verify",
            body: body,
            authed: false
        )
        try persistSession(response)
        return response.user
    }

    struct ResendCodeRequest: Encodable {
        let email: String
    }

    struct ResendCodeResponse: Decodable {
        /// True when the server refused because we asked too soon. The
        /// UI surfaces a "Hold on — try again in a sec" hint without
        /// implying anything about whether the email is registered.
        let throttled: Bool
        /// nil when throttled — the existing code is still valid, so
        /// the countdown on the OTP screen doesn't restart.
        let codeExpiresAt: String?
    }

    /// Ask the server to mint + email a fresh code. Always succeeds
    /// (the server silently no-ops unknown emails to avoid enumeration);
    /// the `throttled` flag is the only meaningful signal.
    static func resendCode(email: String) async throws -> ResendCodeResponse {
        let body = ResendCodeRequest(email: email)
        return try await APIClient.shared.post(
            "/api/mobile/auth/resend-code",
            body: body,
            authed: false
        )
    }

    // MARK: - Password reset (6-digit OTP flow)

    struct ForgotPasswordRequest: Encodable {
        let email: String
    }

    struct ForgotPasswordResponse: Decodable {
        /// ISO-8601 expiry stamp — drives the countdown on the reset
        /// screen. Always returned (even for unknown emails) so the
        /// endpoint can't be used to probe which accounts exist.
        let codeExpiresAt: String
    }

    /// Request a password-reset code. Always succeeds — the server emails
    /// a code only when the account qualifies, but returns the same shape
    /// regardless so we never leak whether the email is registered. The
    /// client always advances to the reset screen. Also used as the
    /// "resend" action on that screen.
    static func requestPasswordReset(email: String) async throws -> ForgotPasswordResponse {
        let body = ForgotPasswordRequest(email: email)
        return try await APIClient.shared.post(
            "/api/mobile/auth/forgot-password",
            body: body,
            authed: false
        )
    }

    struct ResetPasswordRequest: Encodable {
        let email: String
        let code: String
        /// The new password.
        let password: String
    }

    /// Submit the 6-digit code + a new password. On success the server
    /// resets the password, signs out other devices, and issues a fresh
    /// session — so we persist tokens (same as /login) and return the
    /// user for AuthSession.didSignIn(user:).
    static func resetPassword(
        email: String,
        code: String,
        newPassword: String
    ) async throws -> AuthSession.AuthUser {
        let body = ResetPasswordRequest(email: email, code: code, password: newPassword)
        let response: SessionResponse = try await APIClient.shared.post(
            "/api/mobile/auth/reset-password",
            body: body,
            authed: false
        )
        try persistSession(response)
        return response.user
    }

    // MARK: - Postcode lookup (onboarding autocomplete)

    struct Suburb: Decodable, Hashable, Identifiable {
        let suburb: String
        let state: String
        /// Stable composite id so SwiftUI List/ForEach can identify each
        /// row even when multiple postcodes share a suburb name.
        var id: String { "\(state):\(suburb)" }
    }

    struct PostcodeLookupResponse: Decodable {
        let postcode: String
        let suburbs: [Suburb]
    }

    /// GET /api/mobile/postcodes/{postcode}. Public — no auth required.
    /// Returns an empty `suburbs` array for valid-format-but-unknown
    /// postcodes; the caller surfaces "Postcode not recognised" inline.
    static func lookupPostcode(_ postcode: String) async throws -> [Suburb] {
        let response: PostcodeLookupResponse = try await APIClient.shared.get(
            "/api/mobile/postcodes/\(postcode)",
            authed: false
        )
        return response.suburbs
    }

    // MARK: - Owner onboarding

    struct OwnerOnboardingRequest: Encodable {
        let entityType: String
        let companyName: String?
        let defaultPostcode: String?
        let defaultSuburb: String?
        let defaultState: String?
        let contactPref: String
        /// Required — normalized AU phone (E.164) for the user row.
        let phone: String
    }

    struct OwnerOnboardingResponse: Decodable {
        let ok: Bool
        let user: AuthSession.AuthUser
    }

    /// POST /api/mobile/profile/owner. Upserts + marks complete in one
    /// shot. Returns the fresh user object (needsOnboarding=false) so
    /// the client can flip AuthSession state without a follow-up /me.
    static func completeOwnerOnboarding(
        entityType: String,
        companyName: String?,
        defaultPostcode: String?,
        defaultSuburb: String?,
        defaultState: String?,
        contactPref: String,
        phone: String
    ) async throws -> AuthSession.AuthUser {
        let body = OwnerOnboardingRequest(
            entityType: entityType,
            companyName: companyName,
            defaultPostcode: defaultPostcode,
            defaultSuburb: defaultSuburb,
            defaultState: defaultState,
            contactPref: contactPref,
            phone: phone
        )
        let response: OwnerOnboardingResponse = try await APIClient.shared.post(
            "/api/mobile/profile/owner",
            body: body,
            authed: true
        )
        return response.user
    }

    // MARK: - Session persistence

    /// Pulled out so login + verify share a single source of truth for
    /// what gets persisted to the Keychain after a fresh session is
    /// issued.
    private static func persistSession(_ response: SessionResponse) throws {
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
