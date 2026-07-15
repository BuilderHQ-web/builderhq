package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.ApiErrorEnvelope
import kotlinx.serialization.json.Json
import retrofit2.Response
import java.time.Instant

/** Shared JSON config: tolerate unknown fields + omit nulls (matches the
 *  Next.js backend, which evolves its payloads). Reused by the Retrofit
 *  converter and by error-envelope parsing. */
val bhqJson: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
}

/** Run a Retrofit call and fold it into [ApiResult], parsing the backend
 *  error envelope on failure. Never throws. */
suspend fun <T> safeCall(block: suspend () -> Response<T>): ApiResult<T> = try {
    val resp = block()
    if (resp.isSuccessful) {
        resp.body()?.let { ApiResult.Success(it) }
            ?: ApiResult.Error("internal", "Empty response from server.", resp.code())
    } else {
        val env = runCatching {
            resp.errorBody()?.string()?.takeIf { it.isNotBlank() }
                ?.let { bhqJson.decodeFromString<ApiErrorEnvelope>(it) }
        }.getOrNull()
        ApiResult.Error(
            code = env?.error?.code ?: codeForStatus(resp.code()),
            message = env?.error?.message ?: "Something went wrong. Please try again.",
            httpStatus = resp.code(),
            fieldErrors = env?.error?.details ?: emptyMap(),
        )
    }
} catch (e: Exception) {
    ApiResult.NetworkError(e)
}

private fun codeForStatus(status: Int): String = when (status) {
    400, 422 -> "validation"
    401 -> "unauthorized"
    403 -> "forbidden"
    404 -> "not_found"
    409 -> "conflict"
    429 -> "rate_limited"
    else -> "internal"
}

/** ISO-8601 → epoch millis (java.time is available on minSdk 26). */
fun parseIsoToEpochMs(iso: String): Long =
    runCatching { Instant.parse(iso).toEpochMilli() }.getOrDefault(0L)
