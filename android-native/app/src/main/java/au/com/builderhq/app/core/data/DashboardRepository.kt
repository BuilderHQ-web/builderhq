package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.DashboardApi
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.BuilderDashboardDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DashboardRepository @Inject constructor(
    private val api: DashboardApi,
) {
    suspend fun builder(): ApiResult<BuilderDashboardDto> = safeCall { api.builder() }
}
