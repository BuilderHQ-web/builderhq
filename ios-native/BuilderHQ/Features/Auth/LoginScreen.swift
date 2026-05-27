/// LoginScreen — the first showcase moment.
///
/// Composition:
///   · `BUILDERHQ` kicker at the top
///   · "Welcome back." with Instrument Serif italic accent
///   · Email + password fields (PremiumTextField — animated focus)
///   · "Sign in" filled-teal pill with multi-layer glow
///   · Footer: "Forgot password?" + "Don't have an account? Sign up"
///
/// Behaviour:
///   · Fields validate on submit (empty / format)
///   · Submit hits AuthAPI.login → AuthSession.didSignIn(user:)
///   · Loading state: button morphs to a spinner, fields lock
///   · Error state: a soft shake on the form + inline field errors
///     or a banner toast for non-field errors
///   · Success: a brief 200ms "done" animation on the button before
///     the auth session flips and the view tree swaps to MainTabs
///
/// Keyboard:
///   · "Next" on email field → focuses password
///   · "Go" on password → submits
///   · Tap outside fields dismisses keyboard
///   · ScrollView ensures the form stays above the keyboard

import SwiftUI

struct LoginScreen: View {
    @Environment(AuthSession.self) private var session

    @State private var email = ""
    @State private var password = ""
    @State private var emailError: String? = nil
    @State private var passwordError: String? = nil
    @State private var bannerError: String? = nil
    @State private var status: SubmitStatus = .idle
    @State private var shakeAmount: CGFloat = 0
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case email, password }

    private enum SubmitStatus {
        case idle
        case submitting
        case success
    }

    var body: some View {
        ZStack {
            // Tap-outside-to-dismiss-keyboard.
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture { focusedField = nil }

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Spacer(minLength: 40)

                    // Kicker
                    HStack(spacing: 10) {
                        Circle()
                            .fill(Palette.accent)
                            .frame(width: 6, height: 6)
                            .shadow(color: Palette.accentGlow, radius: 6)
                        Text("BUILDERHQ")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(2.4)
                            .foregroundStyle(Palette.accent)
                    }

                    // Hero headline
                    Group {
                        Text("Welcome")
                            .font(Typography.ui(size: 44, weight: .medium))
                            .foregroundStyle(Palette.text)
                            .tracking(-0.4)
                        Text("back.")
                            .font(Typography.serifItalic(size: 44))
                            .foregroundStyle(Palette.accentLight)
                            .tracking(-0.4)
                    }
                    .padding(.top, 20)

                    Text("Sign in to find your next build.")
                        .font(Typography.body)
                        .foregroundStyle(Palette.textMuted)
                        .padding(.top, 14)

                    // Form
                    VStack(spacing: 14) {
                        PremiumTextField(
                            label: "Email",
                            text: $email,
                            keyboardType: .emailAddress,
                            textContentType: .emailAddress,
                            submitLabel: .next,
                            error: emailError,
                            onSubmit: { focusedField = .password }
                        )
                        .focused($focusedField, equals: .email)

                        PremiumTextField(
                            label: "Password",
                            text: $password,
                            textContentType: .password,
                            isSecure: true,
                            submitLabel: .go,
                            error: passwordError,
                            onSubmit: { Task { await submit() } }
                        )
                        .focused($focusedField, equals: .password)
                    }
                    .padding(.top, 32)
                    .offset(x: shakeAmount)
                    .disabled(status == .submitting)

                    if let banner = bannerError {
                        BannerError(message: banner)
                            .padding(.top, 14)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    // Forgot password
                    HStack {
                        Spacer()
                        Button {
                            // TODO: forgot password flow lands later
                        } label: {
                            Text("Forgot password?")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Palette.textMuted)
                        }
                    }
                    .padding(.top, 14)

                    // Submit
                    SubmitButton(status: status) {
                        Task { await submit() }
                    }
                    .padding(.top, 28)
                    .disabled(status == .submitting || status == .success)

                    // Footer
                    HStack(spacing: 6) {
                        Text("Don't have an account?")
                            .font(.system(size: 13, weight: .regular))
                            .foregroundStyle(Palette.textMuted)
                        Button {
                            // TODO: SignupScreen lands next turn
                        } label: {
                            Text("Sign up")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(Palette.accentLight)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 28)
                    .padding(.bottom, 40)
                }
                .padding(.horizontal, 24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    // MARK: - Submit logic

    private func submit() async {
        focusedField = nil

        // Reset errors.
        emailError = nil
        passwordError = nil
        bannerError = nil

        // Validate.
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        var ok = true
        if trimmedEmail.isEmpty {
            emailError = "Email is required."
            ok = false
        } else if !trimmedEmail.contains("@") || !trimmedEmail.contains(".") {
            emailError = "That doesn't look like an email."
            ok = false
        }
        if password.isEmpty {
            passwordError = "Password is required."
            ok = false
        }
        if !ok {
            await shake()
            return
        }

        status = .submitting

        do {
            let user = try await AuthAPI.login(
                email: trimmedEmail,
                password: password
            )
            status = .success
            // Brief beat so the user sees the checkmark before the
            // tree swaps to MainTabs.
            try? await Task.sleep(for: .milliseconds(280))
            session.didSignIn(user: user)
        } catch let error as APIError {
            status = .idle
            switch error {
            case .validation(_, let fieldErrors):
                emailError = fieldErrors["email"]
                passwordError = fieldErrors["password"]
                if emailError == nil && passwordError == nil {
                    bannerError = error.errorDescription
                }
            case .unauthorized:
                bannerError = "Wrong email or password."
                passwordError = " " // shows error border without dup text
            default:
                bannerError = error.errorDescription
            }
            await shake()
        } catch {
            status = .idle
            bannerError = "Something went wrong. Try again in a moment."
            await shake()
        }
    }

    /// Quick horizontal shake to telegraph an error.
    private func shake() async {
        for delta in [10.0, -10.0, 8.0, -8.0, 4.0, -4.0, 0.0] {
            withAnimation(.linear(duration: 0.05)) {
                shakeAmount = delta
            }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }
}

// MARK: - Submit button (idle / loading / success)

private struct SubmitButton: View {
    let status: LoginScreen.SubmitStatus
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Capsule()
                    .fill(Palette.accent)
                    .shadow(color: Palette.accentGlow, radius: 22, x: 0, y: 10)

                switch status {
                case .idle:
                    HStack(spacing: 10) {
                        Text("Sign in")
                            .font(.system(size: 16, weight: .bold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Palette.accentContrast)
                    .transition(.opacity)
                case .submitting:
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(Palette.accentContrast)
                        .transition(.opacity)
                case .success:
                    Image(systemName: "checkmark")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Palette.accentContrast)
                        .symbolEffect(.bounce, value: status)
                        .transition(.opacity)
                }
            }
            .frame(height: 56)
            .frame(maxWidth: .infinity)
            .animation(Motion.easeOut, value: status)
        }
        .sensoryFeedback(.impact(weight: .medium), trigger: status == .submitting)
        .sensoryFeedback(.success, trigger: status == .success)
    }
}

// MARK: - Inline banner error

private struct BannerError: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .foregroundStyle(Palette.danger)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Palette.dangerMuted)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Palette.danger.opacity(0.35), lineWidth: 1)
        )
    }
}
