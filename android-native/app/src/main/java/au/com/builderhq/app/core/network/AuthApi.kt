package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.AuthSessionDto
import au.com.builderhq.app.core.network.dto.ForgotPasswordRequest
import au.com.builderhq.app.core.network.dto.ForgotPasswordResponse
import au.com.builderhq.app.core.network.dto.LoginRequest
import au.com.builderhq.app.core.network.dto.LogoutRequest
import au.com.builderhq.app.core.network.dto.MeResponse
import au.com.builderhq.app.core.network.dto.RefreshRequest
import au.com.builderhq.app.core.network.dto.RefreshResponse
import au.com.builderhq.app.core.network.dto.ResendRequest
import au.com.builderhq.app.core.network.dto.ResendResponse
import au.com.builderhq.app.core.network.dto.ResetPasswordRequest
import au.com.builderhq.app.core.network.dto.SignupRequest
import au.com.builderhq.app.core.network.dto.SignupResponse
import au.com.builderhq.app.core.network.dto.VerifyRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Auth surface. The pre-session endpoints (login/signup/verify/resend/
 *  forgot/reset) carry no token; they're all listed in the authenticator's
 *  noRefreshPaths so a 401 from them never triggers a token rotation. */
interface AuthApi {
    @POST("api/mobile/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthSessionDto>

    @POST("api/mobile/auth/signup")
    suspend fun signup(@Body body: SignupRequest): Response<SignupResponse>

    @POST("api/mobile/auth/verify")
    suspend fun verify(@Body body: VerifyRequest): Response<AuthSessionDto>

    @POST("api/mobile/auth/resend-code")
    suspend fun resendCode(@Body body: ResendRequest): Response<ResendResponse>

    @POST("api/mobile/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<ForgotPasswordResponse>

    @POST("api/mobile/auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<AuthSessionDto>

    @GET("api/mobile/auth/me")
    suspend fun me(): Response<MeResponse>

    @POST("api/mobile/auth/logout")
    suspend fun logout(@Body body: LogoutRequest): Response<Unit>
}

/** Refresh runs on the @BaseClient (no authenticator) so token rotation
 *  can never recurse through the 401 authenticator. */
interface RefreshApi {
    @POST("api/mobile/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): Response<RefreshResponse>
}
