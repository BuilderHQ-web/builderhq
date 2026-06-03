/// BuilderProfileScreen — the owner-facing builder trust page.
///
/// A project owner opens this to vet a builder (from tender comparison or
/// chat): identity, verification, track record, coverage, licences.
/// Read-only — contact is routed through in-app messaging, not exposed
/// here. Presented as a sheet; dismisses itself.

import SwiftUI

/// Identifiable wrapper so any screen can present the builder profile via
/// `.sheet(item:)`. `id` is the builder's user id.
struct BuilderProfileLink: Identifiable, Equatable, Hashable {
    let id: String
    /// When set (owner viewing from a project/tender), the profile shows a
    /// "Message builder" CTA scoped to this project. Nil from chat.
    var projectSlug: String? = nil
}

@Observable
@MainActor
final class BuilderProfileViewModel {
    let builderId: String

    enum LoadState: Equatable { case loading, loaded, error(String) }
    private(set) var state: LoadState = .loading
    private(set) var profile: BuilderPublicAPI.Profile?

    init(builderId: String) { self.builderId = builderId }

    func load() async {
        state = .loading
        do {
            let p = try await BuilderPublicAPI.fetch(id: builderId)
            profile = p
            state = .loaded
        } catch let e as APIError {
            state = .error(e.errorDescription ?? "Couldn't load this builder.")
        } catch {
            state = .error("Couldn't load this builder.")
        }
    }
}

struct BuilderProfileScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var vm: BuilderProfileViewModel
    @State private var chatLink: MessagingAPI.Conversation? = nil
    @State private var openingChat = false

    /// When set, an owner can message this builder about that project.
    private let projectSlug: String?

    init(builderId: String, projectSlug: String? = nil) {
        _vm = State(initialValue: BuilderProfileViewModel(builderId: builderId))
        self.projectSlug = projectSlug
    }

    var body: some View {
        ZStack {
            AmbientBackground().ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    switch vm.state {
                    case .loading: skeleton
                    case .error(let m): errorState(m)
                    case .loaded:
                        if let p = vm.profile { loaded(p) }
                    }
                    Spacer(minLength: 30)
                }
                .padding(.horizontal, 20).padding(.top, 14)
            }
            .scrollIndicators(.hidden)
            .safeAreaInset(edge: .top, spacing: 0) { header }
        }
        .presentationDragIndicator(.hidden)
        .task { await vm.load() }
        .fullScreenCover(item: $chatLink) { convo in
            ChatScreen(conversation: convo)
        }
    }

    // MARK: - Header (frosted, matches the app)

    private var header: some View {
        HStack {
            Press(haptic: .tap) { dismiss() } content: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.text)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
                    .contentShape(Circle())
            }
            Spacer()
            Text("BUILDER PROFILE")
                .font(.system(size: 11, weight: .bold)).tracking(1.6).foregroundStyle(Palette.textDim)
            Spacer()
            Color.clear.frame(width: 38, height: 38) // balances the close button
        }
        .padding(.horizontal, 16).padding(.top, 6).padding(.bottom, 10)
        .background(
            ZStack(alignment: .bottom) {
                Rectangle().fill(.ultraThinMaterial)
                LinearGradient(colors: [Color.white.opacity(0.06), Color.white.opacity(0)],
                               startPoint: .top, endPoint: .center)
                    .blendMode(.plusLighter).allowsHitTesting(false)
                Rectangle()
                    .fill(LinearGradient(colors: [Palette.accent.opacity(0), Palette.accent.opacity(0.18), Palette.accent.opacity(0)],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(height: 0.5).blendMode(.plusLighter).allowsHitTesting(false)
            }
            .ignoresSafeArea(edges: .top)
        )
    }

    // MARK: - Loaded

    @ViewBuilder
    private func loaded(_ p: BuilderPublicAPI.Profile) -> some View {
        identity(p)
        if projectSlug != nil { messageCTA(p) }
        verification(p)
        stats(p)
        if let bio = p.bio, !bio.isEmpty {
            section("About") {
                Text(bio).font(.system(size: 14)).foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        if !locationString(p).isEmpty { locationSection(p) }
        if hasLinks(p) { linksSection(p) }
        if !p.categories.isEmpty { categoriesSection(p) }
        if !p.serviceAreas.isEmpty { serviceAreasSection(p) }
        if !p.licences.isEmpty { licencesSection(p) }
    }

    private func identity(_ p: BuilderPublicAPI.Profile) -> some View {
        HStack(spacing: 16) {
            ZStack {
                Circle().fill(Palette.accentToBlue)
                Text(initials(p.companyName))
                    .font(.system(size: 24, weight: .bold)).foregroundStyle(Palette.accentContrast)
            }
            .frame(width: 72, height: 72)
            .shadow(color: Palette.accentGlow.opacity(0.5), radius: 14, y: 5)

            VStack(alignment: .leading, spacing: 5) {
                Text(p.companyName)
                    .font(.system(size: 21, weight: .bold)).foregroundStyle(Palette.text)
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 6) {
                    Text("BUILDER").font(.system(size: 9, weight: .black)).tracking(1.2)
                        .foregroundStyle(Palette.accent)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Capsule().fill(Palette.accentMuted))
                    if let since = memberSince(p.memberSinceIso) {
                        Text(since).font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim)
                    }
                }
                if let t = p.tradingName, !t.isEmpty, t != p.companyName {
                    Text("Trading as \(t)")
                        .font(.system(size: 12.5, weight: .medium)).foregroundStyle(Palette.textMuted).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
    }

    private func messageCTA(_ p: BuilderPublicAPI.Profile) -> some View {
        Press(haptic: .tap) {
            guard !openingChat, let slug = projectSlug else { return }
            openingChat = true
            Task {
                defer { openingChat = false }
                if let convo = try? await MessagingAPI.startConversation(projectSlug: slug, builderId: vm.builderId) {
                    chatLink = convo
                }
            }
        } content: {
            HStack(spacing: 8) {
                if openingChat {
                    ProgressView().controlSize(.small).tint(Palette.accentContrast)
                } else {
                    Image(systemName: "message.fill").font(.system(size: 14, weight: .bold))
                }
                Text("Message \(p.companyName)").font(.system(size: 15, weight: .bold)).lineLimit(1)
            }
            .foregroundStyle(Palette.accentContrast)
            .frame(maxWidth: .infinity).frame(height: 50)
            .background(Capsule().fill(Palette.accent))
            .shadow(color: Palette.accentGlow, radius: 16, y: 6)
        }
    }

    private func verification(_ p: BuilderPublicAPI.Profile) -> some View {
        section("Verification") {
            HStack(spacing: 8) {
                verifyPill("ABN", ok: p.abnVerified)
                verifyPill("Licensed", ok: p.stats.verifiedLicenceCount > 0)
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.shield.fill").font(.system(size: 10, weight: .bold))
                    Text("VERIFIED").font(.system(size: 9, weight: .black)).tracking(0.8)
                }
                .foregroundStyle(Palette.success)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(Capsule().fill(Palette.success.opacity(0.14)))
            }
        }
    }

    private func verifyPill(_ text: String, ok: Bool) -> some View {
        HStack(spacing: 4) {
            Image(systemName: ok ? "checkmark.seal.fill" : "seal").font(.system(size: 10, weight: .bold))
            Text(text).font(.system(size: 11, weight: .bold))
        }
        .foregroundStyle(ok ? Palette.success : Palette.textDim)
        .padding(.horizontal, 9).padding(.vertical, 5)
        .background(Capsule().fill((ok ? Palette.success : Palette.textDim).opacity(0.12)))
    }

    private func stats(_ p: BuilderPublicAPI.Profile) -> some View {
        HStack(spacing: 0) {
            stat("\(p.yearsInOperation ?? 0)", "Years")
            statDivider
            stat("\(p.stats.awardedCount)", "Won")
            statDivider
            stat("\(p.stats.licenceCount)", "Licences")
        }
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: Radius.card).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.card).stroke(Palette.cardBorder, lineWidth: 1))
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 20, weight: .bold, design: .rounded)).foregroundStyle(Palette.text)
            Text(label.uppercased()).font(.system(size: 9, weight: .bold)).tracking(1.0).foregroundStyle(Palette.textDim)
        }
        .frame(maxWidth: .infinity)
    }
    private var statDivider: some View { Rectangle().fill(Palette.hairline).frame(width: 1, height: 30) }

    private func locationSection(_ p: BuilderPublicAPI.Profile) -> some View {
        section("Based in") {
            HStack(spacing: 10) {
                Image(systemName: "mappin.circle.fill").font(.system(size: 16)).foregroundStyle(Palette.accent)
                Text(locationString(p)).font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text)
                Spacer(minLength: 0)
            }
        }
    }

    private func linksSection(_ p: BuilderPublicAPI.Profile) -> some View {
        section("Links") {
            VStack(spacing: 5) {
                if let w = p.website, !w.isEmpty { linkLine("Website", w) }
                if let l = p.linkedinUrl, !l.isEmpty { linkLine("LinkedIn", l) }
                if let i = p.instagramUrl, !i.isEmpty { linkLine("Instagram", i) }
            }
        }
    }

    private func linkLine(_ label: String, _ value: String) -> some View {
        Button {
            let normalized = value.hasPrefix("http") ? value : "https://\(value)"
            if let url = URL(string: normalized) { openURL(url) }
        } label: {
            HStack {
                Text(label).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.textMuted)
                Spacer()
                HStack(spacing: 5) {
                    Text(value).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.accent).lineLimit(1)
                    Image(systemName: "arrow.up.right").font(.system(size: 9, weight: .bold)).foregroundStyle(Palette.accent)
                }
            }
            .padding(.vertical, 5).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func categoriesSection(_ p: BuilderPublicAPI.Profile) -> some View {
        section("Builds") {
            FlexibleWrapCompare(spacing: 7, lineSpacing: 7) {
                ForEach(p.categories, id: \.self) { c in chip(ProfileLabels.category(c)) }
            }
        }
    }

    private func serviceAreasSection(_ p: BuilderPublicAPI.Profile) -> some View {
        section("Service areas") {
            VStack(spacing: 6) {
                ForEach(p.serviceAreas) { a in
                    HStack(spacing: 8) {
                        Image(systemName: "mappin.circle.fill").font(.system(size: 13)).foregroundStyle(Palette.accent)
                        Text(areaLabel(a)).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.text)
                        Spacer()
                        Text("\(a.radiusKm) km").font(.system(size: 11, weight: .semibold)).foregroundStyle(Palette.textDim)
                    }
                }
            }
        }
    }

    private func licencesSection(_ p: BuilderPublicAPI.Profile) -> some View {
        section("Licences") {
            VStack(spacing: 8) {
                ForEach(p.licences) { l in
                    HStack(spacing: 8) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(l.licenceType).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text).lineLimit(1)
                            Text(licenceMeta(l)).font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim).lineLimit(1)
                        }
                        Spacer()
                        if l.verificationStatus == "verified" {
                            Image(systemName: "checkmark.seal.fill").font(.system(size: 13)).foregroundStyle(Palette.success)
                        }
                    }
                }
            }
        }
    }

    // MARK: - States

    private var skeleton: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                SkeletonView(cornerRadius: 36).frame(width: 72, height: 72)
                VStack(alignment: .leading, spacing: 8) {
                    SkeletonView(cornerRadius: 6).frame(width: 160, height: 18)
                    SkeletonView(cornerRadius: 6).frame(width: 90, height: 12)
                }
                Spacer()
            }
            ForEach(0..<3, id: \.self) { _ in SkeletonView(cornerRadius: 18).frame(height: 72) }
        }
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 28, weight: .semibold)).foregroundStyle(Palette.warning)
            Text(message).font(.system(size: 13)).foregroundStyle(Palette.textMuted).multilineTextAlignment(.center)
            Press(haptic: .tap) { Task { await vm.load() } } content: {
                Text("Try again").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 22).frame(height: 44).background(Capsule().fill(Palette.accent))
            }
        }
        .frame(maxWidth: .infinity).padding(.vertical, 60)
    }

    // MARK: - Building blocks

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased()).font(.system(size: 11, weight: .bold)).tracking(1.6).foregroundStyle(Palette.textDim)
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .cardSurface(.flat, radius: Radius.card)
        }
    }

    private func chip(_ text: String) -> some View {
        Text(text).font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.text)
            .padding(.horizontal, 11).padding(.vertical, 6)
            .background(Capsule().fill(Palette.surfaceElev))
            .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
    }

    // MARK: - Helpers

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ").prefix(2).compactMap { $0.first }
        return parts.isEmpty ? "?" : String(parts).uppercased()
    }

    private func locationString(_ p: BuilderPublicAPI.Profile) -> String {
        [p.suburb, p.state].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    }

    private func hasLinks(_ p: BuilderPublicAPI.Profile) -> Bool {
        [p.website, p.linkedinUrl, p.instagramUrl].contains { ($0?.isEmpty == false) }
    }

    private func areaLabel(_ a: BuilderPublicAPI.ServiceArea) -> String {
        if let suburb = a.suburb, !suburb.isEmpty { return "\(suburb), \(a.state)" }
        return a.state
    }

    private func licenceMeta(_ l: BuilderPublicAPI.Licence) -> String {
        var s = "\(l.state) · №\(l.licenceNumber)"
        if let iso = l.expiresAtIso, let d = ChatTime.parse(iso) {
            s += " · exp \(d.formatted(.dateTime.month(.abbreviated).year()))"
        }
        return s
    }

    private func memberSince(_ iso: String?) -> String? {
        guard let iso, let d = ChatTime.parse(iso) else { return nil }
        return "Joined \(d.formatted(.dateTime.month(.abbreviated).year()))"
    }
}
