/// OnboardingFlow — the post-signup, pre-dashboard shell.
///
/// Dispatches to the role-specific wizard:
///   · projectOwner → OwnerOnboardingScreen (single-screen, 3 sections)
///   · builder      → BuilderOnboardingScreen (7-step wizard, lands next)
///   · admin        → never sees this; the server's hasCompletedOnboarding
///                    always returns true for admins so we never route here.
///                    If we somehow do (data drift), show a graceful fallback.
///
/// A small "Sign out" pill sits at the top-right so a user who lands
/// here by accident (wrong role, wrong account) can bail without
/// completing the wizard. Same affordance the web /onboarding shell
/// surfaces in its header.

import SwiftUI

struct OnboardingFlow: View {
    @Environment(AuthSession.self) private var session
    let user: AuthSession.AuthUser

    var body: some View {
        ZStack(alignment: .topTrailing) {
            content

            // Top-right sign-out — always visible, always reachable.
            // Padding tuned to clear the dynamic-island notch on the
            // iPhone 15 Pro+ family without an explicit safe-area read.
            Press(haptic: .tap) {
                Task { await session.didSignOut() }
            } content: {
                Text("Sign out")
                    .font(.system(size: 12, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(Palette.textDim)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(
                        Capsule().fill(Palette.surface.opacity(0.7))
                    )
                    .overlay(
                        Capsule().stroke(Palette.hairline, lineWidth: 1)
                    )
            }
            .padding(.trailing, 18)
            .padding(.top, 12)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch user.role {
        case .projectOwner:
            OwnerOnboardingScreen(user: user)
        case .builder:
            BuilderWizard(user: user)
        case .admin:
            // Shouldn't happen — admins are filtered server-side. If a
            // future data state slips one through, fall through to the
            // owner flow as a least-bad default.
            OwnerOnboardingScreen(user: user)
        }
    }
}
