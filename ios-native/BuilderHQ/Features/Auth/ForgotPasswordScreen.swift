/// ForgotPasswordScreen — step one of the reset flow.
///
/// Composition mirrors LoginScreen:
///   · `BUILDERHQ` kicker
///   · "Forgot your" + Instrument Serif italic "password?"
///   · One email field
///   · "Send reset code" filled-teal pill
///   · Footer: "Remember it? Sign in"
///
/// Behaviour:
///   · Validates the email on submit (empty / format)
///   · Hits AuthAPI.requestPasswordReset → onCodeSent(email, expiresAt)
///   · The server ALWAYS succeeds (it never reveals whether the email is
///     registered), so we always advance to ResetPasswordScreen. If the
///     address isn't on file, no code arrives — which is the correct,
///     non-enumerable behaviour.
///   · Error state: soft shake + inline field error or a banner toast

import SwiftUI

struct ForgotPasswordScreen: View {
    /// Called once the server has (best-effort) emailed a code. Carries
    /// the email + ISO expiry so AuthFlow can seed ResetPasswordScreen.
    let onCodeSent: (_ email: String, _ expiresAtISO: String) -> Void
    /// Tapped "Sign in" in the footer — bounces back to LoginScreen.
    let onBackToLogin: () -> Void

    @State private var email = ""
    @State private var emailError: String? = nil
    @State private var bannerError: String? = nil
    @State private var status: SubmitStatus = .idle
    @State private var shakeAmount: CGFloat = 0
    @FocusState private var emailFocused: Bool

    fileprivate enum SubmitStatus {
        case idle
        case submitting
        case success
    }

    var body: some View {
        ZStack {
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture { emailFocused = false }

            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    headerBlock
                    fieldSection
                        .offset(x: shakeAmount)
                        .disabled(status == .submitting)

                    if let banner = bannerError {
                        BannerError(message: banner)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    submitButton
                    footer
                }
                .padding(.horizontal, 24)
                .padding(.top, 48)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .onAppear { emailFocused = true }
    }

    // MARK: - Sections

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 18) {
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

            (
                Text("Forgot your\n")
                    .font(Typography.ui(size: 42, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("password?")
                    .font(Typography.serifItalic(size: 42))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.5)
            .lineSpacing(-4)

            Text("Enter your email and we'll send you a 6-digit reset code.")
                .font(Typography.body)
                .foregroundStyle(Palette.textMuted)
        }
    }

    private var fieldSection: some View {
        PremiumTextField(
            label: "Email",
            text: $email,
            keyboardType: .emailAddress,
            textContentType: .emailAddress,
            submitLabel: .go,
            error: emailError,
            onSubmit: { Task { await submit() } }
        )
        .focused($emailFocused)
    }

    private var submitButton: some View {
        ForgotSubmitButton(status: status) {
            Task { await submit() }
        }
        .disabled(status == .submitting || status == .success)
    }

    private var footer: some View {
        HStack(spacing: 6) {
            Text("Remember it?")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Palette.textMuted)
            Button(action: onBackToLogin) {
                Text("Sign in")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.accentLight)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    // MARK: - Submit

    private func submit() async {
        emailFocused = false
        emailError = nil
        bannerError = nil

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedEmail.isEmpty {
            emailError = "Email is required."
            await shake()
            return
        }
        if !trimmedEmail.contains("@") || !trimmedEmail.contains(".") {
            emailError = "That doesn't look like an email."
            await shake()
            return
        }

        status = .submitting
        do {
            let result = try await AuthAPI.requestPasswordReset(email: trimmedEmail)
            status = .success
            try? await Task.sleep(for: .milliseconds(240))
            onCodeSent(trimmedEmail, result.codeExpiresAt)
        } catch let error as APIError {
            status = .idle
            switch error {
            case .validation(let message, let fieldErrors):
                emailError = fieldErrors["email"]
                if emailError == nil { bannerError = message }
            case .rateLimited(let message):
                bannerError = message
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

    private func shake() async {
        for delta in [10.0, -10.0, 8.0, -8.0, 4.0, -4.0, 0.0] {
            withAnimation(.linear(duration: 0.05)) { shakeAmount = delta }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }
}

// MARK: - Submit button (idle / loading / success)

private struct ForgotSubmitButton: View {
    let status: ForgotPasswordScreen.SubmitStatus
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
                        Text("Send reset code")
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
