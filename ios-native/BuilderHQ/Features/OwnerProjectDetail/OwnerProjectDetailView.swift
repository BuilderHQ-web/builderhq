/// OwnerProjectDetailView — the owner's own project screen.
///
/// Purpose-built for the owner (not the builder marketplace view): no
/// "save/like" affordance, a Share action (to send to a builder), the
/// full address, the project's pipeline stats, its details + documents,
/// and the two actions that matter — Edit project, and Review tenders.

import SwiftUI

struct OwnerProjectDetailView: View {
    @Environment(\.dismiss) private var dismiss

    let slug: String
    let owner: ProjectsAPI.ProjectDetailResponse.Owner
    /// Called after an edit so the host can refetch the detail.
    let onNeedsRefresh: () -> Void

    @State private var showingEdit = false
    @State private var showingReview = false
    @State private var heroIn = false
    @State private var statusPulse = false
    @State private var showingDelete = false
    @State private var deleteBlocked = false
    @State private var deleteUnlockCount = 0
    @State private var isDeleting = false

    private var p: ProjectsAPI.DetailProjectFields { owner.project }
    private var stats: ProjectsAPI.ProjectDetailResponse.OwnerStatsBlock { owner.stats }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    hero
                    statsRow
                    detailsSection
                    if let d = p.description, !d.isEmpty { descriptionSection(d) }
                    locationSection
                    documentsSection
                    deleteRow
                    Spacer(minLength: 120)
                }
                .padding(.horizontal, 20).padding(.top, 14)
            }
            .scrollIndicators(.hidden)
            // Content scrolls UNDER a frosted-glass header (matches the
            // builder detail screen + the native nav-bar look elsewhere).
            .safeAreaInset(edge: .top, spacing: 0) { header }

            ctaBar
        }
        .fullScreenCover(isPresented: $showingEdit) {
            NavigationStack {
                EditProjectScreen(project: p, documents: owner.documents, onSaved: onNeedsRefresh)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Cancel") { showingEdit = false }
                        }
                    }
            }
        }
        .fullScreenCover(isPresented: $showingReview) {
            TenderCompareScreen(slug: slug, projectTitle: p.title, onClose: { showingReview = false })
        }
        .overlay {
            if showingDelete {
                ConfirmOverlay(
                    icon: deleteBlocked ? "lock.fill" : "trash.fill",
                    iconTint: deleteBlocked ? Palette.warning : Palette.danger,
                    title: deleteBlocked ? "Can't delete yet" : "Delete project?",
                    message: deleteBlocked
                        ? "\(deleteUnlockCount) builder\(deleteUnlockCount == 1 ? " has" : "s have") unlocked this project, so it can't be deleted. You can archive it later instead."
                        : "This permanently removes “\(p.title)”. This can't be undone.",
                    confirmLabel: deleteBlocked ? "Got it" : "Delete",
                    confirmTint: deleteBlocked ? Palette.accent : Palette.danger,
                    onConfirm: {
                        showingDelete = false
                        if !deleteBlocked { performDelete() }
                    },
                    onCancel: { showingDelete = false }
                )
            }
        }
    }

    // MARK: - Delete

    private var deleteRow: some View {
        Press(haptic: .tap) {
            deleteUnlockCount = stats.unlockCount
            deleteBlocked = stats.unlockCount > 0
            showingDelete = true
        } content: {
            HStack(spacing: 8) {
                if isDeleting {
                    ProgressView().controlSize(.small).tint(Palette.danger)
                } else {
                    Image(systemName: "trash").font(.system(size: 13, weight: .semibold))
                }
                Text("Delete project").font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(Palette.danger)
            .frame(maxWidth: .infinity).frame(height: 46)
            .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Palette.danger.opacity(0.08)))
            .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).stroke(Palette.danger.opacity(0.25), lineWidth: 1))
        }
        .disabled(isDeleting)
        .padding(.top, 4)
    }

    private func performDelete() {
        isDeleting = true
        Task {
            defer { isDeleting = false }
            do {
                try await ProjectsAPI.deleteProject(slug: slug)
                onNeedsRefresh()
                dismiss()
            } catch {
                // Raced an unlock (or other failure) — surface the block.
                deleteUnlockCount = max(deleteUnlockCount, stats.unlockCount, 1)
                deleteBlocked = true
                showingDelete = true
            }
        }
    }

    // MARK: - Header (back + share, NO like)

    private var header: some View {
        HStack(spacing: 12) {
            Press(haptic: .tap) { dismiss() } content: {
                // chevron.left reads slightly left of centre — nudge right to balance.
                chromeCircle(icon: "chevron.left", size: 16, weight: .bold, nudge: CGSize(width: 1, height: 0))
            }
            Spacer()
            ShareLink(item: shareURL, subject: Text(p.title), message: Text("Take a look at my project on BuilderHQ.")) {
                // square.and.arrow.up's box sits visually low — lift it 1pt to centre.
                chromeCircle(icon: "square.and.arrow.up", size: 15, weight: .semibold, nudge: CGSize(width: 0, height: -1))
            }
        }
        .padding(.horizontal, 16).padding(.top, 6).padding(.bottom, 10)
        .background(
            ZStack(alignment: .bottom) {
                // Frosted glass plate — GPU live blur of whatever scrolls beneath.
                Rectangle().fill(.ultraThinMaterial)
                // Faint top-edge gloss — sells physical thickness, never reads as chrome.
                LinearGradient(colors: [Color.white.opacity(0.06), Color.white.opacity(0)],
                               startPoint: .top, endPoint: .center)
                    .blendMode(.plusLighter).allowsHitTesting(false)
                // Hair-thin accent highlight along the bottom edge.
                Rectangle()
                    .fill(LinearGradient(colors: [Palette.accent.opacity(0), Palette.accent.opacity(0.18), Palette.accent.opacity(0)],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(height: 0.5).blendMode(.plusLighter).allowsHitTesting(false)
            }
            // Stretch up through the safe area so the status bar shares the frost.
            .ignoresSafeArea(edges: .top)
        )
    }

    /// A guaranteed-circular chrome button. `nudge` optically re-centres the
    /// glyph without affecting layout (the frame stays a perfect circle).
    private func chromeCircle(icon: String, size: CGFloat, weight: Font.Weight, nudge: CGSize) -> some View {
        Image(systemName: icon)
            .font(.system(size: size, weight: weight))
            .foregroundStyle(Palette.text)
            .offset(nudge)
            .frame(width: 38, height: 38)
            .background(Circle().fill(Palette.surface.opacity(0.7)))
            .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            .contentShape(Circle())
    }

    private var shareURL: URL {
        URL(string: "https://builderhq.com.au/projects/\(slug)") ?? URL(string: "https://builderhq.com.au")!
    }

    // MARK: - Hero

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Eyebrow — a small, breathing accent dot + label.
            HStack(spacing: 7) {
                Circle().fill(Palette.accent).frame(width: 6, height: 6)
                    .shadow(color: Palette.accentGlow, radius: statusPulse ? 7 : 2)
                    .scaleEffect(statusPulse ? 1.0 : 0.7)
                    .animation(.easeInOut(duration: 1.3).repeatForever(autoreverses: true), value: statusPulse)
                Text("YOUR PROJECT")
                    .font(.system(size: 9, weight: .black)).tracking(2.2)
                    .foregroundStyle(Palette.accentLight)
            }
            Text(p.title)
                .font(Typography.ui(size: 28, weight: .semibold))
                .tracking(-0.4)
                .foregroundStyle(Palette.text)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                statusBadge
                typeChip
            }
            if let published = ChatTime.parse(p.publishedAtIso) {
                HStack(spacing: 5) {
                    Image(systemName: "calendar").font(.system(size: 10, weight: .semibold))
                    Text("Published \(published.formatted(.dateTime.month(.abbreviated).day().year()))")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(Palette.textDim)
                .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            ZStack {
                LinearGradient(colors: [Palette.surfaceElev, Palette.surface], startPoint: .top, endPoint: .bottom)
                RadialGradient(colors: [Palette.accent.opacity(0.20), .clear], center: .topTrailing, startRadius: 6, endRadius: 260)
                BlueprintGrid(spacing: 20, tint: Palette.accentLight, minorOpacity: 0.05)
                heroSheen
            }
            .clipShape(RoundedRectangle(cornerRadius: Radius.hero, style: .continuous))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Radius.hero, style: .continuous)
                .stroke(
                    LinearGradient(colors: [Palette.accent.opacity(0.45), Palette.accent.opacity(0.12)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    lineWidth: 1
                )
        )
        .onAppear { heroIn = true; statusPulse = true }
    }

    /// A one-time diagonal light sweep across the hero on appear.
    private var heroSheen: some View {
        GeometryReader { geo in
            let w = geo.size.width
            LinearGradient(colors: [.clear, Color.white.opacity(0.12), .clear], startPoint: .leading, endPoint: .trailing)
                .frame(width: w * 0.42)
                .rotationEffect(.degrees(20))
                .offset(x: heroIn ? w + 100 : -140)
                .animation(.easeInOut(duration: 1.15).delay(0.3), value: heroIn)
        }
    }

    private var statusBadge: some View {
        let (label, tint): (String, Color) = {
            switch p.status {
            case "published": return ("LIVE", Palette.success)
            case "tendering": return ("TENDERING", Palette.accent)
            case "awarded":   return ("AWARDED", Palette.gold)
            case "archived":  return ("ARCHIVED", Palette.textDim)
            default:          return ("DRAFT", Palette.warning)
            }
        }()
        return Text(label).font(.system(size: 9, weight: .black)).tracking(1.2)
            .foregroundStyle(tint)
            .padding(.horizontal, 9).padding(.vertical, 4)
            .background(Capsule().fill(tint.opacity(0.16)))
    }

    private var typeChip: some View {
        Text(ProjectBands.typeLabel(p.type).uppercased())
            .font(.system(size: 9, weight: .bold)).tracking(1.0)
            .foregroundStyle(Palette.textDim)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Capsule().fill(Palette.surfaceElev))
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: 0) {
            stat("\(stats.unlockCount)", "Unlocks", "lock.open.fill")
            statDivider
            stat("\(stats.tenderCount)", "Tenders", "paperplane.fill")
            statDivider
            stat("\(stats.unreadMessages)", "Unread", "bubble.left.fill")
        }
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: Radius.card).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.card).stroke(Palette.cardBorder, lineWidth: 1))
    }

    private func stat(_ value: String, _ label: String, _ icon: String) -> some View {
        VStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.accent)
            Text(value).font(.system(size: 19, weight: .bold, design: .rounded)).foregroundStyle(Palette.text)
            Text(label.uppercased()).font(.system(size: 9, weight: .bold)).tracking(0.8).foregroundStyle(Palette.textDim)
        }
        .frame(maxWidth: .infinity)
    }
    private var statDivider: some View { Rectangle().fill(Palette.hairline).frame(width: 1, height: 36) }

    // MARK: - Details

    private var detailsSection: some View {
        section("Project details") {
            VStack(spacing: 5) {
                rows
            }
        }
    }

    @ViewBuilder
    private var rows: some View {
        switch p.type {
        case "multi_dwelling":
            if let n = p.dwellingCount { infoLine("Dwellings", "\(n)") }
            bedBathFloorRows
            infoLine("Land size", ProjectBands.label(p.landSizeBand, in: ProjectBands.land))
            infoLine("Build size", ProjectBands.label(p.buildSizeBand, in: ProjectBands.build))
        case "renovation":
            if let s = p.renovationScope { infoLine("Scope", ProjectBands.label(s, in: ProjectBands.renovationScope)) }
            infoLine("Age of home", ProjectBands.label(p.existingAgeBand, in: ProjectBands.existingAge))
            bedBathFloorRows
        case "extension":
            infoLine("Extension", ProjectBands.label(p.extensionType, in: ProjectBands.extensionType))
            infoLine("Added size", ProjectBands.label(p.extensionSizeBand, in: ProjectBands.extensionSize))
            infoLine("Age of home", ProjectBands.label(p.existingAgeBand, in: ProjectBands.existingAge))
        default:
            bedBathFloorRows
            infoLine("Land size", ProjectBands.label(p.landSizeBand, in: ProjectBands.land))
            infoLine("Build size", ProjectBands.label(p.buildSizeBand, in: ProjectBands.build))
        }
        infoLine("Budget", ProjectBands.label(p.budgetBand, in: ProjectBands.budget))
        infoLine("Target start", ProjectBands.monthLabel(p.targetStartMonth))
        if p.targetCompletionMonth != nil {
            infoLine("Target completion", ProjectBands.monthLabel(p.targetCompletionMonth))
        }
    }

    @ViewBuilder
    private var bedBathFloorRows: some View {
        if let b = p.bedrooms { infoLine("Bedrooms", "\(b)") }
        if let b = p.bathrooms { infoLine("Bathrooms", "\(b)") }
        if let f = p.floors { infoLine("Floors", "\(f)") }
    }

    // MARK: - Description / location / documents

    private func descriptionSection(_ d: String) -> some View {
        section("Scope") {
            Text(d).font(.system(size: 14)).foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var locationSection: some View {
        section("Location") {
            HStack(spacing: 10) {
                Image(systemName: "mappin.circle.fill").font(.system(size: 16)).foregroundStyle(Palette.accent)
                Text(addressString).font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
        }
    }

    private var addressString: String {
        let cityLine = [p.suburb, p.state, p.postcode].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
        let parts = [p.addressLine1, cityLine].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? "Not set" : parts.joined(separator: ", ")
    }

    private var documentsSection: some View {
        section("Documents") {
            if owner.documents.isEmpty {
                Text("No documents yet. Add architectural plans to publish.")
                    .font(.system(size: 13)).foregroundStyle(Palette.textDim)
            } else {
                VStack(spacing: 8) {
                    ForEach(owner.documents) { doc in
                        HStack(spacing: 10) {
                            Image(systemName: "doc.fill").font(.system(size: 14)).foregroundStyle(Palette.accent)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(doc.filename).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text)
                                    .lineLimit(1).truncationMode(.middle)
                                Text(prettyDoc(doc)).font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.textDim)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
            }
        }
    }

    private func prettyDoc(_ d: ProjectsAPI.DocumentRow) -> String {
        let kb = Double(d.sizeBytes) / 1024
        let size = kb < 1024 ? String(format: "%.0f KB", kb) : String(format: "%.1f MB", kb / 1024)
        return "\(d.category.replacingOccurrences(of: "_", with: " ").capitalized) · \(size)"
    }

    // MARK: - CTA bar

    private var ctaBar: some View {
        HStack(spacing: 12) {
            Press(haptic: .tap) { showingEdit = true } content: {
                HStack(spacing: 8) {
                    Image(systemName: "pencil").font(.system(size: 14, weight: .bold))
                    Text("Edit project").font(.system(size: 15, weight: .bold))
                }
                .foregroundStyle(stats.tenderCount > 0 ? Palette.text : Palette.accentContrast)
                .frame(maxWidth: .infinity).frame(height: 52)
                .background(Capsule().fill(stats.tenderCount > 0 ? Palette.surface : Palette.accent))
                .overlay(stats.tenderCount > 0 ? Capsule().stroke(Palette.hairlineStrong, lineWidth: 1) : nil)
                .shadow(color: stats.tenderCount > 0 ? .clear : Palette.accentGlow, radius: 18, y: 8)
            }
            if stats.tenderCount > 0 {
                Press(haptic: .tap) { showingReview = true } content: {
                    HStack(spacing: 8) {
                        Image(systemName: "rectangle.stack.fill").font(.system(size: 14, weight: .bold))
                        Text("Review \(stats.tenderCount)").font(.system(size: 15, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 18, y: 8)
                }
            }
        }
        .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 16)
        .background(
            LinearGradient(colors: [Palette.canvas.opacity(0), Palette.canvas.opacity(0.94)], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    // MARK: - Section helper

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

    private func infoLine(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.textMuted)
            Spacer()
            Text(value).font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.text)
                .lineLimit(1).multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 5)
    }
}
