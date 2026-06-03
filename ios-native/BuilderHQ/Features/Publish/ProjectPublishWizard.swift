/// ProjectPublishWizard — the project-publish flow.
///
/// Three vertically-stacked zones:
///   1. Top: AmbientBackground (same as the rest of the app) + a
///      small wizard top-bar with progress dots + close button
///   2. Middle: LivePreviewCard — the project preview that BUILDS
///      itself as the user answers each step. The hero moment.
///   3. Bottom: the current step view + a sticky footer with Back +
///      Continue (or Publish on the final step)
///
/// Each step swap uses a direction-aware spring transition (forward
/// slides in from the trailing edge, back from the leading edge).
///
/// On Publish:
///   · CTA morphs spinner → success
///   · ConfettiCelebration view fades in over the whole screen
///   · Big italic "Your project is live."
///   · "Open dashboard" CTA dismisses the wizard which triggers the
///      owner dashboard refresh callback

import SwiftUI

struct ProjectPublishWizard: View {
    let onPublished: () -> Void
    let onDismiss: () -> Void

    @State private var vm = ProjectPublishViewModel()
    @State private var showCelebration: Bool = false

    /// Which intro stage we're in. The wizard proper is the final stage;
    /// the AI path inserts a scan stage before it.
    private enum StageID: Int { case choice, scan, wizard }
    private var stageID: StageID {
        if vm.mode == nil { return .choice }
        if vm.mode == .ai && !vm.planScanComplete { return .scan }
        return .wizard
    }

    var body: some View {
        ZStack {
            AmbientBackground()
                .ignoresSafeArea()

            if showCelebration, let project = vm.publishedProject {
                CelebrationView(
                    project: project,
                    savedAsDraft: vm.savedAsDraft,
                    onContinue: onPublished
                )
                .transition(.opacity.combined(with: .scale(scale: 0.96)))
            } else {
                stageContent
                    .id(stageID)
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            }

            // Immersive "reading your plans" overlay (AI path).
            if vm.isScanning {
                DocumentScanOverlay(
                    title: "Reading your plans",
                    subtitle: "Pulling out rooms, sizes, address & more…"
                )
                .zIndex(5)
            }
        }
        .animation(
            .spring(response: 0.55, dampingFraction: 0.85),
            value: showCelebration
        )
        .animation(.spring(response: 0.5, dampingFraction: 0.86), value: stageID)
        .animation(.easeInOut(duration: 0.3), value: vm.isScanning)
    }

    // MARK: - Intro stages

    @ViewBuilder
    private var stageContent: some View {
        switch stageID {
        case .choice:
            ProjectStartChoiceView(
                onAI: { vm.chooseAI() },
                onManual: { vm.chooseManual() },
                onClose: onDismiss
            )
        case .scan:
            PlanScanView(
                vm: vm,
                onBack: { vm.mode = nil },
                onClose: onDismiss
            )
        case .wizard:
            wizardContent
        }
    }

    // MARK: - Wizard content

    private var wizardContent: some View {
        VStack(spacing: 0) {
            topBar
            if vm.showPlanReview {
                planReviewBanner
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
            previewBlock
            stepBody
                .frame(maxHeight: .infinity)
            footer
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: vm.showPlanReview)
    }

    /// AI path: a dismissible banner reminding the owner that the wizard
    /// was pre-filled from their plans and to review each step.
    private var planReviewBanner: some View {
        HStack(spacing: 11) {
            Image(systemName: "sparkles")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Palette.accent)
            VStack(alignment: .leading, spacing: 2) {
                Text(vm.planFilledCount > 0
                    ? "Filled \(vm.planFilledCount) detail\(vm.planFilledCount == 1 ? "" : "s") from your plans"
                    : "We read your plans")
                    .font(.system(size: 13.5, weight: .bold))
                    .foregroundStyle(Palette.text)
                Text("Review each step and adjust anything before you publish.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
            Press(haptic: .tap) {
                withAnimation(.easeInOut(duration: 0.25)) { vm.dismissPlanReview() }
            } content: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                    .frame(width: 26, height: 26)
                    .background(Circle().fill(Palette.surface))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
        }
        .padding(13)
        .background(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .fill(Palette.accent.opacity(0.09))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(Palette.accent.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: 12) {
            Press(haptic: .tap, action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }

            WizardProgress(
                total: ProjectPublishViewModel.Step.allCases.count,
                current: vm.step.rawValue
            )

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 14)
    }

    // MARK: - Preview block

    private var previewBlock: some View {
        LivePreviewCard(draft: vm.draft)
            .padding(.horizontal, 20)
            .padding(.bottom, 18)
    }

    // MARK: - Step body

    @ViewBuilder
    private var stepBody: some View {
        ZStack {
            currentStep
                .id(vm.step)
                .transition(
                    .asymmetric(
                        insertion: .move(
                            edge: vm.direction == .forward ? .trailing : .leading
                        )
                        .combined(with: .opacity),
                        removal: .move(
                            edge: vm.direction == .forward ? .leading : .trailing
                        )
                        .combined(with: .opacity)
                    )
                )
        }
        .animation(
            .spring(response: 0.42, dampingFraction: 0.86),
            value: vm.step
        )
        .clipped()
    }

    @ViewBuilder
    private var currentStep: some View {
        switch vm.step {
        case .type:
            PublishStep1Type(vm: vm)
        case .location:
            PublishStep2Location(vm: vm)
        case .specs:
            PublishStep3Specs(vm: vm)
        case .budgetTimeline:
            PublishStep4BudgetTimeline(vm: vm)
        case .titleDescription:
            PublishStep5TitleDescription(vm: vm)
        case .documents:
            PublishStepDocuments(vm: vm)
        case .review:
            PublishStep6Review(vm: vm) {
                Task {
                    let ok = await vm.publish()
                    if ok {
                        withAnimation(
                            .spring(response: 0.55, dampingFraction: 0.85)
                                .delay(0.15)
                        ) {
                            showCelebration = true
                        }
                    }
                }
            }
        }
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 12) {
            if vm.step != .type {
                Press(haptic: .tap) { vm.goBack() } content: {
                    HStack(spacing: 6) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .bold))
                        Text("Back")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 18)
                    .frame(height: 52)
                    .background(Capsule().fill(Palette.surface))
                    .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
                }
            }

            Button(action: onContinueTapped) {
                ZStack {
                    Capsule()
                        .fill(canContinue ? Palette.accent : Palette.surfaceElev)
                        .shadow(
                            color: canContinue ? Palette.accentGlow : .clear,
                            radius: 22,
                            x: 0,
                            y: 10
                        )

                    if vm.isSaving {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(Palette.accentContrast)
                    } else {
                        HStack(spacing: 10) {
                            Text(continueLabel)
                                .font(.system(size: 16, weight: .bold))
                            Image(
                                systemName: vm.step == .review
                                    ? "checkmark.circle.fill"
                                    : "arrow.right"
                            )
                            .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundStyle(
                            canContinue
                                ? Palette.accentContrast
                                : Palette.textDim
                        )
                    }
                }
                .frame(height: 52)
                .frame(maxWidth: .infinity)
                .animation(Motion.easeOut, value: vm.isSaving)
                .animation(Motion.easeOut, value: canContinue)
            }
            .disabled(!canContinue || vm.isSaving)
            .sensoryFeedback(.impact(weight: .medium), trigger: vm.isSaving)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
        .padding(.top, 10)
        .background(
            LinearGradient(
                colors: [Palette.canvas.opacity(0), Palette.canvas.opacity(0.94)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }

    private var canContinue: Bool { vm.canContinueFromCurrentStep }

    private var continueLabel: String {
        switch vm.step {
        case .review:
            // Owners with no architectural plan land here through a
            // "Save as draft" path — the server enforces the same
            // gate either way, but matching the button copy to the
            // outcome the user is actually about to get is the right
            // UX. No surprises on the celebration screen.
            return vm.hasArchitecturalPlan
                ? "Publish project"
                : "Save as draft"
        default: return "Continue"
        }
    }

    private func onContinueTapped() {
        if vm.step == .review {
            Task {
                let ok = await vm.publish()
                if ok {
                    withAnimation(
                        .spring(response: 0.55, dampingFraction: 0.85)
                            .delay(0.15)
                    ) {
                        showCelebration = true
                    }
                }
            }
        } else {
            vm.goForward()
        }
    }
}

// MARK: - Celebration view

/// The wizard's finishing moment. Two variants:
///
///   · Published (default): big checkmark seal, sparkle particles,
///     "Your project is live.", "Builders are seeing it now." This
///     is what we want every owner to see.
///   · Saved as draft: same chrome but the headline flips to "Saved
///     as a draft." with copy explaining that adding architectural
///     plans will publish it. Same accent treatment so it still
///     feels like a moment, not a failure.
private struct CelebrationView: View {
    let project: ProjectsAPI.PublishResponse.Project
    let savedAsDraft: Bool
    let onContinue: () -> Void

    var body: some View {
        CelebrationScene(
            symbol: savedAsDraft ? "tray.full.fill" : "checkmark.seal.fill",
            tone: savedAsDraft ? .accent : .success,
            titlePlain: savedAsDraft ? "Saved as a" : "Your project is",
            titleEmphasis: savedAsDraft ? "draft." : "live.",
            detail: project.title,
            subtitle: savedAsDraft
                ? "Add architectural plans from your dashboard to publish — builders see it the moment you do."
                : "Builders in your service area are seeing it now.",
            cta: CelebrationCTA(label: "Open dashboard", action: onContinue)
        )
    }
}
