package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.CostLinesRequest
import au.com.builderhq.app.core.network.dto.TenderPatchRequest
import au.com.builderhq.app.core.network.dto.TenderPayloadDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

/** Tender composer surface (served by the @AuthClient Retrofit). Every
 *  endpoint returns the same full payload so the screen can resync. */
interface TendersApi {
    @POST("api/mobile/projects/{slug}/tender")
    suspend fun createForProject(@Path("slug") slug: String): Response<TenderPayloadDto>

    @GET("api/mobile/tenders/{id}")
    suspend fun get(@Path("id") id: String): Response<TenderPayloadDto>

    @PATCH("api/mobile/tenders/{id}")
    suspend fun patch(@Path("id") id: String, @Body body: TenderPatchRequest): Response<TenderPayloadDto>

    @PUT("api/mobile/tenders/{id}/cost-lines")
    suspend fun setCostLines(@Path("id") id: String, @Body body: CostLinesRequest): Response<TenderPayloadDto>

    @POST("api/mobile/tenders/{id}/submit")
    suspend fun submit(@Path("id") id: String): Response<TenderPayloadDto>
}
