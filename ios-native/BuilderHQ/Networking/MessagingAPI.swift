/// MessagingAPI — typed surface for owner↔builder messaging.
///
/// Conversations are created server-side the moment a builder unlocks a
/// project (one per builder×project), so there's no "create" call — both
/// parties simply find the conversation in their inbox.
///
///   · list()        → GET  /api/mobile/conversations
///                     { items: [Conversation], totalUnread }
///   · thread(id:)   → GET  /api/mobile/conversations/:id
///                     full bundle (header + messages + read pointers)
///   · send(id:body:)→ POST /api/mobile/conversations/:id/messages
///                     returns the inserted Message (for optimistic swap)
///   · markRead(id:) → POST /api/mobile/conversations/:id/read
///                     bumps my read pointer → returns the new timestamp
///
/// Read receipts fall straight out of the data: one of my messages is
/// "read" once its `createdAt` ≤ the other party's `lastReadAt`.

import Foundation

enum MessagingAPI {
    // MARK: - Models

    struct Party: Decodable, Equatable, Hashable {
        let id: String
        let displayName: String
        let initials: String
        let role: String            // "project_owner" | "builder"
        let lastReadAtIso: String?
    }

    struct Conversation: Decodable, Equatable, Hashable, Identifiable {
        let id: String
        let projectId: String
        let projectSlug: String
        let projectTitle: String
        let other: Party
        let lastMessageAtIso: String?
        let lastMessagePreview: String?
        let unreadCount: Int
    }

    struct Message: Decodable, Equatable, Identifiable {
        let id: String
        let conversationId: String
        let senderId: String?       // nil for system messages
        let kind: String            // "user" | "system"
        let body: String
        let tenderId: String?
        let createdAtIso: String
        let editedAtIso: String?

        var isSystem: Bool { kind == "system" }
    }

    struct Thread: Decodable, Equatable {
        let conversation: Conversation
        let serverNowIso: String
        let myLastReadAtIso: String?
        let messages: [Message]      // oldest → newest
    }

    // MARK: - Responses

    struct ListResponse: Decodable, Equatable {
        let items: [Conversation]
        let totalUnread: Int
    }

    private struct SendResponse: Decodable { let message: Message }
    private struct ReadResponse: Decodable { let ok: Bool; let myLastReadAtIso: String? }
    private struct StartResponse: Decodable { let conversation: Conversation }

    // MARK: - Calls

    static func list() async throws -> ListResponse {
        try await APIClient.shared.get("/api/mobile/conversations")
    }

    private struct StartBody: Encodable {
        let projectSlug: String
        let builderId: String?
    }

    /// Find-or-create the conversation for this project (and, when the
    /// caller is the owner, this builder), then return it so the client
    /// can deep-link straight into the thread. `builderId` is nil when
    /// the caller is the builder (server messages the project owner).
    static func startConversation(projectSlug: String, builderId: String? = nil) async throws -> Conversation {
        let res: StartResponse = try await APIClient.shared.post(
            "/api/mobile/conversations",
            body: StartBody(projectSlug: projectSlug, builderId: builderId)
        )
        return res.conversation
    }

    static func thread(id: String) async throws -> Thread {
        try await APIClient.shared.get("/api/mobile/conversations/\(id)")
    }

    private struct SendBody: Encodable { let body: String }

    /// Append a user message. Returns the inserted message so the client
    /// can swap its optimistic placeholder for the real row.
    static func send(id: String, body: String) async throws -> Message {
        let res: SendResponse = try await APIClient.shared.post(
            "/api/mobile/conversations/\(id)/messages",
            body: SendBody(body: body)
        )
        return res.message
    }

    /// Bump my read pointer to now. Idempotent. Returns the new timestamp.
    @discardableResult
    static func markRead(id: String) async throws -> String? {
        let res: ReadResponse = try await APIClient.shared.post(
            "/api/mobile/conversations/\(id)/read",
            body: EmptyBody()
        )
        return res.myLastReadAtIso
    }
}
