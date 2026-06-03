/// OwnerProjectsScreen — the owner's Projects tab.
///
/// Single-screen view of every project the owner has authored:
/// drafts, published, tendering, completed. Scope pills at the top
/// let them flip between subsets without re-navigating; a debounced
/// search bar narrows by title. A floating "+" CTA at the bottom-
/// right opens the publish wizard.
///
/// Sibling screen to BrowseScreen — same glass header pattern, same
/// scope-pill component (with owner-flavoured labels), same cascade
/// reveal on first paint. Different data + different empty states.

import SwiftUI

struct OwnerProjectsScreen: View {
    @Environment(AuthSession.self) private var session
    @State private var vm = OwnerProjectsViewModel()
    @State private var searchDebounceTask: Task<Void, Never>? = nil
    @State private var showingPublishWizard: Bool = false

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            content

            floatingPublishButton
        }
        .navigationBarHidden(true)
        .task {
            await vm.loadIfNeeded()
        }
        .fullScreenCover(isPresented: $showingPublishWizard) {
            ProjectPublishWizard {
                // On publish: dismiss wizard, refetch the list so a
                // new draft / published project appears at the top.
                showingPublishWizard = false
                Task { await vm.refresh() }
            } onDismiss: {
                showingPublishWizard = false
            }
        }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                heading
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

                Spacer(minLength: 120)
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
        }
    }

    // MARK: - Sticky glass header (search + scope pills)

    private var stickyHeader: some View {
        VStack(spacing: 10) {
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

            OwnerScopeBar(
                scope: Binding(
                    get: { vm.scope },
                    set: { vm.scope = $0 }
                ),
                counts: scopeCounts
            ) { _ in
                searchDebounceTask?.cancel()
                Task { await vm.reload() }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .background(
            ZStack(alignment: .bottom) {
                Rectangle().fill(.ultraThinMaterial)

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
            .ignoresSafeArea(edges: .top)
        )
    }

    private var scopeCounts: [OwnerProjectsViewModel.Scope: Int] {
        Dictionary(
            uniqueKeysWithValues: OwnerProjectsViewModel.Scope.allCases.map {
                ($0, vm.count(for: $0))
            }
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

    // MARK: - Heading

    private var heading: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            (
                Text("Your\n")
                    .font(Typography.ui(size: 32, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("projects.")
                    .font(Typography.serifItalic(size: 32))
                    .foregroundStyle(Palette.accentForTime())
            )
            .tracking(-0.4)
            .lineSpacing(-4)
            Spacer()
        }
        .opacity(vm.hasRevealed ? 1 : 0)
        .offset(y: vm.hasRevealed ? 0 : 12)
        .animation(
            .spring(response: 0.55, dampingFraction: 0.86),
            value: vm.hasRevealed
        )
    }

    // MARK: - Results caption

    @ViewBuilder
    private var resultsCaption: some View {
        if !vm.items.isEmpty {
            HStack {
                Text("\(vm.items.count) \(scopeNoun(for: vm.scope))\(vm.items.count == 1 ? "" : "s")")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
                Spacer()
            }
        }
    }

    private func scopeNoun(for scope: OwnerProjectsViewModel.Scope) -> String {
        switch scope {
        case .all:        return "project"
        case .draft:      return "draft"
        case .published:  return "live project"
        case .tendering:  return "tendering project"
        case .completed:  return "completed project"
        }
    }

    // MARK: - Cards list

    private var cardsList: some View {
        VStack(spacing: 12) {
            ForEach(Array(vm.items.enumerated()), id: \.element.id) { idx, project in
                NavigationLink(value: project.slug) {
                    OwnerProjectCard(project: project)
                }
                .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.99))
                .opacity(vm.hasRevealed ? 1 : 0)
                .offset(y: vm.hasRevealed ? 0 : 16)
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
                        .opacity(1 - abs(phase.value) * 0.35)
                        .scaleEffect(
                            1 - abs(phase.value) * 0.025,
                            anchor: .center
                        )
                }
            }
        }
    }

    // MARK: - Floating publish CTA

    private var floatingPublishButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Press(haptic: .tap) {
                    showingPublishWizard = true
                } content: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                            .font(.system(size: 15, weight: .bold))
                        Text("New project")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 18)
                    .frame(height: 52)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 22, x: 0, y: 10)
                }
                .padding(.trailing, 20)
                .padding(.bottom, 28)
            }
        }
        .allowsHitTesting(true)
    }

    // MARK: - Skeleton + states

    private var skeletonContent: some View {
        VStack(spacing: 12) {
            ForEach(0..<4, id: \.self) { _ in
                SkeletonView(cornerRadius: 18)
                    .frame(height: 96)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
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
                .padding(.horizontal, 16)
            // CTA — for "no projects ever" we drop a publish button
            // straight on the empty card. For scope-narrowed empties
            // (e.g. no drafts), we send them back to All.
            if vm.scope == .all && vm.query.isEmpty {
                Press(haptic: .tap) {
                    showingPublishWizard = true
                } content: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Publish your first project")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 22)
                    .frame(height: 48)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 16, x: 0, y: 6)
                }
                .padding(.top, 4)
            } else if vm.scope != .all {
                Press(haptic: .tap) {
                    vm.scope = .all
                    Task { await vm.reload() }
                } content: {
                    Text("See all projects")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 22)
                        .frame(height: 44)
                        .background(Capsule().fill(Palette.accent))
                        .shadow(color: Palette.accentGlow, radius: 12, x: 0, y: 4)
                }
                .padding(.top, 4)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 36)
        .frame(maxWidth: .infinity)
        .cardSurface(.lifted, radius: 22)
    }

    private var emptyStateIcon: String {
        switch vm.scope {
        case .all:        return "sparkles.rectangle.stack"
        case .draft:      return "tray"
        case .published:  return "checkmark.seal"
        case .tendering:  return "paperplane"
        case .completed:  return "checkmark.circle"
        }
    }

    private var emptyStateTitle: String {
        switch vm.scope {
        case .all:
            return vm.query.isEmpty ? "No projects yet" : "Nothing matches"
        case .draft:      return "No drafts"
        case .published:  return "Nothing live yet"
        case .tendering:  return "No tendering projects"
        case .completed:  return "No completed projects"
        }
    }

    private var emptyStateSubtitle: String {
        switch vm.scope {
        case .all:
            return vm.query.isEmpty
                ? "Publish your first project to start receiving tenders from builders in your area."
                : "Try a different search or scope."
        case .draft:
            return "Drafts you've started but not yet published show here."
        case .published:
            return "Projects appear here once they go live. Add architectural plans to a draft to publish it."
        case .tendering:
            return "Projects collecting builder tenders show here."
        case .completed:
            return "Projects you've marked complete show here."
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't load your projects")
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
}
