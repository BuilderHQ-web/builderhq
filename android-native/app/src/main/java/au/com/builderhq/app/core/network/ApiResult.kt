package au.com.builderhq.app.core.network

/**
 * Outcome of an API call. Maps the backend's `{ error: { code, message } }`
 * envelope + HTTP status into something the UI can branch on without
 * leaking Retrofit/OkHttp types upward.
 */
sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>

    data class Error(
        val code: String,
        val message: String,
        val httpStatus: Int,
        val fieldErrors: Map<String, String> = emptyMap(),
    ) : ApiResult<Nothing>

    /** No usable HTTP response (offline, timeout, DNS, etc.). */
    data class NetworkError(val throwable: Throwable) : ApiResult<Nothing>
}

inline fun <T> ApiResult<T>.onSuccess(block: (T) -> Unit): ApiResult<T> {
    if (this is ApiResult.Success) block(data)
    return this
}
