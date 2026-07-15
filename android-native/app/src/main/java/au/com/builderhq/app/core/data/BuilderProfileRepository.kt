package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.OwnerApi
import au.com.builderhq.app.core.network.ProfileApi
import au.com.builderhq.app.core.network.dto.AbnVerifyDto
import au.com.builderhq.app.core.network.dto.AbnVerifyRequest
import au.com.builderhq.app.core.network.dto.AddLicenceRequest
import au.com.builderhq.app.core.network.dto.AddLicenceResponse
import au.com.builderhq.app.core.network.dto.BuilderBundleDto
import au.com.builderhq.app.core.network.dto.BuilderCategoriesRequest
import au.com.builderhq.app.core.network.dto.BuilderPatchResponse
import au.com.builderhq.app.core.network.dto.BuilderServiceAreasRequest
import au.com.builderhq.app.core.network.dto.BuilderSubmitResponse
import au.com.builderhq.app.core.network.dto.PostcodeResponse
import au.com.builderhq.app.core.network.dto.ProfileOkResponse
import au.com.builderhq.app.core.network.dto.ServiceAreaPayload
import au.com.builderhq.app.core.network.safeCall
import kotlinx.serialization.json.JsonObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Builder profile + onboarding wizard data layer. Thin ApiResult
 * wrappers — the wizard's VM owns all sequencing/state.
 *
 * Postcode lookup rides on OwnerApi's existing endpoint (the route is
 * role-agnostic; only the Retrofit interface happens to live there).
 */
@Singleton
class BuilderProfileRepository @Inject constructor(
    private val api: ProfileApi,
    private val ownerApi: OwnerApi,
) {
    suspend fun bundle(): ApiResult<BuilderBundleDto> =
        safeCall { api.bundle() }

    /**
     * Partial profile patch. Keys absent from [patch] keep their
     * server value; keys present as JsonNull clear it.
     */
    suspend fun patchProfile(patch: JsonObject): ApiResult<BuilderPatchResponse> =
        safeCall { api.patchProfile(patch) }

    suspend fun verifyAbn(abn: String): ApiResult<AbnVerifyDto> =
        safeCall { api.verifyAbn(AbnVerifyRequest(abn)) }

    suspend fun setCategories(categories: List<String>): ApiResult<ProfileOkResponse> =
        safeCall { api.setCategories(BuilderCategoriesRequest(categories)) }

    suspend fun setServiceAreas(areas: List<ServiceAreaPayload>): ApiResult<ProfileOkResponse> =
        safeCall { api.setServiceAreas(BuilderServiceAreasRequest(areas)) }

    suspend fun addLicence(body: AddLicenceRequest): ApiResult<AddLicenceResponse> =
        safeCall { api.addLicence(body) }

    suspend fun removeLicence(id: String): ApiResult<ProfileOkResponse> =
        safeCall { api.removeLicence(id) }

    suspend fun submit(): ApiResult<BuilderSubmitResponse> =
        safeCall { api.submit() }

    suspend fun lookupPostcode(postcode: String): ApiResult<PostcodeResponse> =
        safeCall { ownerApi.postcode(postcode) }
}
