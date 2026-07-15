package au.com.builderhq.app.core.network.dto

import kotlinx.serialization.Serializable

/**
 * Mirrors the /api/mobile/conversations* payloads 1:1 (see
 * src/app/api/mobile/_lib/conversationPayload.ts). All timestamps are
 * ISO-8601 strings; we parse to java.time only at the render edge.
 */

@Serializable
data class ConversationOtherDto(
    val id: String,
    val displayName: String = "",
    val initials: String = "",
    val role: String = "", // project_owner | builder
    val lastReadAtIso: String? = null,
)

@Serializable
data class ConversationDto(
    val id: String,
    val projectId: String = "",
    val projectSlug: String = "",
    val projectTitle: String = "",
    val other: ConversationOtherDto,
    val lastMessageAtIso: String? = null,
    val lastMessagePreview: String? = null,
    val unreadCount: Int = 0,
)

@Serializable
data class MessageDto(
    val id: String,
    val conversationId: String = "",
    val senderId: String? = null,
    val kind: String = "user", // user | system
    val body: String = "",
    val tenderId: String? = null,
    val createdAtIso: String = "",
    val editedAtIso: String? = null,
)

@Serializable
data class InboxResponse(
    val items: List<ConversationDto> = emptyList(),
    val totalUnread: Int = 0,
)

@Serializable
data class ThreadResponse(
    val conversation: ConversationDto,
    val serverNowIso: String = "",
    val myLastReadAtIso: String? = null,
    val messages: List<MessageDto> = emptyList(),
)

@Serializable
data class StartConversationRequest(
    val projectSlug: String,
    val builderId: String? = null,
)

@Serializable
data class StartConversationResponse(
    val conversation: ConversationDto,
)

@Serializable
data class SendMessageRequest(
    val body: String,
)

@Serializable
data class SendMessageResponse(
    val message: MessageDto,
)

@Serializable
data class MarkReadResponse(
    val ok: Boolean = false,
    val myLastReadAtIso: String? = null,
)
