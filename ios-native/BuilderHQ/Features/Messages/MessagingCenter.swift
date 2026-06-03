/// MessagingCenter — app-level store for the inbox + the live unread
/// badge on the Inbox tab.
///
/// One source of truth so the tab badge and the Inbox screen never
/// disagree and we don't double-poll. Owned by `MainTabs`, injected into
/// the tab tree via the environment, and polled on a light cadence while
/// the app is foregrounded (push notifications will replace polling
/// later, but this keeps the badge live in the meantime).

import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class MessagingCenter {
    enum LoadState: Equatable { case initial, loading, loaded, error(String) }

    private(set) var conversations: [MessagingAPI.Conversation] = []
    private(set) var totalUnread: Int = 0
    private(set) var loadState: LoadState = .initial

    private var pollTask: Task<Void, Never>?
    /// Inbox refresh cadence while foregrounded.
    private let pollInterval: Duration = .seconds(8)

    // MARK: - Loading

    func refresh() async {
        if case .initial = loadState { loadState = .loading }
        do {
            let res = try await MessagingAPI.list()
            conversations = res.items
            totalUnread = res.totalUnread
            loadState = .loaded
        } catch let error as APIError {
            // Keep any existing data on a transient failure; only surface
            // an error state when we have nothing to show.
            if conversations.isEmpty {
                loadState = .error(error.errorDescription ?? "Couldn't load messages.")
            }
        } catch {
            if conversations.isEmpty { loadState = .error("Couldn't load messages.") }
        }
    }

    // MARK: - Polling

    func startPolling() {
        guard pollTask == nil else { return }
        pollTask = Task { [weak self] in
            guard let self else { return }
            await self.refresh()
            while !Task.isCancelled {
                try? await Task.sleep(for: self.pollInterval)
                if Task.isCancelled { return }
                await self.refresh()
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    // MARK: - Optimistic local updates

    /// Zero a conversation's unread count immediately (e.g. when the user
    /// opens its thread), so the badge updates before the next poll.
    func markLocallyRead(_ conversationId: String) {
        guard let idx = conversations.firstIndex(where: { $0.id == conversationId }),
              conversations[idx].unreadCount > 0 else { return }
        let was = conversations[idx].unreadCount
        // Rebuild the row with unreadCount 0 (struct is immutable-by-let).
        conversations[idx] = conversations[idx].withUnread(0)
        totalUnread = max(0, totalUnread - was)
    }
}

private extension MessagingAPI.Conversation {
    func withUnread(_ n: Int) -> MessagingAPI.Conversation {
        MessagingAPI.Conversation(
            id: id, projectId: projectId, projectSlug: projectSlug,
            projectTitle: projectTitle, other: other,
            lastMessageAtIso: lastMessageAtIso, lastMessagePreview: lastMessagePreview,
            unreadCount: n
        )
    }
}
