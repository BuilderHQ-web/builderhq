/// InboxScreen — the messaging home (Inbox tab).
///
/// Lists every conversation the user is part of (one per builder×project,
/// created when a builder unlocks). Reads from the shared
/// `MessagingCenter` so it never disagrees with the tab's unread badge.
/// Tapping a row pushes the chat thread.

import SwiftUI

struct InboxScreen: View {
    @Environment(MessagingCenter.self) private var center
    @State private var search = ""

    private var filtered: [MessagingAPI.Conversation] {
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return center.conversations }
        return center.conversations.filter {
            $0.other.displayName.lowercased().contains(q)
                || $0.projectTitle.lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground().ignoresSafeArea()
                content
            }
            .navigationBarHidden(true)
            .navigationDestination(for: MessagingAPI.Conversation.self) { convo in
                ChatScreen(conversation: convo)
            }
        }
        .task { await center.refresh() }
    }

    @ViewBuilder
    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                heading
                if !center.conversations.isEmpty {
                    searchBar
                }
                body(for: center.loadState)
                Spacer(minLength: 100)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await center.refresh() }
    }

    @ViewBuilder
    private func body(for state: MessagingCenter.LoadState) -> some View {
        if !center.conversations.isEmpty {
            if filtered.isEmpty {
                noMatches
            } else {
                list
            }
        } else {
            switch state {
            case .loading, .initial: skeleton
            case .error(let m): errorState(m)
            case .loaded: emptyState
            }
        }
    }

    private var heading: some View {
        (
            Text("Your\n")
                .font(Typography.ui(size: 32, weight: .medium))
                .foregroundStyle(Palette.text)
            + Text("messages.")
                .font(Typography.serifItalic(size: 32))
                .foregroundStyle(Palette.accentForTime())
        )
        .tracking(-0.4)
        .lineSpacing(-4)
        .padding(.top, 4)
    }

    private var searchBar: some View {
        BrowseSearchBar(text: $search, onSubmit: {})
    }

    private var list: some View {
        LazyVStack(spacing: 10) {
            ForEach(filtered) { convo in
                NavigationLink(value: convo) {
                    InboxCell(conversation: convo)
                }
                .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.99))
            }
        }
    }

    // MARK: - States

    private var skeleton: some View {
        VStack(spacing: 10) {
            ForEach(0..<5, id: \.self) { _ in
                SkeletonView(cornerRadius: 18).frame(height: 78)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Palette.accentLight)
            Text("No messages yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text("When a builder unlocks your project — or you unlock one — a conversation opens here so you can talk directly.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }

    private var noMatches: some View {
        Text("No conversations match “\(search)”.")
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(Palette.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't load messages")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 13)).foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
            Press(haptic: .tap) { Task { await center.refresh() } } content: {
                Text("Try again")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 22).frame(height: 44)
                    .background(Capsule().fill(Palette.accent))
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 44)
    }
}

// MARK: - Conversation cell

private struct InboxCell: View {
    let conversation: MessagingAPI.Conversation

    private var c: MessagingAPI.Conversation { conversation }
    private var unread: Bool { c.unreadCount > 0 }

    var body: some View {
        HStack(spacing: 13) {
            medallion
            VStack(alignment: .leading, spacing: 4) {
                // Project context eyebrow.
                Text(c.projectTitle.uppercased())
                    .font(.system(size: 9, weight: .bold)).tracking(1.1)
                    .foregroundStyle(Palette.accent.opacity(0.9))
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Text(c.other.displayName)
                        .font(.system(size: 15.5, weight: unread ? .bold : .semibold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    Spacer(minLength: 6)
                    Text(ChatTime.inboxStamp(c.lastMessageAtIso))
                        .font(.system(size: 11, weight: unread ? .bold : .medium))
                        .foregroundStyle(unread ? Palette.accent : Palette.textDim)
                }
                HStack(alignment: .top, spacing: 8) {
                    Text(c.lastMessagePreview ?? "Tap to start the conversation")
                        .font(.system(size: 13, weight: unread ? .medium : .regular))
                        .foregroundStyle(unread ? Palette.text : Palette.textMuted)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    if unread { unreadBadge }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .cardSurface(.flat, radius: Radius.card)
        .overlay(
            unread
                ? RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                    .stroke(Palette.accent.opacity(0.25), lineWidth: 1)
                : nil
        )
    }

    private var medallion: some View {
        ZStack {
            Circle().fill(unread ? Palette.accentMuted : Palette.surfaceElev)
            Text(c.other.initials)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(unread ? Palette.accent : Palette.textMuted)
        }
        .frame(width: 50, height: 50)
        .overlay(
            Circle().stroke(unread ? Palette.accent.opacity(0.5) : Palette.hairline, lineWidth: 1)
        )
    }

    private var unreadBadge: some View {
        Text("\(c.unreadCount)")
            .font(.system(size: 11, weight: .black, design: .rounded))
            .foregroundStyle(Palette.accentContrast)
            .frame(minWidth: 20, minHeight: 20)
            .padding(.horizontal, 5)
            .background(Capsule().fill(Palette.accent))
            .shadow(color: Palette.accentGlow.opacity(0.5), radius: 5)
    }
}
