/// ChatViewModel — state + behaviour for one conversation thread.
///
/// Renders instantly from the inbox row passed in, then loads the full
/// thread, polls for new messages (~3s, until push lands), sends
/// optimistically, and tracks read-receipt + unread-divider state.
///
/// Mine vs theirs without needing my own user id: a conversation has
/// exactly two parties, so any *user* message not sent by `other` is
/// mine. Read receipts fall out of `other.lastReadAt`.

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class ChatViewModel {
    /// Sentinel sender id for optimistic (not-yet-sent) messages.
    static let mineSentinel = "__me__"

    let conversation: MessagingAPI.Conversation
    private(set) var header: MessagingAPI.Conversation
    private(set) var messages: [MessagingAPI.Message] = []
    private(set) var loadState: LoadState = .loading
    var draft: String = ""
    var bannerError: String? = nil

    enum LoadState: Equatable { case loading, ready, error(String) }
    enum SendState: Equatable { case sending, failed }

    /// Per-message send state for optimistic rows (keyed by temp id).
    private(set) var sendStatus: [String: SendState] = [:]

    /// The other party's read pointer — drives "Read" ticks.
    private(set) var otherLastReadAt: Date?
    /// My read pointer captured at FIRST load — drives the unread divider
    /// (kept stable even after we mark-read on open).
    private(set) var unreadDividerAfter: Date?

    private var pollTask: Task<Void, Never>?
    private let pollInterval: Duration = .seconds(3)

    init(conversation: MessagingAPI.Conversation) {
        self.conversation = conversation
        self.header = conversation
        self.otherLastReadAt = ChatTime.parse(conversation.other.lastReadAtIso)
    }

    var otherId: String { header.other.id }

    // MARK: - Load + poll

    func load() async {
        do {
            let thread = try await MessagingAPI.thread(id: conversation.id)
            unreadDividerAfter = ChatTime.parse(thread.myLastReadAtIso)
            apply(thread)
            loadState = .ready
        } catch let error as APIError {
            loadState = .error(error.errorDescription ?? "Couldn't load this conversation.")
        } catch {
            loadState = .error("Couldn't load this conversation.")
        }
    }

    func startPolling() {
        guard pollTask == nil else { return }
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: self?.pollInterval ?? .seconds(3))
                if Task.isCancelled { return }
                await self?.poll()
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    private func poll() async {
        guard let thread = try? await MessagingAPI.thread(id: conversation.id) else { return }
        let knownIds = Set(messages.map(\.id))
        let hadIncoming = thread.messages.contains { sm in
            sm.senderId == otherId && !knownIds.contains(sm.id)
        }
        apply(thread)
        // New inbound message while we're looking → mark read so the
        // other side's ticks update too.
        if hadIncoming { await markRead() }
    }

    /// Merge a fresh server snapshot, preserving any optimistic rows that
    /// haven't been acknowledged yet.
    private func apply(_ thread: MessagingAPI.Thread) {
        header = thread.conversation
        otherLastReadAt = ChatTime.parse(thread.conversation.other.lastReadAtIso)
        let serverIds = Set(thread.messages.map(\.id))
        let pendingTemps = messages.filter {
            $0.id.hasPrefix("temp-") && !serverIds.contains($0.id)
        }
        messages = thread.messages + pendingTemps
    }

    // MARK: - Send (optimistic)

    func send() async {
        let body = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        draft = ""
        let temp = MessagingAPI.Message(
            id: "temp-\(UUID().uuidString)",
            conversationId: conversation.id,
            senderId: Self.mineSentinel,
            kind: "user",
            body: body,
            tenderId: nil,
            createdAtIso: ChatTime.iso(Date()),
            editedAtIso: nil
        )
        messages.append(temp)
        sendStatus[temp.id] = .sending
        await deliver(temp)
    }

    func retry(_ tempId: String) async {
        guard let temp = messages.first(where: { $0.id == tempId }) else { return }
        sendStatus[tempId] = .sending
        await deliver(temp)
    }

    func discard(_ tempId: String) {
        messages.removeAll { $0.id == tempId }
        sendStatus[tempId] = nil
    }

    private func deliver(_ temp: MessagingAPI.Message) async {
        do {
            let real = try await MessagingAPI.send(id: conversation.id, body: temp.body)
            if let idx = messages.firstIndex(where: { $0.id == temp.id }) {
                messages[idx] = real
            }
            sendStatus[temp.id] = nil
        } catch {
            sendStatus[temp.id] = .failed
        }
    }

    // MARK: - Read

    func markRead() async {
        _ = try? await MessagingAPI.markRead(id: conversation.id)
    }

    // MARK: - Derived (for the view)

    func isMine(_ m: MessagingAPI.Message) -> Bool {
        m.kind == "user" && m.senderId != nil && m.senderId != otherId
    }

    enum Tick { case sending, failed, delivered, read }

    func tick(for m: MessagingAPI.Message) -> Tick {
        if let s = sendStatus[m.id] {
            return s == .failed ? .failed : .sending
        }
        guard let created = ChatTime.parse(m.createdAtIso) else { return .delivered }
        if let read = otherLastReadAt, created <= read { return .read }
        return .delivered
    }
}
