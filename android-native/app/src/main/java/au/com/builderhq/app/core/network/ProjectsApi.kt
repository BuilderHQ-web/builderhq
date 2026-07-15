package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.BrowseResponse
import au.com.builderhq.app.core.network.dto.DocumentDownloadDto
import au.com.builderhq.app.core.network.dto.ProjectDetailDto
import au.com.builderhq.app.core.network.dto.SaveResponse
import au.com.builderhq.app.core.network.dto.UnlockResponse
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Marketplace + project surface (served by the @AuthClient Retrofit). */
interface ProjectsApi {
    @GET("api/mobile/projects/browse")
    suspend fun browse(
        @Query("scope") scope: String? = null,
        @Query("q") q: String? = null,
        @Query("type") type: String? = null,
        @Query("state") state: String? = null,
        @Query("postcode") postcode: String? = null,
        @Query("budgets") budgets: String? = null,
        @Query("serviceArea") serviceArea: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
    ): Response<BrowseResponse>

    @GET("api/mobile/projects/{slug}")
    suspend fun detail(@Path("slug") slug: String): Response<ProjectDetailDto>

    @POST("api/mobile/projects/{slug}/unlock")
    suspend fun unlock(@Path("slug") slug: String): Response<UnlockResponse>

    @POST("api/mobile/projects/{slug}/save")
    suspend fun save(@Path("slug") slug: String): Response<SaveResponse>

    @DELETE("api/mobile/projects/{slug}/save")
    suspend fun unsave(@Path("slug") slug: String): Response<SaveResponse>

    @GET("api/mobile/documents/{documentId}/download")
    suspend fun documentDownloadUrl(@Path("documentId") documentId: String): Response<DocumentDownloadDto>
}
