package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.OwnerApi
import au.com.builderhq.app.core.network.UploadApi
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.CompleteDocRequest
import au.com.builderhq.app.core.network.dto.CreateProjectResponse
import au.com.builderhq.app.core.network.dto.DeleteDocRequest
import au.com.builderhq.app.core.network.dto.DeleteProjectResponse
import au.com.builderhq.app.core.network.dto.ExtractResponse
import au.com.builderhq.app.core.network.dto.InitDocRequest
import au.com.builderhq.app.core.network.dto.OwnerDashboardDto
import au.com.builderhq.app.core.network.dto.OwnerProjectDetailDto
import au.com.builderhq.app.core.network.dto.OwnerProjectsResponse
import au.com.builderhq.app.core.network.dto.PostcodeResponse
import au.com.builderhq.app.core.network.dto.ProjectDocumentDto
import au.com.builderhq.app.core.network.dto.ProjectWriteRequest
import au.com.builderhq.app.core.network.dto.PublishResponse
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

/** Owner project lifecycle: dashboard, list, detail, create → upload → publish. */
@Singleton
class OwnerRepository @Inject constructor(
    private val api: OwnerApi,
    private val uploads: UploadApi,
) {
    suspend fun dashboard(): ApiResult<OwnerDashboardDto> = safeCall { api.dashboard() }

    suspend fun myProjects(status: String? = null, q: String? = null): ApiResult<OwnerProjectsResponse> =
        safeCall { api.myProjects(status, q?.trim()?.ifBlank { null }) }

    suspend fun projectDetail(slug: String): ApiResult<OwnerProjectDetailDto> =
        safeCall { api.projectDetail(slug) }

    suspend fun create(body: ProjectWriteRequest): ApiResult<CreateProjectResponse> =
        safeCall { api.create(body) }

    suspend fun patch(slug: String, body: ProjectWriteRequest): ApiResult<CreateProjectResponse> =
        safeCall { api.patch(slug, body) }

    suspend fun publish(slug: String, body: ProjectWriteRequest = ProjectWriteRequest()): ApiResult<PublishResponse> =
        safeCall { api.publish(slug, body) }

    suspend fun delete(slug: String): ApiResult<DeleteProjectResponse> =
        safeCall { api.delete(slug) }

    suspend fun postcode(postcode: String): ApiResult<PostcodeResponse> =
        safeCall { api.postcode(postcode) }

    /** Stateless AI prefill from a plan PDF (≤28 MB). */
    suspend fun extractFromPlan(bytes: ByteArray): ApiResult<ExtractResponse> =
        safeCall { api.extract(bytes.toRequestBody("application/pdf".toMediaType())) }

    /** Two-phase upload: init → PUT bytes to R2 → complete. Returns the active doc. */
    suspend fun uploadDocument(
        projectId: String,
        category: String,
        filename: String,
        contentType: String,
        bytes: ByteArray,
    ): ApiResult<ProjectDocumentDto> {
        val init = safeCall {
            api.initDocument(InitDocRequest(projectId, category, filename, contentType, bytes.size.toLong()))
        }
        return when (init) {
            is ApiResult.Error -> init
            is ApiResult.NetworkError -> init
            is ApiResult.Success -> {
                val ct = init.data.uploadHeaders["Content-Type"] ?: contentType
                when (val put = safeCall { uploads.put(init.data.uploadUrl, ct, bytes.toRequestBody(ct.toMediaType())) }) {
                    is ApiResult.Error -> put
                    is ApiResult.NetworkError -> put
                    is ApiResult.Success ->
                        when (val done = safeCall { api.completeDocument(CompleteDocRequest(projectId, init.data.documentId)) }) {
                            is ApiResult.Success -> ApiResult.Success(done.data.document)
                            is ApiResult.Error -> done
                            is ApiResult.NetworkError -> done
                        }
                }
            }
        }
    }

    suspend fun deleteDocument(projectId: String, documentId: String): ApiResult<Unit> =
        safeCall { api.deleteDocument(DeleteDocRequest(projectId, documentId)) }
}
