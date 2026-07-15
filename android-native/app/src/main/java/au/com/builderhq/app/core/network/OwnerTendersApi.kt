package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.DecisionRequest
import au.com.builderhq.app.core.network.dto.DecisionResponse
import au.com.builderhq.app.core.network.dto.OwnerTenderResponse
import au.com.builderhq.app.core.network.dto.TenderCompareDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/** Owner tender review surface (served by the @AuthClient Retrofit). */
interface OwnerTendersApi {
    @GET("api/mobile/projects/{slug}/tenders")
    suspend fun compare(@Path("slug") slug: String): Response<TenderCompareDto>

    @GET("api/mobile/tenders/{id}/owner")
    suspend fun tender(@Path("id") id: String): Response<OwnerTenderResponse>

    @POST("api/mobile/tenders/{id}/decision")
    suspend fun decide(@Path("id") id: String, @Body body: DecisionRequest): Response<DecisionResponse>
}
