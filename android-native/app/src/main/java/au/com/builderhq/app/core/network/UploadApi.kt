package au.com.builderhq.app.core.network

import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.PUT
import retrofit2.http.Url

/**
 * Direct-to-R2 presigned upload. Served by the @BaseClient (un-authenticated)
 * Retrofit so our bearer token never reaches R2 and the refresh authenticator
 * doesn't fire on a presign 403.
 */
interface UploadApi {
    @PUT
    suspend fun put(
        @Url url: String,
        @Header("Content-Type") contentType: String,
        @Body body: RequestBody,
    ): Response<Unit>
}
