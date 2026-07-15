package au.com.builderhq.app.core.data

import android.os.Build
import au.com.builderhq.app.core.model.User
import au.com.builderhq.app.core.model.toUser
import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.AuthApi
import au.com.builderhq.app.core.network.parseIsoToEpochMs
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.AuthSessionDto
import au.com.builderhq.app.core.network.dto.ForgotPasswordRequest
import au.com.builderhq.app.core.network.dto.ForgotPasswordResponse
import au.com.builderhq.app.core.network.dto.LoginRequest
import au.com.builderhq.app.core.network.dto.LogoutRequest
import au.com.builderhq.app.core.network.dto.ResendRequest
import au.com.builderhq.app.core.network.dto.ResendResponse
import au.com.builderhq.app.core.network.dto.ResetPasswordRequest
import au.com.builderhq.app.core.network.dto.SignupRequest
import au.com.builderhq.app.core.network.dto.SignupResponse
import au.com.builderhq.app.core.network.dto.VerifyRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/** Single source of truth for "who is signed in". */
@Singleton
class SessionRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenStore: TokenStore,
) {
    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    /** Human-readable handle for this phone, shown in the future "active
     *  devices" settings screen. e.g. "Google Pixel 8". */
    private val deviceLabel: String =
        "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}".trim()

    /** Cold-start: if a refresh token exists, verify via /me; else signed out.
     *  Any failure clears the (stale) tokens and routes to sign-in. */
    suspend fun bootstrap() {
        if (tokenStore.refreshToken().isNullOrBlank()) {
            _state.value = SessionState.SignedOut
            return
        }
        when (val r = safeCall { authApi.me() }) {
            is ApiResult.Success -> _state.value = SessionState.SignedIn(r.data.user.toUser())
            else -> {
                tokenStore.clear()
                _state.value = SessionState.SignedOut
            }
        }
    }

    suspend fun login(email: String, password: String): ApiResult<User> =
        when (val r = safeCall {
            authApi.login(LoginRequest(email.trim().lowercase(), password, deviceLabel))
        }) {
            is ApiResult.Success -> ApiResult.Success(establish(r.data))
            is ApiResult.Error -> r
            is ApiResult.NetworkError -> r
        }

    /** Step 1 of sign-up: create the pending account and trigger the email
     *  code. No session yet — the client routes to the verify screen. */
    suspend fun signup(
        firstName: String,
        lastName: String,
        email: String,
        password: String,
        role: String,
    ): ApiResult<SignupResponse> =
        safeCall {
            authApi.signup(
                SignupRequest(
                    firstName = firstName.trim(),
                    lastName = lastName.trim(),
                    email = email.trim().lowercase(),
                    password = password,
                    role = role,
                    deviceLabel = deviceLabel,
                ),
            )
        }

    /** Step 2 of sign-up: exchange the 6-digit code for a session. */
    suspend fun verify(email: String, code: String): ApiResult<User> =
        when (val r = safeCall {
            authApi.verify(VerifyRequest(email.trim().lowercase(), code.trim(), deviceLabel))
        }) {
            is ApiResult.Success -> ApiResult.Success(establish(r.data))
            is ApiResult.Error -> r
            is ApiResult.NetworkError -> r
        }

    suspend fun resendCode(email: String): ApiResult<ResendResponse> =
        safeCall { authApi.resendCode(ResendRequest(email.trim().lowercase())) }

    suspend fun forgotPassword(email: String): ApiResult<ForgotPasswordResponse> =
        safeCall { authApi.forgotPassword(ForgotPasswordRequest(email.trim().lowercase())) }

    /** Reset with code → establishes a fresh session (auto sign-in). */
    suspend fun resetPassword(email: String, code: String, password: String): ApiResult<User> =
        when (val r = safeCall {
            authApi.resetPassword(
                ResetPasswordRequest(email.trim().lowercase(), code.trim(), password, deviceLabel),
            )
        }) {
            is ApiResult.Success -> ApiResult.Success(establish(r.data))
            is ApiResult.Error -> r
            is ApiResult.NetworkError -> r
        }

    suspend fun logout() {
        runCatching { authApi.logout(LogoutRequest(tokenStore.refreshToken())) }
        tokenStore.clear()
        _state.value = SessionState.SignedOut
    }

    /** Persist tokens + flip to SignedIn. Shared by login / verify / reset. */
    private suspend fun establish(s: AuthSessionDto): User {
        tokenStore.save(
            access = s.accessToken,
            refresh = s.refreshToken,
            accessExpiresAtEpochMs = parseIsoToEpochMs(s.accessExpiresAt),
            userId = s.user.id,
        )
        val user = s.user.toUser()
        _state.value = SessionState.SignedIn(user)
        return user
    }
}
