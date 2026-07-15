package au.com.builderhq.app.core.data

import au.com.builderhq.app.core.network.ApiResult
import au.com.builderhq.app.core.network.MessagingApi
import au.com.builderhq.app.core.network.safeCall
import au.com.builderhq.app.core.network.dto.InboxResponse
import au.com.builderhq.app.core.network.dto.MarkReadResponse
import au.com.builderhq.app.core.network.dto.SendMessageRequest
import au.com.builderhq.app.core.network.dto.SendMessageResponse
import au.com.builderhq.app.core.network.dto.StartConversationRequest
import au.com.builderhq.app.core.network.dto.StartConversationResponse
import au.com.builderhq.app.core.network.dto.ThreadResponse
import javax.inject.Inject
import javax.inject.Singleton

/** Messaging reads/actions, folded into [ApiResult]. */
@Singleton
class MessagingRepository @Inject constructor(
    private val api: MessagingApi,
) {
    suspend fun inbox(): ApiResult<InboxResponse> = safeCall { api.inbox() }

    suspend fun thread(id: String): ApiResult<ThreadResponse> = safeCall { api.thread(id) }

    suspend fun send(id: String, body: String): ApiResult<SendMessageResponse> =
        safeCall { api.sendMessage(id, SendMessageRequest(body)) }

    suspend fun markRead(id: String): ApiResult<MarkReadResponse> =
        safeCall { api.markRead(id) }

    suspend fun startConversation(
        projectSlug: String,
        builderId: String? = null,
    ): ApiResult<StartConversationResponse> =
        safeCall { api.startConversation(StartConversationRequest(projectSlug, builderId)) }
}
