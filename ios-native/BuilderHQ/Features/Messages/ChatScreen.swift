/// ChatScreen — one conversation thread.
///
/// Renders instantly from the inbox row, loads the full thread, polls
/// for new messages, sends optimistically, and marks read on open. The
/// message stream interleaves day separators, an unread divider, system
/// pills, and bubbles with read-receipt ticks.

import SwiftUI

struct ChatScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(MessagingCenter.self) private var center
    @State private var vm: ChatViewModel
    @State private var showProject = false
    @State private var builderLink: BuilderProfileLink? = nil

    private let conversation: MessagingAPI.Conversation
    private let bottomAnchor = "CHAT_BOTTOM"

    init(conversation: MessagingAPI.Conversation) {
        self.conversation = conversation
        _vm = State(initialValue: ChatViewModel(conversation: conversation))
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            VStack(spacing: 0) {
                ChatHeaderBar(
                    conversation: vm.header,
                    elevated: !vm.messages.isEmpty,
                    onBack: { dismiss() },
                    onProject: { showProject = true },
                    onBuilder: vm.header.other.role == "builder"
                        ? { builderLink = BuilderProfileLink(id: vm.header.other.id) }
                        : nil
                )
                threadArea
            }
        }
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .task {
            center.markLocallyRead(conversation.id)   // instant badge clear
            await vm.load()
            await vm.markRead()
            vm.startPolling()
        }
        .onDisappear {
            vm.stopPolling()
            Task { await center.refresh() }
        }
        .fullScreenCover(isPresented: $showProject) {
            NavigationStack {
                ProjectDetailScreen(slug: conversation.projectSlug)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Close") { showProject = false }
                        }
                    }
            }
        }
        .sheet(item: $builderLink) { link in
            BuilderProfileScreen(builderId: link.id, projectSlug: link.projectSlug)
                .presentationDetents([.large])
        }
    }

    // MARK: - Thread

    @ViewBuilder
    private var threadArea: some View {
        switch vm.loadState {
        case .loading:
            Spacer()
            ProgressView().tint(Palette.accent)
            Spacer()
        case .error(let message):
            errorState(message)
        case .ready:
            messageStream
        }
    }

    private var messageStream: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 5) {
                    ForEach(items) { item in
                        row(for: item)
                    }
                    Color.clear.frame(height: 1).id(bottomAnchor)
                }
                .padding(.horizontal, 14)
                .padding(.top, 12)
            }
            .scrollDismissesKeyboard(.interactively)
            .onAppear { proxy.scrollTo(bottomAnchor, anchor: .bottom) }
            .onChange(of: vm.messages.count) { _, _ in
                withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                    proxy.scrollTo(bottomAnchor, anchor: .bottom)
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                ChatComposer(
                    draft: Binding(get: { vm.draft }, set: { vm.draft = $0 }),
                    onSend: { Task { await vm.send() } }
                )
            }
        }
    }

    @ViewBuilder
    private func row(for item: ChatItem) -> some View {
        switch item {
        case .day(_, let date):
            DaySeparatorView(date: date)
        case .unread:
            UnreadDividerView()
        case .system(let m):
            SystemMessageView(message: m)
        case .message(let m):
            MessageBubble(
                message: m,
                isMine: vm.isMine(m),
                tick: vm.tick(for: m),
                onRetry: { Task { await vm.retry(m.id) } }
            )
        }
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text(message)
                .font(.system(size: 13)).foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center).padding(.horizontal, 40)
            Press(haptic: .tap) { Task { await vm.load() } } content: {
                Text("Try again")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 22).frame(height: 44)
                    .background(Capsule().fill(Palette.accent))
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Item assembly

    private enum ChatItem: Identifiable {
        case day(String, Date)
        case unread
        case system(MessagingAPI.Message)
        case message(MessagingAPI.Message)

        var id: String {
            switch self {
            case .day(let key, _): return "day-\(key)"
            case .unread: return "unread-divider"
            case .system(let m): return m.id
            case .message(let m): return m.id
            }
        }
    }

    /// Interleave day separators + the unread divider into the message
    /// stream (oldest → newest).
    private var items: [ChatItem] {
        var out: [ChatItem] = []
        var lastDayKey: String? = nil
        var dividerPlaced = false
        let divider = vm.unreadDividerAfter
        let cal = Calendar.current

        for m in vm.messages {
            let created = ChatTime.parse(m.createdAtIso)
            if let c = created {
                let key = dayKey(c, cal)
                if key != lastDayKey {
                    out.append(.day(key, c))
                    lastDayKey = key
                }
            }
            // Unread divider before the first unread *incoming* message.
            if !dividerPlaced, let divider, let c = created,
               !vm.isMine(m), m.kind == "user", c > divider, !out.isEmpty {
                out.append(.unread)
                dividerPlaced = true
            }
            out.append(m.isSystem ? .system(m) : .message(m))
        }
        return out
    }

    private func dayKey(_ date: Date, _ cal: Calendar) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: date)
        return "\(c.year ?? 0)-\(c.month ?? 0)-\(c.day ?? 0)"
    }
}
