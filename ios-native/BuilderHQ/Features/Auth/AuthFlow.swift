/// AuthFlow — the signed-out entry experience.
///
/// Coordinates three screens via a local state enum:
///   · .login                       — LoginScreen
///   · .signup                      — SignupScreen
///   · .verify(email, expiresAtISO) — VerifyCodeScreen (after signup
///                                     submits, before tokens land)
///
/// Why a local enum (vs. NavigationStack): these are siblings inside
/// one ambient background — pushes feel wrong. Cross-fade + slide
/// between them so the BUILDERHQ kicker and gradient stay anchored
/// while the form swaps.
///
/// Successful login OR successful verify both call
/// `session.didSignIn(user:)`, which flips the root in App.swift from
/// AuthFlow to MainTabs — so AuthFlow never has to know about its own
/// dismissal.

import SwiftUI

struct AuthFlow: View {
    @Environment(AuthSession.self) private var session
    @State private var step: Step = .login

    enum Step: Equatable {
        case login
        case signup
        /// `expiresAtISO` seeds the countdown timer on VerifyCodeScreen.
        case verify(email: String, expiresAtISO: String)
        /// "Forgot password?" — email entry (ForgotPasswordScreen).
        case forgot
        /// Reset code + new password. `expiresAtISO` seeds the countdown
        /// on ResetPasswordScreen.
        case reset(email: String, expiresAtISO: String)
    }

    var body: some View {
        ZStack {
            switch step {
            case .login:
                LoginScreen(
                    onSignupTap: { withAnimation(Motion.easeOut) { step = .signup } },
                    onForgotTap: { withAnimation(Motion.easeOut) { step = .forgot } }
                )
                .transition(.opacity.combined(with: .move(edge: .leading)))
            case .signup:
                SignupScreen(
                    onCodeSent: { email, expiresAtISO in
                        withAnimation(Motion.easeOut) {
                            step = .verify(email: email, expiresAtISO: expiresAtISO)
                        }
                    },
                    onBackToLogin: { withAnimation(Motion.easeOut) { step = .login } }
                )
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            case let .verify(email, expiresAtISO):
                VerifyCodeScreen(
                    email: email,
                    codeExpiresAtISO: expiresAtISO,
                    onVerified: { user in
                        // Tokens are already persisted by AuthAPI.verifyCode;
                        // just flip the session and the tree swaps to MainTabs.
                        session.didSignIn(user: user)
                    },
                    onChangeEmail: { withAnimation(Motion.easeOut) { step = .signup } }
                )
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            case .forgot:
                ForgotPasswordScreen(
                    onCodeSent: { email, expiresAtISO in
                        withAnimation(Motion.easeOut) {
                            step = .reset(email: email, expiresAtISO: expiresAtISO)
                        }
                    },
                    onBackToLogin: { withAnimation(Motion.easeOut) { step = .login } }
                )
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            case let .reset(email, expiresAtISO):
                ResetPasswordScreen(
                    email: email,
                    codeExpiresAtISO: expiresAtISO,
                    onReset: { user in
                        // Tokens already persisted by AuthAPI.resetPassword;
                        // flip the session and the tree swaps to MainTabs.
                        session.didSignIn(user: user)
                    },
                    onChangeEmail: { withAnimation(Motion.easeOut) { step = .forgot } }
                )
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            }
        }
        // Animate the case-to-case swap. Explicit `value:` so SwiftUI
        // only rebuilds the branch when `step` actually changes.
        .animation(Motion.easeOut, value: step)
    }
}
