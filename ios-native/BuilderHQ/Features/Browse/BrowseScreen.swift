/// BrowseScreen — the marketplace heart. Builders scan published
/// projects matched to their service areas + categories.
///
/// Layout (top-down):
///   1. Liquid-glass header (search bar) — fades in on scroll, same
///      pattern as the Home tab
///   2. Filter chips row — horizontal pill row, sticky-ish via
///      safeAreaInset
///   3. Optional "results" caption ("23 matches in your area")
///   4. Vertically-scrolling list of BrowseProjectCard
///   5. Infinite scroll: when the user nears the bottom, fetch next page
///   6. Pull-to-refresh
///   7. Empty + error states
///
/// Tap a card → push to ProjectDetailScreen via NavigationStack
/// (wired in MainTabs).
///
/// All state lives in BrowseViewModel. Search debounces via a Task
/// that gets cancelled on each keystroke.

import SwiftUI

struct BrowseScreen: View {
    @Environment(AuthSession.self) private var session
    @State private var vm = BrowseViewModel()
    @State private var searchDebounceTask: Task<Void, Never>? = nil

    /// FBA status drives the unlock CTA on each card ("Free with
    /// founding access" vs "Unlock for $X"). Pulled lightly here —
    /// the BrowseViewModel doesn't need the full bundle.
    @State private var fbaActive: Bool = false

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            content
        }
        .navigationBarHidden(true)
        .task {
            await vm.loadIfNeeded()
            await refreshFbaState()
        }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // No standalone heading — the floating search bar in
                // the sticky header IS the call to action (Airbnb /
                // Apple Maps pattern). Removes competing hierarchy
                // and lets the marketplace cards breathe.
                BrowseFilterChips(
                    typeFilter: Binding(
                        get: { vm.typeFilter },
                        set: { newValue in
                            vm.typeFilter = newValue
                            Task { await vm.reload() }
                        }
                    ),
                    serviceAreaOnly: Binding(
                        get: { vm.serviceAreaOnly },
                        set: { newValue in
                            vm.serviceAreaOnly = newValue
                            Task { await vm.reload() }
                        }
                    )
                )
                .padding(.horizontal, -20)
                // Negative horizontal padding so the chip row can
                // bleed to the screen edges while the rest of the
                // content stays inside the 20pt gutter.

                resultsCaption

                if vm.items.isEmpty {
                    switch vm.loadState {
                    case .loading, .initial:
                        skeletonContent
                    case .error(let message):
                        errorState(message: message)
                    default:
                        emptyState
                    }
                } else {
                    cardsList
                }

                Spacer(minLength: 80)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
        }
        .scrollIndicators(.hidden)
        .scrollContentBackground(.hidden)
        .background(Color.clear)
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .top, spacing: 0) {
            stickyHeader
        }
        .refreshable {
            await vm.refresh()
            await refreshFbaState()
        }
    }

    // MARK: - Sticky header (always-on glass plate + floating search)
    //
    // Apple Maps / Airbnb pattern: the header itself is "invisible" —
    // just a frosted plate. The search bar IS the only visible element
    // on it, hovering with its own capsule shape. Cards scrolling
    // underneath get frosted in real time by the GPU material, which
    // reads as quietly premium and never competes with content for
    // hierarchy. Matches `HomeStickyHeader`'s glass treatment so the
    // Home and Projects tabs feel like the same surface.

    private var stickyHeader: some View {
        VStack(spacing: 10) {
            // Row 1: floating search capsule.
            HStack(spacing: 12) {
                BrowseSearchBar(
                    text: Binding(
                        get: { vm.query },
                        set: { newValue in
                            vm.query = newValue
                            scheduleSearchDebounce()
                        }
                    ),
                    onSubmit: {
                        searchDebounceTask?.cancel()
                        Task { await vm.reload() }
                    }
                )
            }
            .padding(.horizontal, 20)
            .padding(.top, 6)

            // Row 2: scope pills (All / Saved / Unlocked). Always
            // visible — they're the primary mode switch for the feed.
            BrowseScopeBar(
                scope: Binding(
                    get: { vm.scope },
                    set: { vm.scope = $0 }
                ),
                onChange: { _ in
                    searchDebounceTask?.cancel()
                    Task { await vm.reload() }
                }
            )
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .background(
            ZStack(alignment: .bottom) {
                // 1. Frosted glass — GPU live blur. Samples every
                //    frame so scrolling cards visibly frost through.
                Rectangle()
                    .fill(.ultraThinMaterial)

                // 2. Faint top-edge gloss — gives the glass thickness
                //    instead of reading as a flat sheet.
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.06),
                        Color.white.opacity(0),
                    ],
                    startPoint: .top,
                    endPoint: .center
                )
                .blendMode(.plusLighter)
                .allowsHitTesting(false)

                // 3. Hair-thin accent highlight along the bottom edge.
                //    Brand teal at low opacity, plusLighter so it
                //    glows on dark and disappears on bright. Reads as
                //    a luminance edge, not a divider line.
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Palette.accent.opacity(0),
                                Palette.accent.opacity(0.18),
                                Palette.accent.opacity(0),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 0.5)
                    .blendMode(.plusLighter)
                    .allowsHitTesting(false)
            }
            // Extend up into the status-bar zone so time / dynamic
            // island / battery sit on the same frosted surface as the
            // search bar — no chrome-on-chrome collision.
            .ignoresSafeArea(edges: .top)
        )
    }

    private func scheduleSearchDebounce() {
        searchDebounceTask?.cancel()
        let task = Task {
            try? await Task.sleep(for: .milliseconds(420))
            if Task.isCancelled { return }
            await vm.reload()
        }
        searchDebounceTask = task
    }

    // MARK: - Results caption

    @ViewBuilder
    private var resultsCaption: some View {
        if !vm.items.isEmpty {
            HStack {
                Text("\(vm.items.count) project\(vm.items.count == 1 ? "" : "s")")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
                Spacer()
                if vm.serviceAreaOnly {
                    Label("In your areas", systemImage: "location.fill")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.8)
                        .foregroundStyle(Palette.accent)
                        .labelStyle(.titleAndIcon)
                }
            }
        }
    }

    // MARK: - Cards list

    private var cardsList: some View {
        VStack(spacing: 14) {
            ForEach(Array(vm.items.enumerated()), id: \.element.id) { idx, project in
                NavigationLink(value: project.slug) {
                    BrowseProjectCard(
                        project: project,
                        fbaActive: fbaActive,
                        onToggleSave: {
                            Task { await vm.toggleSave(for: project) }
                        }
                    )
                }
                .buttonStyle(PressButtonStyle())
                // Stagger cards in on first paint. Cap delay at idx
                // 6 so a tall feed doesn't queue a half-second of
                // reveals — anything beyond the first viewport
                // animates almost simultaneously.
                .opacity(vm.hasRevealed ? 1 : 0)
                .offset(y: vm.hasRevealed ? 0 : 18)
                .animation(
                    .spring(response: 0.55, dampingFraction: 0.86)
                        .delay(min(Double(idx), 6) * 0.05),
                    value: vm.hasRevealed
                )
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
                .onAppear {
                    // Infinite scroll trigger — when the second-last
                    // card enters the viewport, prefetch the next page.
                    if idx >= vm.items.count - 2 && vm.hasMore {
                        Task { await vm.loadMore() }
                    }
                }
            }

            if vm.loadState == .loadingMore {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(Palette.accent)
                    .padding(.vertical, 16)
            }
        }
    }

    // MARK: - Skeleton + states

    private var skeletonContent: some View {
        VStack(spacing: 14) {
            ForEach(0..<3, id: \.self) { _ in
                SkeletonView(cornerRadius: 22)
                    .frame(height: 340)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: emptyStateIcon)
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(Palette.accentLight)
                .padding(.bottom, 4)
            Text(emptyStateTitle)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(emptyStateSubtitle)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
            // Scope-aware CTA — for Saved/Unlocked the natural fix is
            // to switch back to All; for All it's to clear filters.
            if vm.scope != .all {
                Press(haptic: .tap) {
                    vm.scope = .all
                    Task { await vm.reload() }
                } content: {
                    Text("Browse all projects")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 20)
                        .frame(height: 44)
                        .background(Capsule().fill(Palette.accent))
                        .shadow(color: Palette.accentGlow, radius: 12, x: 0, y: 4)
                }
                .padding(.top, 8)
            } else if vm.typeFilter != nil || vm.serviceAreaOnly || !vm.query.isEmpty {
                Press(haptic: .tap) {
                    vm.query = ""
                    vm.typeFilter = nil
                    vm.serviceAreaOnly = false
                    Task { await vm.reload() }
                } content: {
                    Text("Clear filters")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 20)
                        .frame(height: 44)
                        .background(Capsule().fill(Palette.accent))
                        .shadow(color: Palette.accentGlow, radius: 12, x: 0, y: 4)
                }
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 36)
        .frame(maxWidth: .infinity)
        .cardSurface(.lifted, radius: 22)
    }

    private var emptyStateIcon: String {
        switch vm.scope {
        case .all:      return "sparkle.magnifyingglass"
        case .saved:    return "bookmark"
        case .unlocked: return "lock.open"
        }
    }

    private var emptyStateTitle: String {
        switch vm.scope {
        case .all:      return "No projects yet"
        case .saved:    return "Nothing saved"
        case .unlocked: return "Nothing unlocked yet"
        }
    }

    private var emptyStateSubtitle: String {
        switch vm.scope {
        case .all:
            return "Adjust your filters or check back as owners post new projects."
        case .saved:
            return "Tap the heart on any project card to keep it here for later."
        case .unlocked:
            return "Unlocked projects appear here so you can pick up where you left off."
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't load projects")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
            Press(haptic: .tap) {
                Task { await vm.reload() }
            } content: {
                Text("Try again")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 20)
                    .frame(height: 44)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 12, x: 0, y: 4)
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 32)
        .frame(maxWidth: .infinity)
        .cardSurface(.lifted, radius: 22)
    }

    // MARK: - FBA refresh

    private func refreshFbaState() async {
        // Lightweight check: refetch the dashboard bundle just so we
        // know FBA's active state. The Browse screen doesn't have its
        // own endpoint for this — reusing what's there.
        do {
            let bundle = try await DashboardAPI.fetchBuilderBundle()
            if case .active = bundle.fba {
                fbaActive = true
            } else {
                fbaActive = false
            }
        } catch {
            // Non-fatal — default to false (paid path) on failure.
            fbaActive = false
        }
    }
}
