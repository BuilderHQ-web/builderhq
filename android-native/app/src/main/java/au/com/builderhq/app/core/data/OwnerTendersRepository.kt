package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.OwnerTendersApi
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.DecisionRequest
import au.com.builderhq.app.core.network.dto.DecisionResponse
import au.com.builderhq.app.core.network.dto.OwnerTenderResponse
import au.com.builderhq.app.core.network.dto.TenderCompareDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OwnerTendersRepository @Inject constructor(
    private val api: OwnerTendersApi,
) {
    suspend fun compare(slug: String): ApiResult<TenderCompareDto> = safeCall { api.compare(slug) }

    suspend fun tender(id: String): ApiResult<OwnerTenderResponse> = safeCall { api.tender(id) }

    suspend fun decide(id: String, action: String, rejectOthers: Boolean? = null): ApiResult<DecisionResponse> =
        safeCall { api.decide(id, DecisionRequest(action, rejectOthers)) }
}
