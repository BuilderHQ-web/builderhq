package au.com.builderhq.app.core.network

import au.com.builderhq.app.core.network.dto.InboxResponse
import au.com.builderhq.app.core.network.dto.MarkReadResponse
import au.com.builderhq.app.core.network.dto.SendMessageRequest
import au.com.builderhq.app.core.network.dto.SendMessageResponse
import au.com.builderhq.app.core.network.dto.StartConversationRequest
import au.com.builderhq.app.core.network.dto.StartConversationResponse
import au.com.builderhq.app.core.network.dto.ThreadResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/** Messaging surface (served by the @AuthClient Retrofit). Contracts match
 *  src/app/api/mobile/conversations* byte-for-byte. */
interface MessagingApi {
    /** Inbox: every conversation the caller participates in. */
    @GET("api/mobile/conversations")
    suspend fun inbox(): Response<InboxResponse>

    /** Find-or-create the (project × builder) conversation, for the explicit
     *  "Message …" entry point. */
    @POST("api/mobile/conversations")
    suspend fun startConversation(@Body body: StartConversationRequest): Response<StartConversationResponse>

    /** Thread bundle: header + message tail (oldest → newest) + my read pointer. */
    @GET("api/mobile/conversations/{id}")
    suspend fun thread(@Path("id") id: String): Response<ThreadResponse>

    /** Append a user message. Returns the inserted row in payload shape. */
    @POST("api/mobile/conversations/{id}/messages")
    suspend fun sendMessage(@Path("id") id: String, @Body body: SendMessageRequest): Response<SendMessageResponse>

    /** Bump my read pointer to now. Idempotent. */
    @POST("api/mobile/conversations/{id}/read")
    suspend fun markRead(@Path("id") id: String): Response<MarkReadResponse>
}
