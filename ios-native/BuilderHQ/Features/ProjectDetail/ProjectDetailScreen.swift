/// ProjectDetailScreen — the deep-dive on a single project.
///
/// Renders one of two states based on the tagged-union response:
///   · `.preview`           — builder hasn't unlocked yet. Locked
///                            teasers for docs + owner contact. Sticky
///                            "Unlock" CTA at the bottom.
///   · `.unlockedBuilder`   — full project info, including the exact
///                            street address + downloadable documents
///                            + owner contact card.
///
/// Layout:
///   · Hero — type-coloured gradient at the top, parallax-shrinks as
///     you scroll. Floating Back / Save / Share buttons overlay.
///   · Title block — large title + suburb chip
///   · Key facts row (beds, baths, floors, sizes)
///   · Budget + Timeline cards (side-by-side)
///   · Description (full text or "preview")
///   · MapKit thumbnail (suburb-level only, exact pin hidden if locked)
///   · Documents teaser (count when locked) or list (when unlocked)
///   · Owner contact card (locked placeholder vs real card)
///   · Sticky bottom: Unlock CTA OR "Submit tender" when unlocked
///
/// Successful unlock triggers a refetch which morphs the view from
/// preview → unlocked, complete with a brief celebration overlay.

import SwiftUI
import MapKit

/// Compound value pulled off the ScrollView's geometry every frame —
/// see `onScrollGeometryChange` in `scrollContent(...)`. Must be
/// `Equatable` so SwiftUI can diff and only fire `action` on real
/// change.
private struct ScrollMetrics: Equatable {
    let scrolled: CGFloat
    let remaining: CGFloat
}

struct ProjectDetailScreen: View {
    let slug: String
    @Environment(\.dismiss) private var dismiss
    @State private var vm: ProjectDetailViewModel
    /// Normalized scroll offset: 0 at the very top of the content,
    /// growing positive as the user scrolls down. Drives the hero
    /// parallax (rubber-band on overscroll, fade on scroll-down).
    @State private var scrollOffset: CGFloat = 0
    /// Distance in points from the current scroll position to the
    /// very bottom of the scrollable content. ~0 means "you're at
    /// the bottom"; large numbers mean "lots of page below". Drives
    /// the sticky CTA's progressive disclosure — independent of
    /// total content length so it works for any page.
    ///
    /// Initialized to a large finite sentinel (10,000pt — well above
    /// any realistic page height) so the disclosure starts at 0
    /// before the first scroll-geometry callback fires. Using
    /// `.greatestFiniteMagnitude` blew up `Int(scrollRemaining)` in
    /// the debug pill — that value overflows Int on 32-bit casts.
    @State private var scrollRemaining: CGFloat = 10_000
    @State private var showUnlockCelebration: Bool = false
    /// Presents the tender composer over the detail screen when the
    /// unlocked builder taps "Submit a tender" / "Finish your tender".
    @State private var showingTenderComposer: Bool = false
    /// Presents the owner's tender comparison when they tap "Review
    /// tenders" on their own project.
    @State private var showingTenderReview: Bool = false
    /// Deep-link into the owner conversation when a builder taps "Message owner".
    @State private var chatLink: MessagingAPI.Conversation? = nil
    @State private var openingChat = false
    /// In-app plan viewer for an unlocked builder. We mint the presigned
    /// URL on tap (it's short-lived) rather than carrying it in the payload.
    @State private var docPreview: DocumentPreviewLink? = nil
    @State private var openingDocId: String? = nil

    init(slug: String) {
        self.slug = slug
        _vm = State(initialValue: ProjectDetailViewModel(slug: slug))
    }

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            content

            if showUnlockCelebration {
                unlockCelebration
                    .transition(.opacity)
            }
        }
        .navigationBarHidden(true)
        .task {
            await vm.load()
        }
        .fullScreenCover(isPresented: $showingTenderComposer) {
            TenderComposerScreen(
                slug: slug,
                projectTitle: vm.response.map { projectFields(from: $0).title } ?? "this project",
                onSubmitted: {
                    showingTenderComposer = false
                    // Refetch so myTender flips to the submitted state.
                    Task { await vm.refresh() }
                },
                onClose: { showingTenderComposer = false }
            )
        }
        .fullScreenCover(isPresented: $showingTenderReview) {
            TenderCompareScreen(
                slug: slug,
                projectTitle: vm.response.map { projectFields(from: $0).title } ?? "this project",
                onClose: {
                    showingTenderReview = false
                    // An award/decision may have changed counts/status.
                    Task { await vm.refresh() }
                }
            )
        }
        .fullScreenCover(item: $chatLink) { convo in
            ChatScreen(conversation: convo)
        }
        .sheet(item: $docPreview) { link in
            DocumentPreviewView(link: link)
        }
        .onChange(of: vm.justUnlocked) { _, newValue in
            if newValue {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) {
                    showUnlockCelebration = true
                }
                Task {
                    try? await Task.sleep(for: .milliseconds(2700))
                    withAnimation(.easeOut(duration: 0.4)) {
                        showUnlockCelebration = false
                    }
                    vm.justUnlocked = false
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch vm.loadState {
        case .initial, .loading:
            skeletonContent
        case .error(let message):
            errorState(message: message)
        case .loaded:
            if let response = vm.response {
                loadedContent(response: response)
            }
        }
    }

    // MARK: - Loaded content

    @ViewBuilder
    private func loadedContent(response: ProjectsAPI.ProjectDetailResponse) -> some View {
        if case .owner(let o) = response {
            // Owners get a purpose-built screen (no save/like, with Share
            // + Edit + Review tenders), not the builder marketplace view.
            OwnerProjectDetailView(
                slug: slug,
                owner: o,
                onNeedsRefresh: { Task { await vm.refresh() } }
            )
        } else {
            ZStack(alignment: .bottom) {
                scrollContent(
                    project: projectFields(from: response),
                    response: response,
                    isSaved: vm.isSaved(response)
                )
                stickyUnlockCTA(response: response)
            }
        }
    }

    /// The scroll body — hero + bodyBlock + bottom spacer — wrapped in
    /// a ScrollView with the glass header inset and offset tracking.
    /// Pulled into its own helper so we can branch on iOS version for
    /// the tracking API: iOS 18+ uses `onScrollGeometryChange` (the
    /// only properly reliable tracker on iOS 26 the user is testing
    /// on); iOS 17 falls back to the GeometryReader + PreferenceKey
    /// pattern.
    @ViewBuilder
    private func scrollContent(
        project: ProjectsAPI.DetailProjectFields,
        response: ProjectsAPI.ProjectDetailResponse,
        isSaved: Bool
    ) -> some View {
        if #available(iOS 18.0, *) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    heroBlock(project: project)
                    bodyBlock(response: response)
                }
                Spacer(minLength: 140)
            }
            .scrollIndicators(.hidden)
            .scrollContentBackground(.hidden)
            .background(Color.clear)
            .safeAreaInset(edge: .top, spacing: 0) {
                detailGlassHeader(isSaved: isSaved)
            }
            .refreshable { await vm.refresh() }
            // iOS 18+ canonical scroll tracking. We track two
            // quantities off `ScrollGeometry`:
            //
            //   · `scrolled` — how far down from the top the user is,
            //     normalized so it's 0 at the natural top (we add the
            //     top contentInset because contentOffset.y starts at
            //     -insetTop due to the safeAreaInset glass header).
            //   · `remaining` — distance to the very bottom of the
            //     content. Drives the sticky CTA's "appear near the
            //     bottom" fade independent of page length.
            //
            // Both update on every scroll frame.
            .onScrollGeometryChange(for: ScrollMetrics.self) { geo in
                let scrolled = geo.contentOffset.y + geo.contentInsets.top
                let totalScrollable = max(
                    0,
                    geo.contentSize.height
                        - geo.containerSize.height
                        + geo.contentInsets.top
                        + geo.contentInsets.bottom
                )
                let remaining = max(0, totalScrollable - scrolled)
                return ScrollMetrics(scrolled: scrolled, remaining: remaining)
            } action: { _, newValue in
                scrollOffset = newValue.scrolled
                scrollRemaining = newValue.remaining
            }
        } else {
            // iOS 17 fallback — GeometryReader + PreferenceKey. This
            // path is brittle on newer iOS but works on iOS 17 where
            // `onScrollGeometryChange` doesn't exist yet.
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    heroBlock(project: project)
                    bodyBlock(response: response)
                }
                .background(
                    GeometryReader { proxy in
                        Color.clear
                            .preference(
                                key: ScrollOffsetKey.self,
                                value: -proxy.frame(in: .scrollView).minY
                            )
                    }
                )
                Spacer(minLength: 140)
            }
            .scrollIndicators(.hidden)
            .scrollContentBackground(.hidden)
            .background(Color.clear)
            .safeAreaInset(edge: .top, spacing: 0) {
                detailGlassHeader(isSaved: isSaved)
            }
            .refreshable { await vm.refresh() }
            .onPreferenceChange(ScrollOffsetKey.self) { offset in
                scrollOffset = offset
            }
        }
    }

    // MARK: - Detail glass header (invisible — pure blur + buttons)

    private func detailGlassHeader(isSaved: Bool) -> some View {
        HStack {
            Press(haptic: .tap) {
                dismiss()
            } content: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Palette.text)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(Palette.surface.opacity(0.55)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }

            Spacer()

            HStack(spacing: 10) {
                Press(haptic: .tap) {
                    Task { await vm.toggleSave() }
                } content: {
                    Image(systemName: isSaved ? "heart.fill" : "heart")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(isSaved ? Palette.danger : Palette.text)
                        .frame(width: 38, height: 38)
                        .background(Circle().fill(Palette.surface.opacity(0.55)))
                        .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
                        .symbolEffect(.bounce, value: isSaved)
                }

                Press(haptic: .tap) {
                    // Share sheet — lands week 5
                } content: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .frame(width: 38, height: 38)
                        .background(Circle().fill(Palette.surface.opacity(0.55)))
                        .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
        .padding(.bottom, 10)
        .background(
            ZStack(alignment: .bottom) {
                // 1. Frosted glass plate — GPU live blur. Whatever
                //    sits behind it (hero gradient, scrolled cards)
                //    gets sampled and frosted every frame.
                Rectangle()
                    .fill(.ultraThinMaterial)

                // 2. Faint top-edge gloss — sells the plate as having
                //    physical thickness without ever reading as chrome.
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
            // Stretch up through the safe area so status bar + dynamic
            // island sit on the same frosted surface.
            .ignoresSafeArea(edges: .top)
        )
    }

    // MARK: - Hero block (parallax)
    //
    // Visual backdrop (gradient + grid + watermark) is moved into a
    // `.background(...)` modifier with `.ignoresSafeArea(edges: .top)`
    // so it paints all the way up under the glass header — no cutoff.
    // The foreground content (chip / title / location) stays inside the
    // hero's intrinsic frame so it sits well below the floating
    // buttons. The glass header blurs the backdrop in real time
    // wherever they overlap.

    private func heroBlock(project: ProjectsAPI.DetailProjectFields) -> some View {
        // Bulletproof 380pt hero: a sized Color.clear acts as the
        // dimensional anchor (full-width, fixed height — cannot be
        // misinterpreted by parent layout), the gradient backdrop
        // paints behind it, and the title/chip/location ride on top
        // via an `.overlay(alignment: .bottomLeading)`.
        //
        // This pattern is more reliable than nested `.frame()` calls
        // on a ZStack because the ScrollView (especially on iOS 26)
        // sometimes lets a frame-with-explicit-height-and-no-clip-
        // anchor flex vertically when its content + background have
        // different intrinsic heights. The Color.clear anchor pins
        // the size deterministically.
        let heroHeight: CGFloat = 380

        return Color.clear
            .frame(maxWidth: .infinity)
            .frame(height: heroHeight)
            .background(heroBackdrop(project: project))
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        typeChip(for: project.type)
                        freshnessTag(publishedAt: project.publishedAtIso)
                    }

                    Text(project.title)
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .tracking(-0.5)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)

                    if let location = locationLabel(project: project) {
                        HStack(spacing: 5) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Palette.accent)
                            Text(location)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Palette.text.opacity(0.92))
                        }
                    }
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 28)
            }
            .clipped()
            // Parallax: as user scrolls down, the hero stretches with
            // the scroll (rubber-band effect) while content fades.
            .scaleEffect(
                x: 1 + max(0, -scrollOffset / 600),
                y: 1 + max(0, -scrollOffset / 600),
                anchor: .top
            )
            .opacity(1 - min(max(scrollOffset / 400, 0), 0.4))
    }

    /// The full visual backdrop for the hero: gradient + grid pattern
    /// + watermark icon. Lives as a separate view so it can be applied
    /// as a `.background()` with `.ignoresSafeArea(.top)` and extend
    /// cleanly under the glass header.
    private func heroBackdrop(project: ProjectsAPI.DetailProjectFields) -> some View {
        ProjectCoverArt(type: project.type, cornerTicks: true, scrim: true)
    }

    // MARK: - Body (everything below the hero)

    private func bodyBlock(response: ProjectsAPI.ProjectDetailResponse) -> some View {
        let project = projectFields(from: response)

        return VStack(alignment: .leading, spacing: 28) {
            insightsStrip(response: response)
            keyFactsRow(project: project)
            budgetTimelineRow(project: project)
            descriptionBlock(project: project)
            mapBlock(project: project, unlocked: isUnlocked(response))
            documentsBlock(response: response)
            ownerBlock(response: response)
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    // MARK: - Insights strip (three premium tiles)
    //
    // Equal-width tiles with a deep canvas-toned gradient and a
    // hairline accent border (no flat surface fill). Each tile leads
    // with an animated icon — pulsing for "live today", subtle scarcity
    // pulse for low slots, sparkle ping for unlocked. Compact value-
    // first treatment: tight label + tiny eyebrow underneath.

    @ViewBuilder
    private func insightsStrip(response: ProjectsAPI.ProjectDetailResponse) -> some View {
        let chips = insightChips(for: response)
        if !chips.isEmpty {
            HStack(spacing: 8) {
                ForEach(Array(chips.enumerated()), id: \.offset) { _, chip in
                    InsightTile(chip: chip)
                        .frame(maxWidth: .infinity)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    fileprivate struct InsightChipData {
        let icon: String
        let value: String
        let eyebrow: String
        let tone: Tone
        let pulse: Bool

        enum Tone {
            case accent
            case warm
            case neutral
        }

        var toneColor: Color {
            switch tone {
            case .accent:  return Palette.accent
            case .warm:    return Palette.warning
            case .neutral: return Palette.text
            }
        }
    }

    private func insightChips(
        for response: ProjectsAPI.ProjectDetailResponse
    ) -> [InsightChipData] {
        let project = projectFields(from: response)
        var chips: [InsightChipData] = []

        // 1. SLOTS — tight value ("2 / 3"), eyebrow ("SLOTS LEFT").
        //    Tone shifts to warm once 2/3 capacity is hit so scarcity
        //    reads at a glance; full slots is a hard warm with a
        //    locked icon.
        let unlockedCount: Int
        let cap: Int
        switch response {
        case .preview(let p):
            unlockedCount = p.unlockedCount
            cap = p.unlock.unlockCap
        case .unlockedBuilder(let u):
            unlockedCount = u.unlockedCount
            cap = 3
        case .owner:
            unlockedCount = 0
            cap = 3
        }
        let remaining = max(0, cap - unlockedCount)
        let slotsTone: InsightChipData.Tone =
            remaining == 0 ? .warm :
            (Double(unlockedCount) / Double(max(cap, 1)) >= 0.66 ? .warm : .accent)
        chips.append(
            .init(
                icon: remaining == 0 ? "lock.fill" : "lock.open.fill",
                value: remaining == 0 ? "Full" : "\(remaining) / \(cap)",
                eyebrow: remaining == 0 ? "TENDER SLOTS" : "SLOTS LEFT",
                tone: slotsTone,
                pulse: slotsTone == .warm
            )
        )

        // 2. FRESHNESS — single short value ("Today", "3d", "2w").
        //    Pulse the bolt icon for projects posted today to draw the
        //    eye to genuinely fresh inventory.
        if let published = project.publishedAtIso.flatMap(parseISO) {
            let elapsed = Date().timeIntervalSince(published)
            let days = Int(elapsed / 86_400)
            let value: String
            if days <= 0 {
                value = "Today"
            } else if days < 7 {
                value = "\(days)d"
            } else if days < 30 {
                value = "\(days / 7)w"
            } else {
                value = "\(days / 30)mo"
            }
            chips.append(
                .init(
                    icon: "bolt.fill",
                    value: value,
                    eyebrow: "LIVE",
                    tone: .accent,
                    pulse: days <= 0
                )
            )
        }

        // 3. ACCESS — preview vs unlocked. Doc count when unlocked.
        switch response {
        case .preview:
            chips.append(
                .init(
                    icon: "eye.fill",
                    value: "Preview",
                    eyebrow: "ACCESS",
                    tone: .neutral,
                    pulse: false
                )
            )
        case .unlockedBuilder(let u):
            let docCount = u.documents.count
            chips.append(
                .init(
                    icon: "checkmark.seal.fill",
                    value: docCount > 0 ? "\(docCount) docs" : "Unlocked",
                    eyebrow: "FULL ACCESS",
                    tone: .accent,
                    pulse: true
                )
            )
        case .owner:
            break
        }

        return chips
    }

    /// One insight tile. Pulled out into its own View so each tile can
    /// own a private @State for its pulse animation.
    fileprivate struct InsightTile: View {
        let chip: ProjectDetailScreen.InsightChipData
        @State private var pulse: Bool = false

        var body: some View {
            VStack(spacing: 5) {
                ZStack {
                    Circle()
                        .fill(chip.toneColor.opacity(0.16))
                        .frame(width: 30, height: 30)
                        .scaleEffect(chip.pulse && pulse ? 1.18 : 1.0)
                        .opacity(chip.pulse && pulse ? 0.4 : 0.85)
                        .animation(
                            chip.pulse
                                ? .easeInOut(duration: 1.4)
                                    .repeatForever(autoreverses: true)
                                : .default,
                            value: pulse
                        )

                    Image(systemName: chip.icon)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(chip.toneColor)
                        .symbolEffect(
                            .pulse,
                            options: chip.pulse ? .repeating : .nonRepeating,
                            value: pulse
                        )
                }

                Text(chip.value)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .monospacedDigit()

                Text(chip.eyebrow)
                    .font(.system(size: 9, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 13)
            .frame(maxWidth: .infinity)
            .background(
                // Deep canvas-toned gradient — no flat fill. Subtle
                // top-to-bottom shift gives the tile a "carved" feel
                // instead of looking like a label sticker.
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Palette.canvas.opacity(0.95),
                                Palette.canvas.opacity(0.4),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            )
            .overlay(
                // Hairline border with a faint tone wash so the active
                // tile has a hint of its semantic colour without ever
                // looking like a coloured button.
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [
                                chip.toneColor.opacity(0.32),
                                Palette.hairline.opacity(0.6),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(
                color: chip.tone == .warm
                    ? chip.toneColor.opacity(0.35)
                    : .clear,
                radius: 12
            )
            .onAppear { pulse = true }
        }
    }

    // MARK: - Key facts (horizontally-scrolling stat chips)

    @ViewBuilder
    private func keyFactsRow(project: ProjectsAPI.DetailProjectFields) -> some View {
        let facts = keyFacts(for: project)
        if !facts.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                sectionLabel("At a glance")
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(facts, id: \.label) { fact in
                            factTile(icon: fact.icon, label: fact.label, value: fact.value)
                        }
                    }
                }
                .scrollIndicators(.hidden)
            }
        }
    }

    private func factTile(icon: String, label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Palette.accent)
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(Palette.text)
                .monospacedDigit()
            Text(label.uppercased())
                .font(.system(size: 9, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.textDim)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(minWidth: 88, alignment: .leading)
        .cardSurface(.flat, radius: 14)
    }

    // MARK: - Budget + Timeline

    private func budgetTimelineRow(project: ProjectsAPI.DetailProjectFields) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Budget + timeline")
            HStack(spacing: 12) {
                budgetTile(band: project.budgetBand)
                timelineTile(
                    start: project.targetStartMonth,
                    end: project.targetCompletionMonth
                )
            }
        }
    }

    private func budgetTile(band: String?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "banknote")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                Text("BUDGET")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
            }
            Text(budgetLabel(band) ?? "Not specified")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.text)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(.flat, radius: 16)
    }

    private func timelineTile(start: String?, end: String?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "calendar")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                Text("TIMELINE")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
            }
            VStack(alignment: .leading, spacing: 1) {
                if let start = start {
                    Text("Start \(prettyMonth(start))")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.text)
                }
                if let end = end {
                    Text("End \(prettyMonth(end))")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                }
                if start == nil && end == nil {
                    Text("Flexible")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(.flat, radius: 16)
    }

    // MARK: - Description

    @ViewBuilder
    private func descriptionBlock(project: ProjectsAPI.DetailProjectFields) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Scope")
            if let description = project.description?.trimmingCharacters(
                in: .whitespacesAndNewlines
            ), !description.isEmpty {
                Text(description)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cardSurface(.flat, radius: 16)
            } else {
                Text("Owner hasn't added a description yet.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 2)
            }
        }
    }

    // MARK: - Map

    private func mapBlock(
        project: ProjectsAPI.DetailProjectFields,
        unlocked: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                sectionLabel("Location")
                Spacer()
                if !unlocked {
                    HStack(spacing: 4) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 10, weight: .bold))
                        Text("Suburb only")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(0.8)
                    }
                    .foregroundStyle(Palette.textDim)
                } else {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 10, weight: .bold))
                        Text("Full address")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(0.8)
                    }
                    .foregroundStyle(Palette.accent)
                }
            }

            mapPreview(project: project, unlocked: unlocked)

            // Real street address only surfaces post-unlock. Sits below
            // the map as a copy-target row.
            if unlocked, let address = project.addressLine1?
                .trimmingCharacters(in: .whitespacesAndNewlines),
               !address.isEmpty {
                addressRow(address: address, suburbLine: locationLabel(project: project))
            }
        }
    }

    private func addressRow(address: String, suburbLine: String?) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Palette.accentMuted)
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.accent)
            }
            .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(address)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(2)
                if let suburbLine = suburbLine {
                    Text(suburbLine)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                }
            }

            Spacer()

            Image(systemName: "arrow.up.right.square.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.accentLight)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .cardSurface(.flat, radius: 14)
    }

    @ViewBuilder
    private func mapPreview(
        project: ProjectsAPI.DetailProjectFields,
        unlocked: Bool
    ) -> some View {
        let region = mapRegion(for: project)
        Map(initialPosition: .region(region)) {
            if let coord = mapCenter(for: project) {
                Annotation("", coordinate: coord) {
                    ZStack {
                        Circle()
                            .fill(Palette.accent.opacity(0.22))
                            .frame(width: 60, height: 60)
                        Circle()
                            .fill(Palette.accent)
                            .frame(width: 14, height: 14)
                            .shadow(color: Palette.accentGlow, radius: 8)
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Palette.cardBorder, lineWidth: 1)
        )
        .overlay(alignment: .bottomLeading) {
            if let location = locationLabel(project: project) {
                Text(location)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Capsule().fill(.black.opacity(0.55)))
                    .padding(12)
            }
        }
    }

    private func mapCenter(
        for project: ProjectsAPI.DetailProjectFields
    ) -> CLLocationCoordinate2D? {
        // Crude suburb → coords approximation: Australian state
        // centres + small offset. Good enough for a privacy-respecting
        // thumbnail. Real geocoding will land with the Project Detail
        // upgrade in week 5.
        switch project.state {
        case "VIC": return .init(latitude: -37.81, longitude: 144.96)
        case "NSW": return .init(latitude: -33.87, longitude: 151.21)
        case "QLD": return .init(latitude: -27.47, longitude: 153.03)
        case "WA":  return .init(latitude: -31.95, longitude: 115.86)
        case "SA":  return .init(latitude: -34.93, longitude: 138.60)
        case "TAS": return .init(latitude: -42.88, longitude: 147.33)
        case "ACT": return .init(latitude: -35.28, longitude: 149.13)
        case "NT":  return .init(latitude: -12.46, longitude: 130.84)
        default:    return nil
        }
    }

    private func mapRegion(
        for project: ProjectsAPI.DetailProjectFields
    ) -> MKCoordinateRegion {
        let center = mapCenter(for: project) ?? .init(
            latitude: -25.27,
            longitude: 133.78
        )
        return MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(latitudeDelta: 0.18, longitudeDelta: 0.18)
        )
    }

    // MARK: - Documents

    @ViewBuilder
    private func documentsBlock(response: ProjectsAPI.ProjectDetailResponse) -> some View {
        switch response {
        case .preview(let p):
            documentsLocked(count: p.documentCount)
        case .unlockedBuilder(let u):
            documentsUnlocked(docs: u.documents)
        case .owner:
            EmptyView()
        }
    }

    private func documentsLocked(count: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Documents")
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Palette.accentMuted)
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }
                .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(count) document\(count == 1 ? "" : "s")")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    Text("Architectural plans + supporting docs unlock with the project.")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                Image(systemName: "lock.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .cardSurface(.flat, radius: 16)
        }
    }

    private func documentsUnlocked(docs: [ProjectsAPI.DocumentRow]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Documents")
            if docs.isEmpty {
                Text("Owner hasn't uploaded documents yet.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 2)
            } else {
                VStack(spacing: 8) {
                    ForEach(docs) { doc in
                        documentRow(doc)
                    }
                }
            }
        }
    }

    private func documentRow(_ doc: ProjectsAPI.DocumentRow) -> some View {
        Press(haptic: .tap) { openDocument(doc) } content: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Palette.accentMuted)
                    Image(systemName: docIcon(for: doc.category))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }
                .frame(width: 40, height: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(doc.filename)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    Text("\(doc.category.uppercased()) · \(prettyBytes(doc.sizeBytes))")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                }

                Spacer()

                if openingDocId == doc.id {
                    ProgressView().controlSize(.small).tint(Palette.accent)
                } else {
                    Image(systemName: "eye.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.accentLight)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .cardSurface(.flat, radius: 14)
        }
        .disabled(openingDocId != nil)
    }

    /// Mint a fresh presigned URL for this plan and hand it to the
    /// in-app viewer. The server re-checks the unlock on every request.
    private func openDocument(_ doc: ProjectsAPI.DocumentRow) {
        guard openingDocId == nil else { return }
        openingDocId = doc.id
        Task {
            defer { openingDocId = nil }
            do {
                let res = try await ProjectsAPI.downloadDocument(documentId: doc.id)
                if let url = URL(string: res.url) {
                    docPreview = DocumentPreviewLink(url: url, filename: res.filename)
                }
            } catch {
                // Silent — the row simply doesn't open. A toast layer
                // could surface this, but unlocked builders rarely hit it.
            }
        }
    }

    private func docIcon(for category: String) -> String {
        switch category {
        case "architectural", "plans": return "ruler.fill"
        case "engineering": return "compass.drawing"
        case "permit", "council": return "checkmark.seal.fill"
        case "photo", "image": return "photo.fill"
        default: return "doc.text.fill"
        }
    }

    private func prettyBytes(_ n: Int) -> String {
        let kb = Double(n) / 1024
        if kb < 1024 { return String(format: "%.0f KB", kb) }
        return String(format: "%.1f MB", kb / 1024)
    }

    // MARK: - Owner card

    @ViewBuilder
    private func ownerBlock(response: ProjectsAPI.ProjectDetailResponse) -> some View {
        switch response {
        case .preview:
            ownerLockedCard
        case .unlockedBuilder(let u):
            ownerUnlockedCard(owner: u.owner)
        case .owner:
            EmptyView()
        }
    }

    private var ownerLockedCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("Owner")
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Palette.surfaceElev)
                    Image(systemName: "person.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Palette.textDim)
                }
                .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 5) {
                        Rectangle()
                            .fill(Palette.surfaceElev)
                            .frame(width: 120, height: 12)
                            .clipShape(Capsule())
                    }
                    Text("Contact details unlock with the project")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                }

                Spacer()

                Image(systemName: "lock.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .cardSurface(.flat, radius: 16)
        }
    }

    private func ownerUnlockedCard(
        owner: ProjectsAPI.ProjectDetailResponse.OwnerCard
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("Owner")
            HStack(spacing: 14) {
                // Initials medallion — branded, not photo. Owners are
                // private by default; a photo would feel like a privacy
                // violation. Initials on accent backdrop reads as
                // "verified person" without putting their face in the
                // app.
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Palette.accent.opacity(0.42),
                                    Palette.accent.opacity(0.18),
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            Circle().stroke(Palette.accent.opacity(0.35), lineWidth: 1)
                        )
                        .shadow(color: Palette.accentGlow.opacity(0.5), radius: 8)
                    Text(initials(for: owner.name))
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.text)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(owner.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Palette.text)
                            .lineLimit(1)
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Palette.accent)
                    }
                    Text(ownerSubtitle(owner: owner))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                        .lineLimit(1)
                }

                Spacer()
            }

            // Message owner — find-or-create the conversation, then open it.
            Press(haptic: .tap) {
                guard !openingChat else { return }
                openingChat = true
                Task {
                    defer { openingChat = false }
                    if let convo = try? await MessagingAPI.startConversation(projectSlug: slug) {
                        chatLink = convo
                    }
                }
            } content: {
                HStack(spacing: 8) {
                    Image(systemName: "message.fill")
                        .font(.system(size: 13, weight: .bold))
                    Text("Message owner")
                        .font(.system(size: 14, weight: .bold))
                    Spacer()
                    if openingChat {
                        ProgressView().controlSize(.small).tint(Palette.textMuted)
                    } else {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 12, weight: .bold))
                    }
                }
                .foregroundStyle(Palette.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Palette.surfaceElev)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Palette.hairline, lineWidth: 1)
                )
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .cardSurface(.flat, radius: 16)
    }

    private func initials(for name: String) -> String {
        let parts = name
            .split(separator: " ", omittingEmptySubsequences: true)
            .prefix(2)
        let chars = parts.compactMap { $0.first.map(String.init) }
        let combined = chars.joined().uppercased()
        return combined.isEmpty ? "?" : combined
    }

    private func ownerSubtitle(
        owner: ProjectsAPI.ProjectDetailResponse.OwnerCard
    ) -> String {
        var bits: [String] = []
        if let joined = parseISO(owner.joinedAtIso) {
            bits.append("On BuilderHQ since \(yearLabel(joined))")
        }
        let count = owner.publishedProjectCount
        if count > 0 {
            bits.append(
                "\(count) project\(count == 1 ? "" : "s") posted"
            )
        }
        return bits.joined(separator: " · ")
    }

    private func parseISO(_ s: String) -> Date? {
        let withFrac = ISO8601DateFormatter()
        withFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withFrac.date(from: s) { return d }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: s)
    }

    private func yearLabel(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy"
        return f.string(from: date)
    }

    // (Floating actions were folded into the sticky glass header at
    //  the top of the screen — see `detailGlassHeader(isSaved:)`.)

    // MARK: - Sticky unlock CTA

    @ViewBuilder
    private func stickyUnlockCTA(response: ProjectsAPI.ProjectDetailResponse) -> some View {
        switch response {
        case .preview(let p):
            stickyPreviewCTA(unlock: p.unlock)
        case .unlockedBuilder(let u):
            stickyUnlockedCTA(myTender: u.myTender)
        case .owner(let o):
            if o.stats.tenderCount > 0 {
                ownerReviewCTA(count: o.stats.tenderCount)
            } else {
                EmptyView()
            }
        }
    }

    /// Owner's sticky "Review N tenders" CTA — the gateway into the
    /// comparison experience. Only shown when at least one tender exists.
    private func ownerReviewCTA(count: Int) -> some View {
        Press(haptic: .tap) {
            showingTenderReview = true
        } content: {
            HStack(spacing: 10) {
                Image(systemName: "rectangle.stack.badge.person.crop.fill")
                    .font(.system(size: 15, weight: .bold))
                VStack(alignment: .leading, spacing: 1) {
                    Text("Review \(count) tender\(count == 1 ? "" : "s")")
                        .font(.system(size: 16, weight: .bold))
                    Text("Compare quotes side by side")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.accentContrast.opacity(0.8))
                }
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(Palette.accentContrast)
            .padding(.horizontal, 20)
            .frame(height: 58)
            .frame(maxWidth: .infinity)
            .background(Capsule().fill(Palette.accent))
            .shadow(color: Palette.accentGlow, radius: 22, x: 0, y: 10)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private func stickyPreviewCTA(unlock: ProjectsAPI.UnlockAffordance) -> some View {
        // Progressive disclosure based on distance-to-bottom, not
        // absolute scroll position. The slots + slashed-price row
        // sits hidden while there's still substantial page below the
        // viewport, and fades in as the builder approaches the
        // bottom — where the unlock decision becomes imminent.
        //
        // Bottom-relative metric, so this works on any page length.
        // Fade band tuned a touch earlier than before so the row is
        // already fully visible before the eye reaches the button:
        //
        //   remaining ≥ 500pt → disclosure 0 (hidden)
        //   remaining ≤ 200pt → disclosure 1 (fully visible)
        //   in between        → linear fade
        let revealRemainingMax: CGFloat = 500
        let revealRemainingMin: CGFloat = 200
        let disclosure = max(
            0,
            min(
                (revealRemainingMax - scrollRemaining)
                    / (revealRemainingMax - revealRemainingMin),
                1
            )
        )

        return VStack(spacing: 10) {
            if let err = vm.unlockError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(Palette.danger)
                    Text(err)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.text)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: 10).fill(Palette.dangerMuted))
            }

            // Slots strip + slashed price. Always allocated in the
            // layout (so the button position is stable) but rendered
            // with opacity + a soft rise so the appearance is purely
            // visual — no jumpy layout shifts.
            HStack(alignment: .center, spacing: 0) {
                HStack(spacing: 5) {
                    Image(systemName: lockIcon(for: unlock.pricing))
                        .font(.system(size: 11, weight: .bold))
                    Text(slotsLabel(unlock))
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.4)
                }
                .foregroundStyle(Palette.textDim)

                Spacer()

                if showsSlashedPrice(for: unlock.pricing) {
                    HStack(spacing: 5) {
                        Text("USUALLY")
                            .font(.system(size: 9, weight: .bold))
                            .tracking(1.6)
                            .foregroundStyle(Palette.textDim)
                        Text("$\(unlock.basePriceAud)")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(Palette.textMuted)
                            .strikethrough(true, color: Palette.danger.opacity(0.85))
                            .monospacedDigit()
                    }
                }
            }
            .padding(.horizontal, 6)
            // Opacity follows disclosure exactly. Offset is a small
            // upward rise (max 8pt) so it feels like it's surfacing
            // into view rather than flashing on.
            .opacity(disclosure)
            .offset(y: (1 - disclosure) * 8)

            Button {
                Task { await vm.unlock() }
            } label: {
                ZStack {
                    Capsule()
                        .fill(unlockButtonFill(for: unlock))
                        .shadow(
                            color: unlock.canUnlock ? Palette.accentGlow : .clear,
                            radius: 22,
                            x: 0,
                            y: 10
                        )
                    if vm.isUnlocking {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(Palette.accentContrast)
                    } else {
                        HStack(spacing: 8) {
                            Image(systemName: unlockButtonIcon(for: unlock.pricing))
                                .font(.system(size: 15, weight: .bold))
                            Text(unlockButtonLabel(unlock: unlock))
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundStyle(
                            unlock.canUnlock ? Palette.accentContrast : Palette.textDim
                        )
                    }
                }
                .frame(height: 56)
                .frame(maxWidth: .infinity)
            }
            .disabled(!unlock.canUnlock || vm.isUnlocking)
            .sensoryFeedback(.impact(weight: .medium), trigger: vm.isUnlocking)

            // "You save $X" line — only when FBA covers it. Small,
            // accent-tinted, sits as a mini-trailer below the button.
            if case .free = unlock.pricing {
                HStack(spacing: 5) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 10, weight: .bold))
                    Text("You save $\(unlock.basePriceAud) with founding access")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.3)
                }
                .foregroundStyle(Palette.accent)
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
        .padding(.top, 14)
        .background(
            LinearGradient(
                colors: [Palette.canvas.opacity(0), Palette.canvas.opacity(0.94)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }

    /// Only slash the price when an FBA grant is covering it. Paid
    /// projects show the price normally on the button; unavailable
    /// projects hide the price entirely.
    private func showsSlashedPrice(for pricing: ProjectsAPI.UnlockPricing) -> Bool {
        if case .free = pricing { return true }
        return false
    }

    /// Use an accent gradient when free (festive — celebrates the
    /// savings) and a flat accent otherwise. Disabled state stays
    /// surface-toned.
    private func unlockButtonFill(
        for unlock: ProjectsAPI.UnlockAffordance
    ) -> AnyShapeStyle {
        guard unlock.canUnlock else {
            return AnyShapeStyle(Palette.surfaceElev)
        }
        if case .free = unlock.pricing {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [Palette.accentLight, Palette.accent],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
        return AnyShapeStyle(Palette.accent)
    }

    @ViewBuilder
    private func stickyUnlockedCTA(myTender: ProjectsAPI.TenderSnapshot?) -> some View {
        // Branch on the builder's tender state:
        //   · none / draft     → an action button that opens the composer
        //   · submitted+        → a status card (no button) reflecting
        //                         where the bid stands with the owner
        let status = myTender?.status
        let isActionable = status == nil || status == "draft"

        VStack(spacing: 0) {
            if isActionable {
                Button {
                    showingTenderComposer = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 15, weight: .bold))
                        Text(status == "draft" ? "Finish your tender" : "Submit a tender")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .frame(height: 56)
                    .frame(maxWidth: .infinity)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 22, x: 0, y: 10)
                }
                .sensoryFeedback(.impact(weight: .light), trigger: showingTenderComposer)
            } else {
                tenderStatusCard(myTender: myTender)
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
        .padding(.top, 14)
        .background(
            LinearGradient(
                colors: [Palette.canvas.opacity(0), Palette.canvas.opacity(0.94)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }

    /// Status card shown once a tender is submitted — tells the builder
    /// exactly where their bid stands, with the price + duration they
    /// quoted as a reminder.
    private func tenderStatusCard(myTender: ProjectsAPI.TenderSnapshot?) -> some View {
        let meta = tenderStatusMeta(myTender?.status)
        return HStack(spacing: 12) {
            ZStack {
                Circle().fill(meta.tone.opacity(0.16))
                Image(systemName: meta.icon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(meta.tone)
            }
            .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(meta.title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Palette.text)
                Text(tenderQuoteSummary(myTender) ?? meta.subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textDim)
                    .lineLimit(1)
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(meta.tone.opacity(0.4), lineWidth: 1)
        )
        .shadow(color: meta.tone.opacity(0.25), radius: 14)
    }

    private struct TenderStatusMeta {
        let icon: String
        let title: String
        let subtitle: String
        let tone: Color
    }

    private func tenderStatusMeta(_ status: String?) -> TenderStatusMeta {
        switch status {
        case "submitted":
            return .init(
                icon: "paperplane.fill",
                title: "Tender submitted",
                subtitle: "Awaiting the owner's review.",
                tone: Palette.accent
            )
        case "shortlisted":
            return .init(
                icon: "star.fill",
                title: "Shortlisted",
                subtitle: "The owner shortlisted your bid.",
                tone: Palette.accent
            )
        case "awarded":
            return .init(
                icon: "trophy.fill",
                title: "Awarded — you won this build",
                subtitle: "The owner awarded you the project.",
                tone: Palette.success
            )
        case "rejected":
            return .init(
                icon: "xmark.circle.fill",
                title: "Not selected",
                subtitle: "The owner went another way this time.",
                tone: Palette.textDim
            )
        case "withdrawn":
            return .init(
                icon: "arrow.uturn.backward",
                title: "Tender withdrawn",
                subtitle: "You withdrew this bid.",
                tone: Palette.textDim
            )
        default:
            return .init(
                icon: "paperplane.fill",
                title: "Tender submitted",
                subtitle: "Awaiting the owner's review.",
                tone: Palette.accent
            )
        }
    }

    /// "$420,000 · 24 weeks" reminder line from the snapshot, when both
    /// values are present.
    private func tenderQuoteSummary(_ t: ProjectsAPI.TenderSnapshot?) -> String? {
        guard let t = t else { return nil }
        var parts: [String] = []
        if let price = t.totalPriceAud {
            let fmt = NumberFormatter()
            fmt.numberStyle = .decimal
            fmt.maximumFractionDigits = 0
            let grouped = fmt.string(from: NSNumber(value: price)) ?? "\(price)"
            parts.append("$\(grouped)")
        }
        if let weeks = t.durationWeeks {
            parts.append("\(weeks) week\(weeks == 1 ? "" : "s")")
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private func unlockButtonLabel(unlock: ProjectsAPI.UnlockAffordance) -> String {
        if !unlock.canUnlock {
            return slotsFullLabel(unlock)
        }
        switch unlock.pricing {
        case .free: return "Unlock — free with founding access"
        case .paid(let priceAud): return "Unlock for $\(priceAud)"
        case .unavailable: return "Unavailable"
        }
    }

    private func slotsFullLabel(_ unlock: ProjectsAPI.UnlockAffordance) -> String {
        unlock.slotsRemaining == 0 ? "All \(unlock.unlockCap) slots taken" : "Unavailable"
    }

    private func slotsLabel(_ unlock: ProjectsAPI.UnlockAffordance) -> String {
        if unlock.slotsRemaining == 0 {
            return "All \(unlock.unlockCap) tender slots taken"
        }
        return "\(unlock.slotsRemaining) of \(unlock.unlockCap) tender slots left"
    }

    private func lockIcon(for pricing: ProjectsAPI.UnlockPricing) -> String {
        switch pricing {
        case .free: return "sparkles"
        case .paid: return "lock.fill"
        case .unavailable: return "exclamationmark.triangle.fill"
        }
    }

    private func unlockButtonIcon(for pricing: ProjectsAPI.UnlockPricing) -> String {
        switch pricing {
        case .free: return "sparkles"
        case .paid: return "lock.open.fill"
        case .unavailable: return "exclamationmark.triangle.fill"
        }
    }

    // MARK: - Unlock celebration overlay
    //
    // Multi-ring lock medallion with a slow outward pulse + symbol
    // bounce. Sits on a darkened glass plate so the user's eye is
    // pulled to it without the rest of the screen feeling hidden.
    // Stays visible for ~2.2s (set by the parent's onChange handler).

    private var unlockCelebration: some View {
        CelebrationScene(
            symbol: "lock.open.fill",
            tone: .accent,
            titleEmphasis: "Unlocked.",
            subtitle: "Owner contact + documents are yours."
        )
    }

    // MARK: - Skeleton + error

    private var skeletonContent: some View {
        VStack(spacing: 24) {
            SkeletonView(cornerRadius: 0)
                .frame(height: 320)
            VStack(spacing: 12) {
                SkeletonView(cornerRadius: 14).frame(height: 80)
                HStack(spacing: 10) {
                    SkeletonView(cornerRadius: 14).frame(height: 90)
                    SkeletonView(cornerRadius: 14).frame(height: 90)
                }
                SkeletonView(cornerRadius: 18).frame(height: 180)
            }
            .padding(.horizontal, 20)
            Spacer()
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(Palette.warning)
            Text("Couldn't load this project")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .multilineTextAlignment(.center)
            Press(haptic: .tap) {
                Task { await vm.load() }
            } content: {
                Text("Try again")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accentContrast)
                    .padding(.horizontal, 22)
                    .frame(height: 44)
                    .background(Capsule().fill(Palette.accent))
                    .shadow(color: Palette.accentGlow, radius: 12, x: 0, y: 4)
            }
            .padding(.top, 6)
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 40)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(2.4)
            .foregroundStyle(Palette.textDim)
    }

    private func projectFields(
        from response: ProjectsAPI.ProjectDetailResponse
    ) -> ProjectsAPI.DetailProjectFields {
        switch response {
        case .preview(let p): return p.project
        case .unlockedBuilder(let u): return u.project
        case .owner(let o): return o.project
        }
    }

    private func isUnlocked(_ response: ProjectsAPI.ProjectDetailResponse) -> Bool {
        switch response {
        case .unlockedBuilder: return true
        default: return false
        }
    }

    private func typeChip(for type: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: typeIcon(for: type))
                .font(.system(size: 10, weight: .bold))
            Text(typeLabel(for: type).uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.4)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(.black.opacity(0.42)))
        .overlay(Capsule().stroke(.white.opacity(0.22), lineWidth: 1))
    }

    private func freshnessTag(publishedAt: String?) -> some View {
        HStack(spacing: 5) {
            Circle()
                .fill(.white)
                .frame(width: 5, height: 5)
                .shadow(color: .white.opacity(0.6), radius: 4)
            Text(freshnessLabel(publishedAt).uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(.black.opacity(0.42)))
        .overlay(Capsule().stroke(.white.opacity(0.22), lineWidth: 1))
    }

    private func freshnessLabel(_ iso: String?) -> String {
        guard let iso = iso else { return "NEW" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: iso) ?? {
            let alt = ISO8601DateFormatter()
            alt.formatOptions = [.withInternetDateTime]
            return alt.date(from: iso) ?? Date()
        }()
        let elapsed = Date().timeIntervalSince(date)
        let days = Int(elapsed / 86_400)
        switch days {
        case 0: return "Today"
        case 1: return "Yesterday"
        case 2...6: return "\(days)d ago"
        case 7...29: return "\(days / 7)w ago"
        default: return "\(days / 30)mo ago"
        }
    }

    private func keyFacts(
        for project: ProjectsAPI.DetailProjectFields
    ) -> [(label: String, value: String, icon: String)] {
        var facts: [(label: String, value: String, icon: String)] = []
        if let beds = project.bedrooms {
            facts.append(("Bedrooms", "\(beds)", "bed.double.fill"))
        }
        if let baths = project.bathrooms {
            facts.append(("Bathrooms", "\(baths)", "shower.fill"))
        }
        if let floors = project.floors {
            facts.append(("Floors", "\(floors)", "stairs"))
        }
        if let dwellings = project.dwellingCount {
            facts.append(("Dwellings", "\(dwellings)", "building.2.fill"))
        }
        if let buildSize = sizeLabel(project.buildSizeBand) {
            facts.append(("Build", buildSize, "ruler.fill"))
        }
        if let landSize = sizeLabel(project.landSizeBand) {
            facts.append(("Land", landSize, "square.dashed"))
        }
        return facts
    }

    private func sizeLabel(_ band: String?) -> String? {
        guard let band = band else { return nil }
        let mapping: [String: String] = [
            "under_100": "<100m²", "100_150": "100-150m²", "150_200": "150-200m²",
            "200_250": "200-250m²", "250_300": "250-300m²", "300_400": "300-400m²",
            "over_400": ">400m²",
            "under_200": "<200m²", "200_400": "200-400m²", "400_600": "400-600m²",
            "600_800": "600-800m²", "800_1000": "800-1000m²", "over_1000": ">1000m²",
            "under_20": "<20m²", "20_40": "20-40m²", "40_60": "40-60m²",
            "60_80": "60-80m²", "80_100": "80-100m²", "over_100": ">100m²",
        ]
        return mapping[band] ?? band
    }

    private func budgetLabel(_ band: String?) -> String? {
        guard let band = band else { return nil }
        switch band {
        case "under_500k": return "Under $500k"
        case "500k_1m":    return "$500k–$1M"
        case "1m_1_5m":    return "$1–1.5M"
        case "1_5m_2m":    return "$1.5–2M"
        case "2m_3m":      return "$2–3M"
        case "3m_5m":      return "$3–5M"
        case "over_5m":    return "$5M+"
        default:           return band
        }
    }

    private func prettyMonth(_ key: String) -> String {
        let parts = key.split(separator: "-")
        guard parts.count == 2,
              let y = Int(parts[0]),
              let m = Int(parts[1]),
              (1...12).contains(m)
        else { return key }
        let names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]
        return "\(names[m - 1]) \(y)"
    }

    private func locationLabel(
        project: ProjectsAPI.DetailProjectFields
    ) -> String? {
        let suburb = project.suburb?.trimmingCharacters(in: .whitespacesAndNewlines)
        let state = project.state?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let suburb, !suburb.isEmpty, let state, !state.isEmpty {
            return "\(suburb), \(state)"
        }
        if let state, !state.isEmpty { return state }
        if let suburb, !suburb.isEmpty { return suburb }
        return nil
    }

    private func typeIcon(for type: String) -> String {
        switch type {
        case "single_dwelling": return "house.fill"
        case "multi_dwelling":  return "building.2.fill"
        case "renovation":      return "paintbrush.fill"
        case "extension":       return "rectangle.expand.vertical"
        default:                return "square.dashed"
        }
    }

    private func typeLabel(for type: String) -> String {
        switch type {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling":  return "Multi-dwelling"
        case "renovation":      return "Renovation"
        case "extension":       return "Extension"
        default:                return type
        }
    }

}

