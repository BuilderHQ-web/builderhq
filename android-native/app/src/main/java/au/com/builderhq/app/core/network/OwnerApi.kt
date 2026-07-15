package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.CompleteDocRequest
import au.com.builderhq.app.core.network.dto.CompleteDocResponse
import au.com.builderhq.app.core.network.dto.CreateProjectResponse
import au.com.builderhq.app.core.network.dto.DeleteDocRequest
import au.com.builderhq.app.core.network.dto.DeleteProjectResponse
import au.com.builderhq.app.core.network.dto.ExtractResponse
import au.com.builderhq.app.core.network.dto.InitDocRequest
import au.com.builderhq.app.core.network.dto.InitDocResponse
import au.com.builderhq.app.core.network.dto.OwnerDashboardDto
import au.com.builderhq.app.core.network.dto.OwnerProjectDetailDto
import au.com.builderhq.app.core.network.dto.OwnerProjectsResponse
import au.com.builderhq.app.core.network.dto.PostcodeResponse
import au.com.builderhq.app.core.network.dto.ProjectWriteRequest
import au.com.builderhq.app.core.network.dto.PublishResponse
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Owner project + document surface (served by the @AuthClient Retrofit). */
interface OwnerApi {
    @GET("api/mobile/dashboard/owner")
    suspend fun dashboard(): Response<OwnerDashboardDto>

    @GET("api/mobile/projects/mine")
    suspend fun myProjects(
        @Query("status") status: String? = null,
        @Query("q") q: String? = null,
    ): Response<OwnerProjectsResponse>

    @GET("api/mobile/projects/{slug}")
    suspend fun projectDetail(@Path("slug") slug: String): Response<OwnerProjectDetailDto>

    @POST("api/mobile/projects")
    suspend fun create(@Body body: ProjectWriteRequest): Response<CreateProjectResponse>

    @PATCH("api/mobile/projects/{slug}")
    suspend fun patch(@Path("slug") slug: String, @Body body: ProjectWriteRequest): Response<CreateProjectResponse>

    @POST("api/mobile/projects/{slug}/publish")
    suspend fun publish(@Path("slug") slug: String, @Body body: ProjectWriteRequest): Response<PublishResponse>

    @DELETE("api/mobile/projects/{slug}")
    suspend fun delete(@Path("slug") slug: String): Response<DeleteProjectResponse>

    /** Raw PDF bytes — the body's media type carries application/pdf. */
    @POST("api/mobile/projects/extract")
    suspend fun extract(@Body body: RequestBody): Response<ExtractResponse>

    @POST("api/mobile/documents")
    suspend fun initDocument(@Body body: InitDocRequest): Response<InitDocResponse>

    @POST("api/mobile/documents")
    suspend fun completeDocument(@Body body: CompleteDocRequest): Response<CompleteDocResponse>

    @POST("api/mobile/documents")
    suspend fun deleteDocument(@Body body: DeleteDocRequest): Response<Unit>

    @GET("api/mobile/postcodes/{postcode}")
    suspend fun postcode(@Path("postcode") postcode: String): Response<PostcodeResponse>
}
