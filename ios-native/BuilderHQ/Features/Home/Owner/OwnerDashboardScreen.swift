/// OwnerDashboardScreen — the project-owner's home tab.
///
/// Mirrors the builder dashboard's information architecture but with
/// owner-relevant content:
///
///   · Greeting header (time-of-day aware, italic accent)
///   · Hero CTA card:
///       - When the owner has zero projects → "Publish your first
///         project" big primary CTA. This is the wow moment of the
///         owner experience.
///       - When the owner has ≥1 project → summary card with
///         "Your active projects" + tender pipeline tally
///   · Pulse strip (active projects, drafts, total tenders, unread msgs)
///   · "Your projects" list — top 3 with status pills + stats per row
///
/// On tap of the hero CTA, presents the ProjectPublishWizard as a
/// fullscreen sheet. Wizard completion bubbles back via onPublished
/// callback which triggers a refetch.

import SwiftUI

struct OwnerDashboardScreen: View {
    @Environment(AuthSession.self) private var session
    @State private var vm = OwnerDashboardViewModel()
    @State private var showingPublishWizard: Bool = false
    @State private var scrollOffset: CGFloat = 0
    @State private var hasAppearedOnce: Bool = false

    // Since-last-visit: the hero tender count animates up from the value
    // it had when the owner last opened the app, with a "+N" chip.
    @AppStorage("owner.snap.tenders") private var snapTenders: Int = -1
    @State private var tenderDelta: Int = 0
    @State private var countFrom: Int = 0

    // Custom blueprint pull-to-refresh state.
    @State private var isRefreshing = false
    @State private var pullArmed = false
    private let refreshThreshold: CGFloat = 110

    // One-time light sweep across the portfolio hero on open.
    @State private var heroSheen = false

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            content
        }
        .fullScreenCover(isPresented: $showingPublishWizard) {
            ProjectPublishWizard {
                // On successful publish, refresh the dashboard so the
                // new project appears at the top of the list.
                showingPublishWizard = false
                Task { await vm.refresh() }
            } onDismiss: {
                showingPublishWizard = false
            }
        }
    }

    private var content: some View {
        ScrollView {
            GeometryReader { proxy in
                Color.clear
                    .preference(
                        key: ScrollOffsetKey.self,
                        value: -proxy.frame(in: .named("owner-scroll")).minY
                    )
            }
            .frame(height: 0)

            VStack(alignment: .leading, spacing: 28) {
                header

                if let bundle = vm.bundle {
                    heroBlock(bundle: bundle)
                    statsBlock(bundle: bundle)
                    liveProjectsBlock(bundle: bundle)
                    otherProjectsBlock(bundle: bundle)
                    activityBlock(bundle: bundle)
                } else if case .error(let message) = vm.loadState {
                    errorState(message: message)
                } else {
                    skeletonContent
                }

                Spacer(minLength: 80)
            }
            .padding(.horizontal, 20)
            .padding(.top, isRefreshing ? 64 : 12)
        }
        .scrollIndicators(.hidden)
        .coordinateSpace(name: "owner-scroll")
        .trackScrollOffset { v in
            scrollOffset = v
            handlePull(v)
        }
        .onPreferenceChange(ScrollOffsetKey.self) { offset in
            // iOS 17 fallback only — iOS 18+ uses onScrollGeometryChange.
            if #unavailable(iOS 18.0) {
                scrollOffset = offset
                handlePull(offset)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.clear)
        .overlay(alignment: .top) {
            BlueprintRefresh(
                progress: min(1, max(0, -scrollOffset) / refreshThreshold),
                refreshing: isRefreshing
            )
            .padding(.top, 10)
            .opacity(isRefreshing ? 1 : Double(min(1, max(0, -scrollOffset) / 40)))
            .allowsHitTesting(false)
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            HomeStickyHeader(scrollOffset: scrollOffset, compactTitle: firstName)
        }
        .task {
            if vm.bundle == nil {
                await vm.load()
            }
        }
        // Compute the "since last visit" delta the first time tenders
        // arrive (and on any later change — a fresh tender mid-session
        // animates the hero up live).
        .onChange(of: vm.bundle?.stats.totalTenders) { _, total in
            if let total { captureSnapshot(total) }
        }
        .sensoryFeedback(.increase, trigger: tenderDelta)
        // Tab-switch + foreground refresh so the dashboard reflects
        // changes (a new published project, a fresh tender) without
        // forcing the owner to pull-to-refresh.
        .onAppear {
            if hasAppearedOnce && vm.bundle != nil {
                Task { await vm.refresh() }
            }
            hasAppearedOnce = true
        }
        .onReceive(
            NotificationCenter.default
                .publisher(for: UIApplication.willEnterForegroundNotification)
        ) { _ in
            Task { await vm.refresh() }
        }
    }

    // MARK: - Header

    private var header: some View {
        let pair = vm.greetingPair(firstName: firstName)

        return GreetingHeader(
            plain: pair.plain,
            italic: pair.italic,
            tickerLines: headerTickerLines(),
            hasRevealed: vm.hasRevealed
        )
        .padding(.top, 4)
        .scrollTransition(.interactive, axis: .vertical) { content, phase in
            content
                .opacity(1 + phase.value * 0.7)
                .scaleEffect(
                    1 + phase.value * 0.06,
                    anchor: .topLeading
                )
                .offset(y: phase.value * 16)
        }
    }

    /// Dynamic, looping status lines (most-relevant first) for the
    /// self-typing greeting ticker.
    private func headerTickerLines() -> [String] {
        guard let b = vm.bundle else { return [] }
        if b.projects.isEmpty {
            return [
                "Publish your first project to get bids.",
                "Builders in your area are ready to quote.",
            ]
        }
        var lines: [String] = []
        let t = b.stats.totalTenders
        let u = b.stats.unreadMessages
        let a = b.stats.activeProjects
        let d = b.stats.draftProjects
        if t > 0 { lines.append("\(t) tender\(t == 1 ? "" : "s") waiting on your call.") }
        if u > 0 { lines.append("\(u) unread message\(u == 1 ? "" : "s") from builders.") }
        if a > 0 { lines.append("\(a) project\(a == 1 ? "" : "s") live and collecting bids.") }
        if t > 1 { lines.append("Compare every bid side by side.") }
        if d > 0 { lines.append("\(d) draft\(d == 1 ? "" : "s") ready to publish.") }
        if lines.isEmpty { lines.append("Your projects are live — builders are looking.") }
        return Array(lines.prefix(4))
    }

    // MARK: - Pull to refresh

    private func handlePull(_ offset: CGFloat) {
        guard !isRefreshing else { return }
        let pull = max(0, -offset)
        if pull >= refreshThreshold {
            pullArmed = true
        } else if pullArmed && pull < 8 {
            pullArmed = false
            triggerRefresh()
        }
    }

    private func triggerRefresh() {
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) { isRefreshing = true }
        Task {
            await vm.refresh()
            try? await Task.sleep(for: .milliseconds(550))
            withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { isRefreshing = false }
        }
    }

    /// Capture the tender-count delta since the last visit, then persist
    /// the new value. The hero always counts up from zero (so there's
    /// motion on every open); when the count actually grew since last
    /// visit it instead counts up from the old value and shows a chip.
    private func captureSnapshot(_ total: Int) {
        let old = snapTenders
        if old >= 0 && total > old {
            countFrom = old
            tenderDelta = total - old
        } else {
            countFrom = 0
            tenderDelta = 0
        }
        snapTenders = total
    }

    private var firstName: String {
        if case let .signedIn(user) = session.state {
            return user.name?.split(separator: " ").first.map(String.init) ?? "there"
        }
        return "there"
    }

    // MARK: - Hero block

    @ViewBuilder
    private func heroBlock(bundle: ProjectsAPI.OwnerDashboardBundle) -> some View {
        Group {
            if bundle.projects.isEmpty {
                emptyStateHero
            } else {
                activeProjectsHero(bundle: bundle)
            }
        }
        .revealed(vm.hasRevealed, delay: 0.10)
    }

    /// "Publish your first project" — the moment of arrival for new
    /// owners. Bold CTA card with a big primary action.
    private var emptyStateHero: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Palette.accent)
                    .frame(width: 5, height: 5)
                    .shadow(color: Palette.accentGlow, radius: 5)
                Text("GET STARTED")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.accent)
            }

            (
                Text("Publish your\n")
                    .font(Typography.ui(size: 32, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("first project.")
                    .font(Typography.serifItalic(size: 32))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.4)
            .lineSpacing(-2)

            Text("Builders within your service area get matched the moment your listing goes live. Takes under a minute.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)

            Press(haptic: .tap) {
                showingPublishWizard = true
            } content: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16, weight: .bold))
                    Text("Publish a project")
                        .font(.system(size: 16, weight: .bold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(Palette.accentContrast)
                .frame(height: 52)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Palette.accent))
                .shadow(color: Palette.accentGlow, radius: 18, x: 0, y: 8)
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(.hero, radius: 24)
    }

    private func activeProjectsHero(bundle: ProjectsAPI.OwnerDashboardBundle) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Palette.accent)
                    .frame(width: 5, height: 5)
                    .shadow(color: Palette.accentGlow, radius: 5)
                Text("YOUR PORTFOLIO")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.accent)
                Spacer()
                Press(haptic: .tap) {
                    showingPublishWizard = true
                } content: {
                    HStack(spacing: 5) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                        Text("New")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 10, x: 0, y: 4)
                }
            }

            HStack(alignment: .firstTextBaseline, spacing: 14) {
                AnimatedCounter(
                    intValue: vm.hasRevealed ? bundle.stats.totalTenders : countFrom,
                    font: Typography.numericHero,
                    color: Palette.text
                )
                .animation(.counterReveal, value: vm.hasRevealed)
                VStack(alignment: .leading, spacing: 2) {
                    Text(bundle.stats.totalTenders == 1 ? "tender received" : "tenders received")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                    Text("across \(bundle.stats.activeProjects) active project\(bundle.stats.activeProjects == 1 ? "" : "s")")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                }
                Spacer(minLength: 0)
            }

            if tenderDelta > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.right").font(.system(size: 9, weight: .black))
                    Text("+\(tenderDelta) since last visit").font(.system(size: 11, weight: .bold))
                }
                .foregroundStyle(Palette.accent)
                .padding(.horizontal, 9).padding(.vertical, 4)
                .background(Capsule().fill(Palette.accentMuted))
                .overlay(Capsule().stroke(Palette.accent.opacity(0.3), lineWidth: 1))
                .transition(.scale(scale: 0.8).combined(with: .opacity))
            }
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(.hero, radius: 24)
        .overlay {
            GeometryReader { geo in
                LinearGradient(colors: [.clear, Color.white.opacity(0.13), .clear],
                               startPoint: .leading, endPoint: .trailing)
                    .frame(width: geo.size.width * 0.4)
                    .rotationEffect(.degrees(18))
                    .offset(x: heroSheen ? geo.size.width + 130 : -150)
            }
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .allowsHitTesting(false)
        }
        .onAppear {
            guard !heroSheen else { return }
            withAnimation(.easeInOut(duration: 1.1).delay(0.45)) { heroSheen = true }
        }
    }

    // MARK: - Stats

    private func statsBlock(bundle: ProjectsAPI.OwnerDashboardBundle) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("Pulse")
            PulseStrip(
                tiles: [
                    .init(
                        label: "Active",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.activeProjects),
                        icon: "checkmark.seal.fill"
                    ),
                    .init(
                        label: "Drafts",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.draftProjects),
                        icon: "pencil.line"
                    ),
                    .init(
                        label: "Tenders",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.totalTenders),
                        icon: "paperplane.fill"
                    ),
                    .init(
                        label: "Messages",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.unreadMessages),
                        icon: "envelope.fill"
                    ),
                ],
                hasRevealed: vm.hasRevealed
            )
        }
        .revealed(vm.hasRevealed, delay: 0.20)
    }

    // MARK: - Live projects (Tender-Race cards)

    @ViewBuilder
    private func liveProjectsBlock(bundle: ProjectsAPI.OwnerDashboardBundle) -> some View {
        let live = bundle.projects.filter { $0.status == "published" || $0.status == "tendering" }
        if !live.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .firstTextBaseline) {
                    sectionLabel("Live projects")
                    Spacer()
                    Text("\(live.count)")
                        .font(.system(size: 11, weight: .semibold)).tracking(1.2)
                        .foregroundStyle(Palette.textDim)
                }
                VStack(spacing: 14) {
                    ForEach(Array(live.prefix(5).enumerated()), id: \.element.id) { idx, project in
                        NavigationLink(value: project.slug) {
                            TenderRaceCard(project: project)
                        }
                        .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.99))
                        .revealed(vm.hasRevealed, delay: 0.26 + Double(idx) * 0.05)
                        .scrollTransition(.interactive(timingCurve: .easeOut), axis: .vertical) { content, phase in
                            content
                                .opacity(1 - abs(phase.value) * 0.4)
                                .scaleEffect(1 - abs(phase.value) * 0.03, anchor: .center)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Other projects (drafts / archive) as compact rows

    @ViewBuilder
    private func otherProjectsBlock(bundle: ProjectsAPI.OwnerDashboardBundle) -> some View {
        let others = bundle.projects.filter { !($0.status == "published" || $0.status == "tendering") }
        if !others.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                sectionLabel("Drafts & archive")
                VStack(spacing: 12) {
                    ForEach(Array(others.prefix(5).enumerated()), id: \.element.id) { idx, project in
                        NavigationLink(value: project.slug) {
                            OwnerProjectRow(project: project)
                        }
                        .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.99))
                        .revealed(vm.hasRevealed, delay: 0.32 + Double(idx) * 0.05)
                    }
                }
            }
        }
    }

    // MARK: - Activity

    @ViewBuilder
    private func activityBlock(bundle: ProjectsAPI.OwnerDashboardBundle) -> some View {
        if !bundle.activity.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                sectionLabel("Activity")
                ActivityTimeline(items: bundle.activity.prefix(8).map { row in
                    ActivityItem(
                        id: row.id, kind: row.kind, title: row.title, body: row.body,
                        createdAtIso: row.createdAt,
                        actionSlug: ActivityItem.slug(from: row.actionUrl),
                        unread: row.readAt == nil
                    )
                })
                .padding(16)
                .cardSurface(.flat, radius: Radius.card)
            }
            .revealed(vm.hasRevealed, delay: 0.40)
        }
    }

    // MARK: - Skeleton + error

    private var skeletonContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            SkeletonView(cornerRadius: 24).frame(height: 200)
            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    SkeletonView().frame(height: 72)
                    SkeletonView().frame(height: 72)
                }
                HStack(spacing: 10) {
                    SkeletonView().frame(height: 72)
                    SkeletonView().frame(height: 72)
                }
            }
            VStack(spacing: 12) {
                SkeletonView(cornerRadius: 16).frame(height: 84)
                SkeletonView(cornerRadius: 16).frame(height: 84)
            }
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't load your dashboard")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
            Button {
                Task { await vm.load() }
            } label: {
                Text("Try again")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 20)
                    .frame(height: 44)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 12, x: 0, y: 6)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 32)
        .frame(maxWidth: .infinity)
        .cardSurface(.lifted, radius: 22)
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(2.4)
            .foregroundStyle(Palette.textDim)
    }
}

// MARK: - OwnerProjectRow

private struct OwnerProjectRow: View {
    let project: ProjectsAPI.OwnerProjectRow

    var body: some View {
        HStack(spacing: 14) {
            // Type-coloured square thumbnail
            ZStack {
                LinearGradient(
                    colors: typeGradient,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(systemName: typeIcon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Palette.hairline, lineWidth: 1)
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(project.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    statusPill
                    if let suburb = project.suburb, !suburb.isEmpty {
                        Text(suburb)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(Palette.textDim)
                            .lineLimit(1)
                    }
                }
            }

            Spacer(minLength: 0)

            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                    Text("\(project.stats.tenderCount)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .monospacedDigit()
                }
                Text("tenders")
                    .font(.system(size: 10, weight: .medium))
                    .tracking(0.8)
                    .foregroundStyle(Palette.textDim)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .cardSurface(.flat, radius: 18)
    }

    private var statusPill: some View {
        HStack(spacing: 4) {
            Circle().fill(statusColor).frame(width: 5, height: 5)
            Text(statusLabel)
                .font(.system(size: 10, weight: .bold))
                .tracking(0.8)
                .foregroundStyle(statusColor)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(Capsule().fill(statusColor.opacity(0.12)))
        .overlay(Capsule().stroke(statusColor.opacity(0.3), lineWidth: 1))
    }

    private var statusColor: Color {
        switch project.status {
        case "published", "tendering": return Palette.accent
        case "draft": return Palette.textMuted
        case "completed": return Palette.success
        default: return Palette.textDim
        }
    }

    private var statusLabel: String {
        switch project.status {
        case "published": return "LIVE"
        case "tendering": return "TENDERING"
        case "draft": return "DRAFT"
        case "completed": return "DONE"
        default: return project.status.uppercased()
        }
    }

    private var typeIcon: String {
        switch project.type {
        case "single_dwelling": return "house.fill"
        case "multi_dwelling": return "building.2.fill"
        case "renovation": return "paintbrush.fill"
        case "extension": return "rectangle.expand.vertical"
        default: return "square.dashed"
        }
    }

    private var typeGradient: [Color] {
        switch project.type {
        case "single_dwelling": return [Color(hex: 0x0E1F2E), Color(hex: 0x103948)]
        case "multi_dwelling":  return [Color(hex: 0x0B1E29), Color(hex: 0x13495C)]
        case "renovation":      return [Color(hex: 0x10293A), Color(hex: 0x0E5454)]
        case "extension":       return [Color(hex: 0x0A1F2A), Color(hex: 0x125864)]
        default:                return [Color(hex: 0x0E131F), Color(hex: 0x141A2A)]
        }
    }
}

// MARK: - Reveal modifier (shared with BuilderHomeScreen)

private extension View {
    @ViewBuilder
    func revealed(_ revealed: Bool, delay: Double) -> some View {
        self
            .opacity(revealed ? 1 : 0)
            .offset(y: revealed ? 0 : 18)
            .animation(
                .spring(response: 0.6, dampingFraction: 0.86).delay(delay),
                value: revealed
            )
    }
}
