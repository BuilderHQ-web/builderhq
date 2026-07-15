package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.TendersApi
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.CostLineInput
import au.com.builderhq.app.core.network.dto.CostLinesRequest
import au.com.builderhq.app.core.network.dto.TenderPatchRequest
import au.com.builderhq.app.core.network.dto.TenderPayloadDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TendersRepository @Inject constructor(
    private val api: TendersApi,
) {
    suspend fun createForProject(slug: String): ApiResult<TenderPayloadDto> =
        safeCall { api.createForProject(slug) }

    suspend fun patch(id: String, patch: TenderPatchRequest): ApiResult<TenderPayloadDto> =
        safeCall { api.patch(id, patch) }

    suspend fun setCostLines(id: String, lines: List<CostLineInput>): ApiResult<TenderPayloadDto> =
        safeCall { api.setCostLines(id, CostLinesRequest(lines)) }

    suspend fun submit(id: String): ApiResult<TenderPayloadDto> =
        safeCall { api.submit(id) }
}
