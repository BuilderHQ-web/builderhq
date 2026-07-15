package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    val deviceLabel: String? = null,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    val role: String,
    val needsOnboarding: Boolean = false,
)

@Serializable
data class AuthSessionDto(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val accessExpiresAt: String,
    val user: UserDto,
)

@Serializable
data class MeResponse(val user: UserDto)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class RefreshResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val accessExpiresAt: String,
)

@Serializable
data class LogoutRequest(val refreshToken: String? = null)

// ── sign-up → verify ──

@Serializable
data class SignupRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val password: String,
    val role: String, // "project_owner" | "builder"
    val deviceLabel: String? = null,
)

@Serializable
data class SignupResponse(
    val email: String,
    val codeExpiresAt: String,
)

@Serializable
data class VerifyRequest(
    val email: String,
    val code: String,
    val deviceLabel: String? = null,
)

@Serializable
data class ResendRequest(val email: String)

@Serializable
data class ResendResponse(
    val throttled: Boolean = false,
    val codeExpiresAt: String? = null,
)

// ── forgot → reset ──

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ForgotPasswordResponse(val codeExpiresAt: String? = null)

@Serializable
data class ResetPasswordRequest(
    val email: String,
    val code: String,
    val password: String,
    val deviceLabel: String? = null,
)

// ── error envelope ──

@Serializable
data class ApiErrorEnvelope(val error: ApiErrorBody? = null)

@Serializable
data class ApiErrorBody(
    val code: String? = null,
    val message: String? = null,
    /** Field-level validation errors (signup); keyed by field name. */
    val details: Map<String, String>? = null,
)
