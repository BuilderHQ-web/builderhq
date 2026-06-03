/// ProfileHubScreen — the "You" tab.
///
/// Instagram-style: an identity header, an Edit-profile action, then
/// grouped sections of the user's details. Role-aware — builders get
/// their business card, verification, FBA status, and work profile;
/// owners get their details. A gear routes to Settings.
///
/// Every field degrades gracefully: empty values read as a muted "Add …"
/// prompt rather than a blank.

import SwiftUI

/// Push targets within the profile tab's NavigationStack.
enum ProfileRoute: Hashable {
    case editProfile
    case settings
    case categories
    case serviceAreas
    case licences
}

struct ProfileHubScreen: View {
    @Environment(AuthSession.self) private var session
    @Environment(\.openURL) private var openURL
    @State private var vm: ProfileHubViewModel

    init(role: AuthSession.Role) {
        _vm = State(initialValue: ProfileHubViewModel(role: role))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground().ignoresSafeArea()
                content
            }
            .navigationTitle("You")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: ProfileRoute.settings) {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Palette.text)
                    }
                }
            }
            .navigationDestination(for: ProfileRoute.self) { route in
                switch route {
                case .settings:
                    SettingsScreen()
                case .editProfile:
                    EditProfileScreen(
                        role: vm.role,
                        builder: vm.builder,
                        owner: vm.owner,
                        onSaved: { Task { await vm.load() } }
                    )
                case .categories:
                    CategoriesEditorScreen(
                        initial: vm.builder?.categories.map(\.category) ?? [],
                        onSaved: { Task { await vm.load() } }
                    )
                case .serviceAreas:
                    ServiceAreasEditorScreen(
                        initial: vm.builder?.serviceAreas ?? [],
                        onSaved: { Task { await vm.load() } }
                    )
                case .licences:
                    LicencesEditorScreen(
                        initial: vm.builder?.licences ?? [],
                        onSaved: { Task { await vm.load() } }
                    )
                }
            }
        }
        .task { await vm.load() }
    }

    @ViewBuilder
    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                editButton
                if vm.isBuilder { builderBody } else { ownerBody }
                settingsRow
                Spacer(minLength: 40)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
        }
        .scrollIndicators(.hidden)
        .refreshable { await vm.load() }
    }

    // MARK: - Identity

    private var displayName: String {
        if let n = name, !n.isEmpty { return n }
        if vm.isBuilder, let c = vm.builder?.profile?.companyName, !c.isEmpty { return c }
        return "Your account"
    }
    private var name: String? {
        if case let .signedIn(user) = session.state { return user.name }
        return nil
    }
    private var email: String? {
        if case let .signedIn(user) = session.state { return user.email }
        return nil
    }
    private var initials: String {
        let base = (vm.isBuilder ? (vm.builder?.profile?.companyName ?? name) : name) ?? "?"
        let parts = base.split(separator: " ").prefix(2).compactMap { $0.first }
        return parts.isEmpty ? "?" : String(parts).uppercased()
    }

    private var header: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle().fill(Palette.accentToBlue)
                Text(initials)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
            }
            .frame(width: 72, height: 72)
            .shadow(color: Palette.accentGlow.opacity(0.5), radius: 14, y: 5)

            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                roleChip
                if let email { Text(email).font(.system(size: 12.5, weight: .medium)).foregroundStyle(Palette.textDim).lineLimit(1) }
            }
            Spacer(minLength: 0)
        }
    }

    private var roleChip: some View {
        Text(vm.isBuilder ? "BUILDER" : "PROJECT OWNER")
            .font(.system(size: 9, weight: .black)).tracking(1.2)
            .foregroundStyle(Palette.accent)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Capsule().fill(Palette.accentMuted))
    }

    private var editButton: some View {
        NavigationLink(value: ProfileRoute.editProfile) {
            HStack(spacing: 8) {
                Image(systemName: "pencil").font(.system(size: 13, weight: .bold))
                Text("Edit profile").font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(Palette.text)
            .frame(maxWidth: .infinity).frame(height: 46)
            .background(Capsule().fill(Palette.surface))
            .overlay(Capsule().stroke(Palette.hairlineStrong, lineWidth: 1))
        }
        .buttonStyle(PressButtonStyle(haptic: .tap, scaleTo: 0.98))
    }

    // MARK: - Builder body

    @ViewBuilder
    private var builderBody: some View {
        if let b = vm.builder {
            verificationCard(b)
            if let fba = vm.fba { fbaCard(fba) }
            statsRow(b)
            if let bio = b.profile?.bio, !bio.isEmpty {
                section("About") {
                    Text(bio).font(.system(size: 14)).foregroundStyle(Palette.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            businessSection(b)
            contactSection(b)
            categoriesSection(b)
            serviceAreasSection(b)
            licencesSection(b)
        } else if case .error(let m) = vm.loadState {
            errorState(m)
        } else {
            skeleton
        }
    }

    private func verificationCard(_ b: BuilderAPI.Bundle) -> some View {
        let abn = b.lockState.abn
        let licensed = b.licences.contains { $0.verificationStatus == "verified" }
        let status = b.profile?.approvalStatus ?? "pending_review"
        return section("Verification") {
            HStack(spacing: 8) {
                verifyPill("ABN", ok: abn)
                verifyPill("Licensed", ok: licensed)
                Spacer()
                approvalChip(status)
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

    private func approvalChip(_ status: String) -> some View {
        let (label, tint): (String, Color) = {
            switch status {
            case "approved": return ("Approved", Palette.success)
            case "rejected": return ("Rejected", Palette.danger)
            default:         return ("In review", Palette.warning)
            }
        }()
        return Text(label.uppercased())
            .font(.system(size: 9, weight: .black)).tracking(0.8)
            .foregroundStyle(tint)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Capsule().fill(tint.opacity(0.14)))
    }

    @ViewBuilder
    private func fbaCard(_ fba: DashboardAPI.FbaStatus) -> some View {
        section("Founding Builder Access") {
            switch fba {
            case .active(let a):
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 12) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Palette.accentContrast)
                            .frame(width: 38, height: 38)
                            .background(RoundedRectangle(cornerRadius: 10).fill(Palette.accentToBlue))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(a.remainingThisCycle) of \(a.monthlyQuota) free unlock\(a.monthlyQuota == 1 ? "" : "s") left")
                                .font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.text)
                            Text("Resets in \(a.daysToRefresh) day\(a.daysToRefresh == 1 ? "" : "s")")
                                .font(.system(size: 11.5, weight: .medium)).foregroundStyle(Palette.textDim)
                        }
                        Spacer(minLength: 0)
                    }
                    HStack(spacing: 0) {
                        fbaStat("$\(formatThousands(a.totalSavedAud))", "Saved so far")
                        statDivider
                        fbaStat("\(a.cycleIndex)/\(a.totalCycles)", "Cycle")
                        statDivider
                        fbaStat("\(a.daysToGrantEnd)d", "Access left")
                    }
                }
            case .inactive:
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.textDim)
                    Text("Founding access isn't active on your account.")
                        .font(.system(size: 13)).foregroundStyle(Palette.textMuted)
                    Spacer(minLength: 0)
                }
            }
        }
    }

    private func fbaStat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 1) {
            Text(value).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundStyle(Palette.accent)
            Text(label.uppercased()).font(.system(size: 8, weight: .bold)).tracking(0.6).foregroundStyle(Palette.textDim)
        }
        .frame(maxWidth: .infinity)
    }

    private func formatThousands(_ n: Int) -> String {
        let f = NumberFormatter(); f.numberStyle = .decimal; f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: n)) ?? "\(n)"
    }

    // MARK: - Business + contact (the identity details)

    private func businessSection(_ b: BuilderAPI.Bundle) -> some View {
        let p = b.profile
        return section("Business") {
            VStack(spacing: 5) {
                abnRow(p?.abn, verified: b.lockState.abn)
                if let acn = p?.acn, !acn.isEmpty { infoLine("ACN", acn) }
                if let t = p?.tradingName, !t.isEmpty { infoLine("Trading as", t) }
                infoLine("Address", addressString(
                    line1: p?.businessAddressLine1, suburb: p?.businessSuburb,
                    state: p?.businessState, postcode: p?.businessPostcode
                ))
                if p?.hasDifferentPostal == true {
                    infoLine("Postal", addressString(
                        line1: p?.postalAddressLine1, suburb: p?.postalSuburb,
                        state: p?.postalState, postcode: p?.postalPostcode
                    ))
                }
            }
        }
    }

    private func abnRow(_ abn: String?, verified: Bool) -> some View {
        HStack {
            Text("ABN").font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.textMuted)
            Spacer()
            HStack(spacing: 6) {
                Text(abn?.isEmpty == false ? abn! : "Not added")
                    .font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text)
                if verified {
                    Image(systemName: "checkmark.seal.fill").font(.system(size: 11)).foregroundStyle(Palette.success)
                }
            }
        }
        .padding(.vertical, 5)
    }

    private func addressString(line1: String?, suburb: String?, state: String?, postcode: String?) -> String {
        let cityLine = [suburb, state, postcode].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
        let parts = [line1, cityLine].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? "Not set" : parts.joined(separator: ", ")
    }

    private func contactSection(_ b: BuilderAPI.Bundle) -> some View {
        let p = b.profile
        return section("Contact & links") {
            VStack(spacing: 5) {
                infoLine("Phone", b.phone ?? "Not set")
                if let w = p?.website, !w.isEmpty { linkLine("Website", w) }
                if let l = p?.linkedinUrl, !l.isEmpty { linkLine("LinkedIn", l) }
                if let i = p?.instagramUrl, !i.isEmpty { linkLine("Instagram", i) }
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
            .padding(.vertical, 5)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func statsRow(_ b: BuilderAPI.Bundle) -> some View {
        HStack(spacing: 0) {
            stat("\(b.profile?.yearsInOperation ?? 0)", "Years")
            statDivider
            stat("\(b.licences.count)", "Licences")
            statDivider
            stat("\(b.serviceAreas.count)", "Areas")
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

    private func categoriesSection(_ b: BuilderAPI.Bundle) -> some View {
        sectionEditable("Work categories", route: .categories) {
            if b.categories.isEmpty {
                emptyHint("No categories yet — add them in Edit profile.")
            } else {
                FlexibleWrapCompare(spacing: 7, lineSpacing: 7) {
                    ForEach(b.categories, id: \.category) { c in
                        chip(ProfileLabels.category(c.category))
                    }
                }
            }
        }
    }

    private func serviceAreasSection(_ b: BuilderAPI.Bundle) -> some View {
        sectionEditable("Service areas", route: .serviceAreas) {
            if b.serviceAreas.isEmpty {
                emptyHint("No service areas yet.")
            } else {
                VStack(spacing: 6) {
                    ForEach(b.serviceAreas) { a in
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
    }

    private func areaLabel(_ a: BuilderAPI.ServiceArea) -> String {
        if let suburb = a.suburb, !suburb.isEmpty { return "\(suburb), \(a.state)" }
        return a.state
    }

    private func licencesSection(_ b: BuilderAPI.Bundle) -> some View {
        sectionEditable("Licences", route: .licences) {
            if b.licences.isEmpty {
                emptyHint("No licences added.")
            } else {
                VStack(spacing: 8) {
                    ForEach(b.licences) { l in
                        HStack(spacing: 8) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(l.licenceType).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text).lineLimit(1)
                                Text("\(l.state) · №\(l.licenceNumber)").font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim).lineLimit(1)
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
    }

    // MARK: - Owner body

    @ViewBuilder
    private var ownerBody: some View {
        if let o = vm.owner {
            section("Your details") {
                infoLine("Type", ProfileLabels.entityType(o.profile?.entityType) ?? "Not set")
                if let c = o.profile?.companyName, !c.isEmpty { infoLine("Company", c) }
                infoLine("Location", ownerLocation(o))
                infoLine("Phone", o.phone ?? "Not set")
                infoLine("Preferred contact", ProfileLabels.contactPref(o.profile?.contactPref))
            }
        } else if case .error(let m) = vm.loadState {
            errorState(m)
        } else {
            skeleton
        }
    }

    private func ownerLocation(_ o: ProfileAPI.OwnerResponse) -> String {
        let p = o.profile
        let parts = [p?.defaultSuburb, p?.defaultState, p?.defaultPostcode].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? "Not set" : parts.joined(separator: " ")
    }

    // MARK: - Settings row

    private var settingsRow: some View {
        NavigationLink(value: ProfileRoute.settings) {
            HStack(spacing: 12) {
                Image(systemName: "gearshape.fill").font(.system(size: 14, weight: .semibold)).foregroundStyle(Palette.accent)
                    .frame(width: 30, height: 30).background(RoundedRectangle(cornerRadius: 8).fill(Palette.accentMuted))
                Text("Settings").font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.text)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 14).padding(.vertical, 14)
            .cardSurface(.flat, radius: Radius.card)
        }
        .buttonStyle(.plain)
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

    /// A section whose header carries an "Edit" link to a sub-editor.
    @ViewBuilder
    private func sectionEditable<Content: View>(_ title: String, route: ProfileRoute, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title.uppercased()).font(.system(size: 11, weight: .bold)).tracking(1.6).foregroundStyle(Palette.textDim)
                Spacer()
                NavigationLink(value: route) {
                    HStack(spacing: 3) {
                        Text("Edit").font(.system(size: 11, weight: .bold))
                        Image(systemName: "chevron.right").font(.system(size: 9, weight: .bold))
                    }
                    .foregroundStyle(Palette.accent)
                }
            }
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .cardSurface(.flat, radius: Radius.card)
        }
    }

    private func infoLine(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.textMuted)
            Spacer()
            Text(value).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text)
                .lineLimit(1).multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 5)
    }

    private func chip(_ text: String) -> some View {
        Text(text).font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.text)
            .padding(.horizontal, 11).padding(.vertical, 6)
            .background(Capsule().fill(Palette.surfaceElev))
            .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
    }

    private func emptyHint(_ text: String) -> some View {
        Text(text).font(.system(size: 13, weight: .regular)).foregroundStyle(Palette.textDim)
    }

    private var skeleton: some View {
        VStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in SkeletonView(cornerRadius: 18).frame(height: 80) }
        }
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark").font(.system(size: 26, weight: .semibold)).foregroundStyle(Palette.warning)
            Text(message).font(.system(size: 13)).foregroundStyle(Palette.textMuted).multilineTextAlignment(.center)
            Press(haptic: .tap) { Task { await vm.load() } } content: {
                Text("Try again").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 22).frame(height: 44).background(Capsule().fill(Palette.accent))
            }
        }
        .frame(maxWidth: .infinity).padding(.vertical, 40)
    }
}
