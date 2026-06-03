/// MainTabs — the authenticated app shell.
///
/// Role-aware Projects tab:
///   · Builders / admins → `BrowseScreen` (marketplace listings,
///     unlock + tender flow)
///   · Project owners    → `OwnerProjectsScreen` (their own portfolio:
///     drafts, live, tendering, completed; floating + to publish)
///
/// Same `TabKind.projects` tag either way so the selected-tab state
/// survives role changes; the underlying screen swaps based on
/// `session.state.role` at render time. Routing the request through
/// the right backend endpoint (`/projects/browse` vs `/projects/mine`)
/// is the responsibility of the screen behind the tab.
///
/// Each tab is wrapped in its own `NavigationStack` so that pushes
/// (e.g. a feed card → ProjectDetailScreen) stay scoped to the tab and
/// the back swipe restores the right history. The push destinations
/// are registered once at the NavigationStack root via
/// `.navigationDestination(for: String.self)` — any descendant view
/// can fire `NavigationLink(value: slug)` and it routes to the
/// ProjectDetailScreen for that slug.

import SwiftUI

struct MainTabs: View {
    @Environment(AuthSession.self) private var session
    @State private var selection: TabKind = .home
    /// App-level messaging store — drives the Inbox screen + the live
    /// unread badge on the Inbox tab. Polled while the tabs are alive.
    @State private var messaging = MessagingCenter()

    /// Renamed from `Tab` to avoid collision with SwiftUI's own
    /// `Tab` type (iOS 18+ tab builder). Reads cleaner anyway.
    enum TabKind: Hashable {
        case home, projects, inbox, you
    }

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack {
                HomeScreen()
                    .navigationDestination(for: String.self) { slug in
                        ProjectDetailScreen(slug: slug)
                    }
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(TabKind.home)

            NavigationStack {
                projectsTabContent
                    .navigationDestination(for: String.self) { slug in
                        ProjectDetailScreen(slug: slug)
                    }
            }
            .tabItem {
                Label("Projects", systemImage: projectsTabIcon)
            }
            .tag(TabKind.projects)

            InboxScreen()
                .tabItem {
                    Label("Inbox", systemImage: "message.fill")
                }
                .badge(messaging.totalUnread)
                .tag(TabKind.inbox)

            ProfileHubScreen(role: role)
                .tabItem {
                    Label("You", systemImage: "person.fill")
                }
                .tag(TabKind.you)
        }
        .tint(Palette.accent)
        .environment(messaging)
        .task { messaging.startPolling() }
        .onDisappear { messaging.stopPolling() }
    }

    /// Role-routed Projects tab content. Owners see their own project
    /// list; builders + admins see the marketplace browse.
    @ViewBuilder
    private var projectsTabContent: some View {
        if isOwner {
            OwnerProjectsScreen()
        } else {
            BrowseScreen()
        }
    }

    /// Icon swap so the tab bar telegraphs the underlying experience —
    /// compass for the marketplace explorer, folder for the owner's
    /// portfolio.
    private var projectsTabIcon: String {
        isOwner ? "folder.fill" : "safari.fill"
    }

    private var isOwner: Bool {
        if case let .signedIn(user) = session.state {
            return user.role == .projectOwner
        }
        return false
    }

    private var role: AuthSession.Role {
        if case let .signedIn(user) = session.state {
            return user.role
        }
        return .builder
    }
}

