package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.data.TokenStore
import au.com.builderhq.app.core.network.dto.RefreshRequest
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * On a 401 from an authenticated request, rotate the session once: present
 * the refresh token (via the un-authenticated [RefreshApi]), persist the new
 * pair, and retry the original request with the fresh access token. A mutex
 * serialises concurrent 401s so only one refresh happens; the others pick up
 * the freshly-stored token. If refresh fails, tokens are cleared and the
 * request is abandoned (→ the session bootstrap routes back to sign-in).
 */
class TokenAuthenticator(
    private val tokenStore: TokenStore,
    private val refreshApi: RefreshApi,
) : Authenticator {

    private val mutex = Mutex()

    private val noRefreshPaths = listOf(
        "/auth/login", "/auth/signup", "/auth/verify",
        "/auth/forgot", "/auth/reset", "/auth/resend", "/auth/refresh",
    )

    override fun authenticate(route: Route?, response: Response): Request? {
        val path = response.request.url.encodedPath
        if (noRefreshPaths.any { path.contains(it) }) return null
        if (responseCount(response) >= 2) return null // already retried once

        val refresh = runBlocking { tokenStore.refreshToken() } ?: return null

        return runBlocking {
            mutex.withLock {
                val failedToken = response.request.header("Authorization")
                    ?.removePrefix("Bearer ")
                val current = tokenStore.accessToken()
                // Another thread refreshed while we waited — reuse it.
                if (!current.isNullOrBlank() && current != failedToken) {
                    return@withLock retryWith(response.request, current)
                }
                val result = runCatching { refreshApi.refresh(RefreshRequest(refresh)) }.getOrNull()
                val body = result?.body()
                if (result != null && result.isSuccessful && body != null) {
                    tokenStore.saveTokens(
                        access = body.accessToken,
                        refresh = body.refreshToken,
                        accessExpiresAtEpochMs = parseIsoToEpochMs(body.accessExpiresAt),
                    )
                    retryWith(response.request, body.accessToken)
                } else {
                    tokenStore.clear()
                    null
                }
            }
        }
    }

    private fun retryWith(request: Request, token: String): Request =
        request.newBuilder().header("Authorization", "Bearer $token").build()

    private fun responseCount(response: Response): Int {
        var r: Response? = response
        var count = 0
        while (r != null) {
            count++
            r = r.priorResponse
        }
        return count
    }
}
