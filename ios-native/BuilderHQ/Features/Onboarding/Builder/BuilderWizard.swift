/// BuilderWizard — top-level container for the 7-step builder onboarding.
///
/// Layout, top → bottom:
///   1. Top bar: BUILDERHQ kicker + sign-out pill (right)
///   2. Slim 7-pill progress indicator
///   3. Scrollable step body (changes via animated transition)
///   4. Sticky footer with Back / Continue
///
/// Transitions: each step's content swaps with an asymmetric move-
/// in-and-out + fade. Forward navigation slides in from the right;
/// back navigation slides in from the left. The view model owns the
/// direction-of-travel so the animation tracks user intent rather
/// than the raw step index.

import SwiftUI

struct BuilderWizard: View {
    @Environment(AuthSession.self) private var session
    let user: AuthSession.AuthUser

    @State private var vm = BuilderWizardViewModel()

    var body: some View {
        VStack(spacing: 0) {
            topBar
            progressBar

            // The animating canvas. ZStack + `.id(vm.step)` is what
            // makes SwiftUI treat each step as a fresh view that
            // transitions in (rather than mutating in place).
            ZStack {
                currentStep
                    .id(vm.step)
                    .transition(
                        .asymmetric(
                            insertion: .move(edge: vm.direction == .forward ? .trailing : .leading)
                                .combined(with: .opacity),
                            removal: .move(edge: vm.direction == .forward ? .leading : .trailing)
                                .combined(with: .opacity)
                        )
                    )
            }
            .animation(
                .spring(response: 0.45, dampingFraction: 0.86),
                value: vm.step
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
        }
        .task {
            await vm.hydrate()
        }
        .onChange(of: vm.completionUser) { _, newUser in
            if let u = newUser {
                session.didCompleteOnboarding(user: u)
            }
        }
        .overlay {
            if vm.isHydrating {
                hydratingOverlay
                    .transition(.opacity)
            }
        }
        .animation(Motion.easeOut, value: vm.isHydrating)
    }

    // MARK: - Top bar (BUILDERHQ kicker only — Sign out lives in the
    // shared OnboardingFlow overlay so it's consistent across owner +
    // builder screens).

    private var topBar: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(Palette.accent)
                .frame(width: 6, height: 6)
                .shadow(color: Palette.accentGlow, radius: 6)
            Text("BUILDERHQ")
                .font(.system(size: 11, weight: .bold))
                .tracking(2.4)
                .foregroundStyle(Palette.accent)
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .padding(.bottom, 16)
    }

    // MARK: - Progress bar

    private var progressBar: some View {
        WizardProgress(
            total: BuilderWizardViewModel.Step.allCases.count,
            current: vm.step.rawValue
        )
        .padding(.horizontal, 24)
        .padding(.bottom, 8)
    }

    // MARK: - Current step view

    @ViewBuilder
    private var currentStep: some View {
        switch vm.step {
        case .company:
            BuilderStep01Company(vm: vm)
        case .address:
            BuilderStep02Address(vm: vm)
        case .categories:
            BuilderStep03Categories(vm: vm)
        case .serviceAreas:
            BuilderStep04ServiceAreas(vm: vm)
        case .licences:
            BuilderStep05Licences(vm: vm)
        case .about:
            BuilderStep06About(vm: vm)
        case .review:
            BuilderStep07Review(vm: vm)
        }
    }

    // MARK: - Hydrating overlay

    private var hydratingOverlay: some View {
        ZStack {
            Palette.canvas.opacity(0.96)
                .ignoresSafeArea()
            VStack(spacing: 14) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(Palette.accent)
                Text("Picking up where you left off")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
            }
        }
    }
}
