/// SettingsScreen — the categorised settings list (reached via the gear
/// on the profile hub). Instagram-style: grouped rows with icons, clean
/// section headers, and the destructive account actions cordoned off at
/// the bottom.
///
/// Notification toggles persist locally (@AppStorage) and will drive
/// push preferences once push notifications land. Account deletion shows
/// a confirmation; the server-side erase endpoint is a follow-up, so for
/// now it routes the owner to support.

import SwiftUI

struct SettingsScreen: View {
    @Environment(AuthSession.self) private var session
    @Environment(\.openURL) private var openURL

    @AppStorage("notif.messages") private var notifMessages = true
    @AppStorage("notif.tenders") private var notifTenders = true
    @AppStorage("notif.activity") private var notifActivity = true

    @AppStorage(AppearanceMode.storageKey)
    private var appearanceRaw = AppearanceMode.system.rawValue

    @State private var confirmSignOut = false
    @State private var confirmDelete = false
    @State private var showDeleteInfo = false

    private var email: String? {
        if case let .signedIn(user) = session.state { return user.email }
        return nil
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    account
                    appearance
                    notifications
                    legal
                    support
                    dangerZone
                    footer
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .scrollIndicators(.hidden)
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(confirmSignOut || confirmDelete ? .hidden : .visible, for: .navigationBar)
        .overlay {
            if confirmSignOut {
                ConfirmOverlay(
                    icon: "rectangle.portrait.and.arrow.right",
                    iconTint: Palette.danger,
                    title: "Sign out?",
                    message: "You'll need to sign back in to access your projects and messages.",
                    confirmLabel: "Sign out",
                    confirmTint: Palette.danger,
                    onConfirm: { confirmSignOut = false; Task { await session.didSignOut() } },
                    onCancel: { confirmSignOut = false }
                )
            }
        }
        .overlay {
            if confirmDelete {
                ConfirmOverlay(
                    icon: "trash.fill",
                    iconTint: Palette.danger,
                    title: "Delete account?",
                    message: "This permanently removes your account, projects, and messages. This can't be undone.",
                    confirmLabel: "Delete account",
                    confirmTint: Palette.danger,
                    onConfirm: { confirmDelete = false; showDeleteInfo = true },
                    onCancel: { confirmDelete = false }
                )
            }
        }
        .alert("Contact us to delete", isPresented: $showDeleteInfo) {
            Button("Email support") {
                if let url = URL(string: "mailto:info@builderhq.com.au?subject=Delete%20my%20account") {
                    openURL(url)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("To permanently delete your account, email info@builderhq.com.au from your registered address and we'll action it within 30 days.")
        }
    }

    // MARK: - Account

    private var account: some View {
        section("Account") {
            infoRow(icon: "envelope.fill", label: "Email", value: email ?? "—")
            NavigationLink(value: ProfileRoute.editProfile) {
                navRow(icon: "person.text.rectangle.fill", title: "Edit profile")
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Appearance

    private var appearance: some View {
        section("Appearance", footnote: "System follows your phone's appearance.") {
            ForEach(AppearanceMode.allCases) { mode in
                appearanceRow(mode)
            }
        }
    }

    private func appearanceRow(_ mode: AppearanceMode) -> some View {
        Press(haptic: .select) {
            appearanceRaw = mode.rawValue
        } content: {
            HStack(spacing: 12) {
                iconTile(mode.icon, Palette.accent)
                Text(mode.label)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Palette.text)
                Spacer()
                if appearanceRaw == mode.rawValue {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.accentLight)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 13)
            .contentShape(Rectangle())
        }
    }

    // MARK: - Notifications

    private var notifications: some View {
        section("Notifications", footnote: "Push notifications are coming soon — your choices here will apply when they land.") {
            toggleRow(icon: "bubble.left.fill", title: "Messages", isOn: $notifMessages)
            toggleRow(icon: "paperplane.fill", title: "Tenders & decisions", isOn: $notifTenders)
            toggleRow(icon: "bell.fill", title: "Project activity", isOn: $notifActivity)
        }
    }

    // MARK: - Legal

    private var legal: some View {
        section("Privacy & legal") {
            linkRow(icon: "hand.raised.fill", title: "Privacy policy", url: "https://builderhq.com.au/privacy")
            linkRow(icon: "doc.text.fill", title: "Terms of service", url: "https://builderhq.com.au/terms")
        }
    }

    // MARK: - Support

    private var support: some View {
        section("Support") {
            Button {
                if let url = URL(string: "mailto:info@builderhq.com.au") { openURL(url) }
            } label: {
                navRow(icon: "questionmark.circle.fill", title: "Contact support")
            }
            .buttonStyle(.plain)
            linkRow(icon: "safari.fill", title: "Help & FAQ", url: "https://builderhq.com.au/help")
        }
    }

    // MARK: - Danger zone

    private var dangerZone: some View {
        VStack(spacing: 10) {
            Press(haptic: .tap) { confirmSignOut = true } content: {
                actionRow(icon: "rectangle.portrait.and.arrow.right", title: "Sign out", tint: Palette.text)
            }
            Press(haptic: .tap) { confirmDelete = true } content: {
                actionRow(icon: "trash.fill", title: "Delete account", tint: Palette.danger)
            }
        }
    }

    private var footer: some View {
        Text("BuilderHQ \(appVersion)")
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(Palette.textDim)
            .frame(maxWidth: .infinity)
            .padding(.top, 8)
    }

    private var appVersion: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        return "v\(v)"
    }

    // MARK: - Building blocks

    @ViewBuilder
    private func section<Content: View>(
        _ title: String,
        footnote: String? = nil,
        @ViewBuilder _ content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold)).tracking(1.6)
                .foregroundStyle(Palette.textDim)
                .padding(.leading, 4)
            VStack(spacing: 1) {
                content()
            }
            .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Palette.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).stroke(Palette.cardBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
            if let footnote {
                Text(footnote)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 4)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func iconTile(_ icon: String, _ tint: Color) -> some View {
        Image(systemName: icon)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 30, height: 30)
            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(tint.opacity(0.14)))
    }

    private func navRow(icon: String, title: String) -> some View {
        HStack(spacing: 12) {
            iconTile(icon, Palette.accent)
            Text(title).font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.text)
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.textDim)
        }
        .padding(.horizontal, 14).padding(.vertical, 13)
        .contentShape(Rectangle())
    }

    private func infoRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 12) {
            iconTile(icon, Palette.textMuted)
            Text(label).font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.text)
            Spacer()
            Text(value).font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.textMuted).lineLimit(1)
        }
        .padding(.horizontal, 14).padding(.vertical, 13)
    }

    private func toggleRow(icon: String, title: String, isOn: Binding<Bool>) -> some View {
        HStack(spacing: 12) {
            iconTile(icon, Palette.accent)
            Text(title).font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.text)
            Spacer()
            Toggle("", isOn: isOn).labelsHidden().tint(Palette.accent)
        }
        .padding(.horizontal, 14).padding(.vertical, 9)
    }

    private func linkRow(icon: String, title: String, url: String) -> some View {
        Button {
            if let u = URL(string: url) { openURL(u) }
        } label: {
            HStack(spacing: 12) {
                iconTile(icon, Palette.accent)
                Text(title).font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.text)
                Spacer()
                Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .bold)).foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 14).padding(.vertical, 13)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func actionRow(icon: String, title: String, tint: Color) -> some View {
        HStack(spacing: 12) {
            iconTile(icon, tint)
            Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(tint)
            Spacer()
        }
        .padding(.horizontal, 14).padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).stroke(tint == Palette.danger ? Palette.danger.opacity(0.25) : Palette.cardBorder, lineWidth: 1))
    }
}
