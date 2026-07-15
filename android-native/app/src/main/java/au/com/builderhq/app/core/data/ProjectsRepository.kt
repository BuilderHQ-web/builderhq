package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.ProjectsApi
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.BrowseResponse
import au.com.builderhq.app.core.network.dto.DocumentDownloadDto
import au.com.builderhq.app.core.network.dto.ProjectDetailDto
import au.com.builderhq.app.core.network.dto.SaveResponse
import au.com.builderhq.app.core.network.dto.UnlockResponse
import javax.inject.Inject
import javax.inject.Singleton

/** Read/act on marketplace projects. Thin wrapper folding the Retrofit
 *  calls into [ApiResult]. */
@Singleton
class ProjectsRepository @Inject constructor(
    private val api: ProjectsApi,
) {
    suspend fun browse(
        scope: String? = null,
        q: String? = null,
        type: String? = null,
        state: String? = null,
        budgets: String? = null,
        limit: Int = 20,
        offset: Int = 0,
    ): ApiResult<BrowseResponse> =
        safeCall {
            api.browse(
                scope = scope,
                q = q?.trim()?.ifBlank { null },
                type = type,
                state = state,
                budgets = budgets,
                limit = limit,
                offset = offset,
            )
        }

    suspend fun detail(slug: String): ApiResult<ProjectDetailDto> =
        safeCall { api.detail(slug) }

    suspend fun unlock(slug: String): ApiResult<UnlockResponse> =
        safeCall { api.unlock(slug) }

    suspend fun setSaved(slug: String, saved: Boolean): ApiResult<SaveResponse> =
        safeCall { if (saved) api.save(slug) else api.unsave(slug) }

    /** Mint a short-lived presigned URL for an unlocked document. */
    suspend fun documentUrl(documentId: String): ApiResult<DocumentDownloadDto> =
        safeCall { api.documentDownloadUrl(documentId) }
}
