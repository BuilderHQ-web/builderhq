/// HomeScreen — the builder's signed-in landing screen.
///
/// Architecture:
///   · @State HomeViewModel owns the fetch + reveal state.
///   · Sections render conditionally based on the bundle (verification
///     vs FBA, empty vs populated feed, etc.).
///   · Stagger reveal on first paint — each section fades + lifts in
///     turn so the user lands on a screen that's "waking up" rather
///     than fully drawn the instant they open the tab.
///   · Pull-to-refresh uses SwiftUI's native `.refreshable` which now
///     triggers the dial indicator iOS provides; calling vm.refresh()
///     swaps in fresh data without resetting the reveal animation.
///
/// Skeleton state — when there's no bundle yet (cold start, first
/// fetch in flight), each section renders a SkeletonView in roughly
/// its real shape so the layout doesn't pop on data arrival.

import SwiftUI

struct BuilderHomeScreen: View {
    @Environment(AuthSession.self) private var session
    @State private var vm = HomeViewModel()

    /// Tracks how far the user has scrolled. Drives the
    /// glass-fade-in on the sticky header.
    @State private var scrollOffset: CGFloat = 0

    /// True after the initial appear so subsequent appears (from a
    /// tab switch returning to Home) can trigger a silent refresh.
    /// Without this, every tab switch double-fires alongside `.task`'s
    /// first-load fetch.
    @State private var hasAppearedOnce: Bool = false

    // Since-last-visit: how many new matches appeared since last open.
    @AppStorage("builder.snap.suggested") private var snapSuggested: Int = -1
    @State private var matchDelta: Int = 0

    // Custom blueprint pull-to-refresh state.
    @State private var isRefreshing = false
    @State private var pullArmed = false
    private let refreshThreshold: CGFloat = 110

    var body: some View {
        ZStack {
            // iOS 17 TabView wraps each tab in a UIHostingController
            // whose .systemBackground covers the global AmbientBackground
            // mounted at RootView. There's no SwiftUI API to make the
            // hosting controller's bg transparent, so we re-mount the
            // ambient atmosphere here. Cheap — AmbientBackground is
            // composed of gradients + a Canvas noise pass, no
            // network/storage cost.
            AmbientBackground()
                .ignoresSafeArea()

            content
        }
    }

    private var content: some View {
        ScrollView {
            // Invisible "scroll probe" — captures the current scroll
            // top-edge offset and propagates it via PreferenceKey.
            // The sticky header reads this to drive its glass-fade-in.
            GeometryReader { proxy in
                Color.clear
                    .preference(
                        key: ScrollOffsetKey.self,
                        value: -proxy.frame(in: .named("home-scroll")).minY
                    )
            }
            .frame(height: 0)

            VStack(alignment: .leading, spacing: 28) {
                header

                if let bundle = vm.bundle {
                    heroBlock(bundle: bundle)
                    pipelineBlock(bundle: bundle)
                    statsBlock(bundle: bundle)
                    pickupLaneBlock(bundle: bundle)
                    suggestedFeedBlock(bundle: bundle)
                    activityBlock(bundle: bundle)
                } else if case .error(let message) = vm.loadState {
                    errorState(message: message)
                } else {
                    skeletonContent
                }

                Spacer(minLength: 80)
            }
            .padding(.horizontal, 20)
            // Top breathing room — grows while refreshing so the
            // branded indicator has room to spin above the content.
            .padding(.top, isRefreshing ? 64 : 12)
        }
        .scrollIndicators(.hidden)
        .coordinateSpace(name: "home-scroll")
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
        // Critical for letting AmbientBackground show through.
        // iOS 17 ScrollView paints a system background by default;
        // `.hidden` makes it transparent.
        .scrollContentBackground(.hidden)
        .background(Color.clear)
        // Branded blueprint pull-to-refresh — draws on pull, spins on refresh.
        .overlay(alignment: .top) {
            BlueprintRefresh(
                progress: min(1, max(0, -scrollOffset) / refreshThreshold),
                refreshing: isRefreshing
            )
            .padding(.top, 10)
            .opacity(isRefreshing ? 1 : Double(min(1, max(0, -scrollOffset) / 40)))
            .allowsHitTesting(false)
        }
        // Glass sticky header. Transparent at rest, fades in as the
        // user scrolls past ~40pt.
        .safeAreaInset(edge: .top, spacing: 0) {
            HomeStickyHeader(scrollOffset: scrollOffset, compactTitle: firstName)
        }
        .onChange(of: vm.bundle?.stats.suggestedCount) { _, count in
            guard let count else { return }
            matchDelta = snapSuggested < 0 ? 0 : max(0, count - snapSuggested)
            snapSuggested = count
        }
        .task {
            // .task runs on first appear and cancels on disappear,
            // perfect for one-shot data loads tied to the view life.
            if vm.bundle == nil {
                await vm.load()
            }
        }
        // Tab-switch refresh: each time Home becomes the active tab
        // (after the very first appear), silently refetch so stats
        // reflect what just happened on Browse / Detail. The
        // `hasAppearedOnce` guard prevents a double-fetch on first
        // mount where `.task` already loads.
        .onAppear {
            if hasAppearedOnce && vm.bundle != nil {
                Task { await vm.refresh() }
            }
            hasAppearedOnce = true
        }
        // Foreground-return refresh: when the app comes back from
        // background, refetch so we don't show stale numbers. Cheap —
        // same endpoint as initial load.
        .onReceive(
            NotificationCenter.default
                .publisher(for: UIApplication.willEnterForegroundNotification)
        ) { _ in
            Task { await vm.refresh() }
        }
        .navigationBarHidden(true)
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
        // Scroll parallax — as the greeting scrolls toward the top
        // edge of the screen it fades + shrinks slightly. The
        // `.scrollTransition` modifier (iOS 17+) tracks distance from
        // the visible viewport and gives us a phased interpolation
        // value (1 → 0) which we map to opacity + scale.
        //
        // Subtle on purpose — premium parallax is felt before it's
        // noticed. ~30% scale-down + 60% fade at the top edge.
        .scrollTransition(.interactive, axis: .vertical) { content, phase in
            content
                .opacity(1 + phase.value * 0.7) // phase.value goes 0 → -1 as it scrolls past
                .scaleEffect(
                    1 + phase.value * 0.06,
                    anchor: .topLeading
                )
                .offset(y: phase.value * 16)
        }
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

    /// Dynamic, looping status lines (most-relevant first) for the
    /// self-typing greeting ticker — won → shortlisted → in the running →
    /// fuel → fresh matches.
    private func headerTickerLines() -> [String] {
        guard let b = vm.bundle else { return [] }
        if b.profile.approvalStatus != "approved" {
            return [
                "Hang tight while we review your account.",
                "We'll ping you the moment you're verified.",
            ]
        }
        var lines: [String] = []
        let awarded = b.myTenders.filter { $0.status == "awarded" }.count
        let shortlisted = b.myTenders.filter { $0.status == "shortlisted" }.count
        let live = b.myTenders.filter { $0.status == "submitted" || $0.status == "shortlisted" }.count
        if awarded > 0 {
            lines.append(awarded == 1 ? "You won a tender — time to build." : "You've won \(awarded) tenders — time to build.")
        }
        if shortlisted > 0 { lines.append("Shortlisted on \(shortlisted) — owners are deciding.") }
        if live > 0 { lines.append("You're in the running on \(live) tender\(live == 1 ? "" : "s").") }
        if case let .active(act) = b.fba, act.remainingThisCycle > 0 {
            lines.append("\(act.remainingThisCycle) free unlock\(act.remainingThisCycle == 1 ? "" : "s") left this cycle.")
        }
        if b.stats.suggestedCount > 0 {
            lines.append("\(b.stats.suggestedCount) project\(b.stats.suggestedCount == 1 ? "" : "s") match your trade.")
        }
        if b.stats.savedProjects > 0 {
            lines.append("\(b.stats.savedProjects) saved project\(b.stats.savedProjects == 1 ? "" : "s") to revisit.")
        }
        if lines.isEmpty { lines.append("Fresh work lands in your area daily.") }
        return Array(lines.prefix(4))
    }

    private var firstName: String {
        if case let .signedIn(user) = session.state {
            return user.name?.split(separator: " ").first.map(String.init) ?? "there"
        }
        return "there"
    }

    // MARK: - Hero (verification OR FBA)

    @ViewBuilder
    private func heroBlock(bundle: DashboardAPI.BuilderBundle) -> some View {
        Group {
            if vm.showsApprovalCallout {
                VerificationCallout(
                    approvalStatus: bundle.profile.approvalStatus ?? "incomplete",
                    abnVerified: bundle.verification.abnVerified,
                    anyLicenceVerified: bundle.verification.anyLicenceVerified
                )
            } else if vm.showsFbaHero,
                      case let .active(active) = bundle.fba {
                FBAHeroCard(active: active, hasRevealed: vm.hasRevealed)
            } else if case let .inactive(reason) = bundle.fba,
                      bundle.profile.approvalStatus == "approved" {
                inactiveFbaCard(reason: reason)
            }
        }
        .revealed(vm.hasRevealed, delay: 0.10)
    }

    private func inactiveFbaCard(reason: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                Text("FOUNDING ACCESS")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.textDim)
            }
            Text(inactiveTitle(for: reason))
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text("You can still unlock projects individually — see the suggested feed below.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    private func inactiveTitle(for reason: String) -> String {
        switch reason {
        case "expired":   return "Your founding cycle has ended."
        case "revoked":   return "Founding access was revoked."
        case "no_grant":  return "Founding access isn't active on this account."
        default:          return "Founding access is currently inactive."
        }
    }

    // MARK: - Stats

    private func statsBlock(bundle: DashboardAPI.BuilderBundle) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("This week")
            PulseStrip(
                tiles: [
                    .init(
                        label: "Active tenders",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.activeTenders),
                        icon: "paperplane.fill"
                    ),
                    .init(
                        label: "Saved",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.savedProjects),
                        icon: "bookmark.fill"
                    ),
                    .init(
                        label: "Unlocks",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.unlockedProjects),
                        icon: "lock.open.fill"
                    ),
                    .init(
                        label: "Matches",
                        valueText: { v in "\(Int(v.rounded()))" },
                        target: Double(bundle.stats.suggestedCount),
                        icon: "sparkles"
                    ),
                ],
                hasRevealed: vm.hasRevealed
            )
        }
        .revealed(vm.hasRevealed, delay: 0.20)
    }

    // MARK: - Tender pipeline (your live bids)

    @ViewBuilder
    private func pipelineBlock(bundle: DashboardAPI.BuilderBundle) -> some View {
        if !bundle.myTenders.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    sectionLabel("Your tenders")
                    Spacer()
                    Text("\(bundle.myTenders.count) live")
                        .font(.system(size: 11, weight: .semibold)).tracking(1.2)
                        .foregroundStyle(Palette.textDim)
                }
                TenderPipelineLane(tenders: bundle.myTenders)
            }
            .revealed(vm.hasRevealed, delay: 0.16)
        }
    }

    // MARK: - Pick up where you left off

    @ViewBuilder
    private func pickupLaneBlock(bundle: DashboardAPI.BuilderBundle) -> some View {
        if !bundle.unlocked.isEmpty {
            PickupLane(unlocked: bundle.unlocked, hasRevealed: vm.hasRevealed)
                .revealed(vm.hasRevealed, delay: 0.22)
        }
    }

    // MARK: - Activity

    @ViewBuilder
    private func activityBlock(bundle: DashboardAPI.BuilderBundle) -> some View {
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
            .revealed(vm.hasRevealed, delay: 0.36)
        }
    }

    // MARK: - Suggested feed

    private func suggestedFeedBlock(bundle: DashboardAPI.BuilderBundle) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                sectionLabel("For you")
                if matchDelta > 0 {
                    Text("+\(matchDelta) NEW")
                        .font(.system(size: 9, weight: .black)).tracking(1.0)
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 7).padding(.vertical, 3)
                        .background(Capsule().fill(Palette.accent))
                        .shadow(color: Palette.accentGlow, radius: 6)
                        .transition(.scale(scale: 0.7).combined(with: .opacity))
                }
                Spacer()
                if !bundle.suggested.isEmpty {
                    Text("\(bundle.suggested.count) match\(bundle.suggested.count == 1 ? "" : "es")")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(Palette.textDim)
                }
            }

            if bundle.suggested.isEmpty {
                emptyFeedCard
            } else {
                VStack(spacing: 14) {
                    ForEach(Array(bundle.suggested.enumerated()), id: \.element.id) { idx, project in
                        // NavigationLink routes through MainTabs'
                        // `.navigationDestination(for: String.self)`
                        // handler — pushes ProjectDetailScreen(slug:).
                        // PressButtonStyle gives the scale + haptic
                        // feedback without stealing the tap from the
                        // link (which is what a nested `Press` would
                        // do).
                        NavigationLink(value: project.slug) {
                            ProjectFeedCard(
                                project: project,
                                unlockPriceAud: unlockPrice(for: project.type),
                                fbaActive: isFbaActive
                            )
                        }
                        .buttonStyle(PressButtonStyle())
                        .revealed(vm.hasRevealed, delay: 0.30 + Double(idx) * 0.05)
                        // Subtle scroll-linked transition — as cards
                        // approach the top/bottom edges of the
                        // viewport, they gently fade + scale. Reads as
                        // depth without ever drawing attention.
                        .scrollTransition(
                            .interactive(timingCurve: .easeOut),
                            axis: .vertical
                        ) { content, phase in
                            content
                                .opacity(1 - abs(phase.value) * 0.4)
                                .scaleEffect(
                                    1 - abs(phase.value) * 0.03,
                                    anchor: .center
                                )
                        }
                    }
                }
            }
        }
    }

    private var emptyFeedCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "sparkles.rectangle.stack.fill")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Palette.accentLight)
                .padding(.bottom, 6)
            Text("No matches yet")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text("Owners post projects daily. The moment one matches your service area or category, it'll appear here.")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 8)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 28)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Palette.hairline, lineWidth: 1)
        )
        .revealed(vm.hasRevealed, delay: 0.30)
    }

    // MARK: - Skeleton + error states

    private var skeletonContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            SkeletonView(cornerRadius: 22)
                .frame(height: 180)
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
            VStack(spacing: 14) {
                SkeletonView(cornerRadius: 20).frame(height: 280)
                SkeletonView(cornerRadius: 20).frame(height: 280)
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
            .padding(.top, 4)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 32)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(Palette.warning.opacity(0.25), lineWidth: 1)
        )
    }

    // MARK: - Section label

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(2.4)
            .foregroundStyle(Palette.textDim)
    }

    // MARK: - Unlock pricing (mirrors server's pricing.ts)

    private func unlockPrice(for type: String) -> Int {
        switch type {
        case "renovation":      return 99
        case "extension":       return 149
        case "single_dwelling": return 199
        case "multi_dwelling":  return 249
        default:                return 199
        }
    }

    private var isFbaActive: Bool {
        guard let bundle = vm.bundle else { return false }
        if case .active = bundle.fba { return true }
        return false
    }
}

// MARK: - Cascade reveal modifier

private extension View {
    /// Tiny helper that fades + lifts the view on `revealed == true`.
    /// The delay is staggered per section by the caller so the
    /// cascade plays in order on first paint.
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
