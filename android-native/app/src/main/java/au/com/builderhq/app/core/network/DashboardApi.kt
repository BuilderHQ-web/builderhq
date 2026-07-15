package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.BuilderDashboardDto
import retrofit2.Response
import retrofit2.http.GET

/** Builder dashboard surface (served by the @AuthClient Retrofit). */
interface DashboardApi {
    @GET("api/mobile/dashboard/builder")
    suspend fun builder(): Response<BuilderDashboardDto>
}
