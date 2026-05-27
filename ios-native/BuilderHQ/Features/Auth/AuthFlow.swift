/// AuthFlow — the signed-out entry experience.
///
/// Stub for week 1. Currently a single welcome screen with a "Sign in"
/// button that just flips the session to signed-in for development.
/// The real login (email/password against /api/mobile/auth/login,
/// Keychain token storage, refresh rotation) lands in week 2.

import SwiftUI

struct AuthFlow: View {
    @Environment(AuthSession.self) private var session

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Logo + brand mark
            VStack(alignment: .leading, spacing: 8) {
                Text("BUILDERHQ")
                    .font(Typography.ui(size: 11, weight: .semibold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.accent)

                AccentItalic(plain: "Find your", italic: "next build.", size: 52)
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()

            // Stub sign-in
            Press(haptic: .select) {
                session.didSignIn(
                    user: .init(
                        id: "stub",
                        email: "matt@smithco.com.au",
                        name: "Smith & Co Builders",
                        role: .builder
                    )
                )
            } content: {
                Text("Sign in")
                    .font(Typography.ui(size: 15, weight: .bold))
                    .tracking(0.1)
                    .foregroundStyle(Palette.accentContrast)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(
                        Capsule().fill(Palette.accent)
                    )
                    .shadow(color: Palette.accentGlow, radius: 20, x: 0, y: 8)
            }
            .padding(.horizontal, 24)

            Text("Stubbed — proper login flow lands week 2.")
                .font(Typography.caption)
                .foregroundStyle(Palette.textDim)
                .padding(.bottom, 12)
        }
    }
}
