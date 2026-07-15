package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.AbnVerifyDto
import au.com.builderhq.app.core.network.dto.AbnVerifyRequest
import au.com.builderhq.app.core.network.dto.AddLicenceRequest
import au.com.builderhq.app.core.network.dto.AddLicenceResponse
import au.com.builderhq.app.core.network.dto.BuilderBundleDto
import au.com.builderhq.app.core.network.dto.BuilderCategoriesRequest
import au.com.builderhq.app.core.network.dto.BuilderPatchResponse
import au.com.builderhq.app.core.network.dto.BuilderServiceAreasRequest
import au.com.builderhq.app.core.network.dto.BuilderSubmitResponse
import au.com.builderhq.app.core.network.dto.ProfileOkResponse
import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Builder profile + onboarding endpoints. All bearer-authenticated;
 * the server gates on role=builder.
 *
 * The profile patch takes a raw [JsonObject] so callers control which
 * keys are present vs explicit-null (the server merges: absent = keep,
 * null = clear) — kotlinx's `explicitNulls = false` would otherwise
 * silently drop intentional clears.
 */
interface ProfileApi {

    @GET("api/mobile/profile/builder")
    suspend fun bundle(): Response<BuilderBundleDto>

    @POST("api/mobile/profile/builder")
    suspend fun patchProfile(@Body patch: JsonObject): Response<BuilderPatchResponse>

    @POST("api/mobile/profile/abn-verify")
    suspend fun verifyAbn(@Body body: AbnVerifyRequest): Response<AbnVerifyDto>

    @POST("api/mobile/profile/builder/categories")
    suspend fun setCategories(@Body body: BuilderCategoriesRequest): Response<ProfileOkResponse>

    @POST("api/mobile/profile/builder/service-areas")
    suspend fun setServiceAreas(@Body body: BuilderServiceAreasRequest): Response<ProfileOkResponse>

    @POST("api/mobile/profile/builder/licences")
    suspend fun addLicence(@Body body: AddLicenceRequest): Response<AddLicenceResponse>

    @DELETE("api/mobile/profile/builder/licences/{id}")
    suspend fun removeLicence(@Path("id") id: String): Response<ProfileOkResponse>

    @POST("api/mobile/profile/builder/submit")
    suspend fun submit(): Response<BuilderSubmitResponse>
}
