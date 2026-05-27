/// MainTabs — the authenticated app shell.
///
/// Four tabs: Home, Projects, Inbox, You. Same conceptual layout as
/// the RN `(main)/_layout.tsx`. Uses SwiftUI's native `TabView` with
/// SF Symbols — the glass tab bar is built-in to iOS 18+ as
/// `.tabViewStyle(.sidebarAdaptable)` for iPad, but on iPhone the
/// default tab bar IS the native floating glass pill we want.
///
/// Each tab's content is a stub for week 1 so the app compiles + the
/// nav is testable end-to-end. Real screens land week 2-5.

import SwiftUI

struct MainTabs: View {
    @Environment(AuthSession.self) private var session
    @State private var selection: Tab = .home

    enum Tab: Hashable {
        case home, projects, inbox, you
    }

    var body: some View {
        TabView(selection: $selection) {
            Tab("Home", systemImage: "house.fill", value: Tab.home) {
                HomeScreenStub()
            }
            Tab("Projects", systemImage: "safari.fill", value: Tab.projects) {
                ProjectsScreenStub()
            }
            Tab("Inbox", systemImage: "message.fill", value: Tab.inbox) {
                InboxScreenStub()
            }
            Tab("You", systemImage: "person.fill", value: Tab.you) {
                YouScreenStub()
            }
        }
        .tint(Palette.accent)
    }
}

// MARK: - Tab content stubs (week 1)

private struct HomeScreenStub: View {
    @Environment(AuthSession.self) private var session

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    AccentItalic(plain: "Good afternoon,", italic: name, size: 44)
                        .padding(.top, 8)

                    Surface(.accent, hairline: true) {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("FOUNDING ACCESS")
                                .font(Typography.caption)
                                .tracking(2)
                                .foregroundStyle(Palette.accent)

                            HStack(alignment: .firstTextBaseline, spacing: 12) {
                                Text("4")
                                    .font(Typography.numericHero)
                                    .foregroundStyle(Palette.text)
                                    .monospacedDigit()
                                Text("free unlocks left")
                                    .font(Typography.body)
                                    .foregroundStyle(Palette.textMuted)
                            }

                            Text("Stubbed — real hero card with progress ring lands week 2.")
                                .font(Typography.bodySmall)
                                .foregroundStyle(Palette.textDim)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
            .navigationTitle("Home")
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
    }

    private var name: String {
        if case let .signedIn(user) = session.state {
            return user.name?.split(separator: " ").first.map(String.init) ?? "there"
        }
        return "there"
    }
}

private struct ProjectsScreenStub: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                Text("Projects — week 3.")
                    .font(Typography.body)
                    .foregroundStyle(Palette.textMuted)
                    .padding(.top, 100)
            }
            .navigationTitle("Projects")
        }
    }
}

private struct InboxScreenStub: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                Text("Inbox — week 4.")
                    .font(Typography.body)
                    .foregroundStyle(Palette.textMuted)
                    .padding(.top, 100)
            }
            .navigationTitle("Inbox")
        }
    }
}

private struct YouScreenStub: View {
    @Environment(AuthSession.self) private var session

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Text("You — week 5.")
                        .font(Typography.body)
                        .foregroundStyle(Palette.textMuted)
                        .padding(.top, 100)

                    Press(haptic: .tap) {
                        session.didSignOut()
                    } content: {
                        Text("Sign out")
                            .font(Typography.ui(size: 13))
                            .foregroundStyle(Palette.textDim)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                    }
                }
            }
            .navigationTitle("You")
        }
    }
}
