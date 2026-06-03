/// ResetPasswordScreen — step two of the reset flow.
///
/// Combines the OTP entry from VerifyCodeScreen with a new-password
/// field, so the whole reset happens on one screen:
///   · `BUILDERHQ` kicker
///   · "Choose a new" + Instrument Serif italic "password."
///   · "Enter the code we sent to {email}." + six glowing slot boxes
///   · Live expiry countdown + resend (60s cooldown)
///   · A new-password field
///   · "Reset & sign in" pill
///   · "Use a different email" → back to the start
///
/// Behaviour:
///   · The hidden TextField drives the visible slots (paste + SMS
///     autofill work). Completing the 6th digit jumps focus to the
///     password field rather than auto-submitting — we still need a
///     password.
///   · Submit hits AuthAPI.resetPassword, which resets the password,
///     signs out other devices, and issues a session. On success the
///     tokens are already persisted, so onReset() just flips the session.
///   · Wrong code / weak password → shake + inline error.

import SwiftUI

struct ResetPasswordScreen: View {
    /// The email the code was sent to (from ForgotPasswordScreen).
    let email: String
    /// ISO-8601 code expiry — drives the "expires in 14:53" countdown.
    let codeExpiresAtISO: String
    /// Called after reset-password returns user + tokens. AuthFlow hands
    /// this to AuthSession.didSignIn(user:).
    let onReset: (AuthSession.AuthUser) -> Void
    /// Tapped "Use a different email" — bounces back to the start.
    let onChangeEmail: () -> Void

    @State private var code = ""
    @State private var password = ""
    @State private var passwordError: String? = nil
    @State private var status: SubmitStatus = .idle
    @State private var bannerError: String? = nil
    @State private var shakeAmount: CGFloat = 0

    @State private var now: Date = .now
    @State private var codeExpiresAt: Date = .now
    @State private var resendAvailableAt: Date = .now
    @State private var isResending: Bool = false

    @FocusState private var focus: Field?

    private enum Field: Hashable { case code, password }

    fileprivate enum SubmitStatus {
        case idle
        case submitting
        case success
    }

    /// Server requires ≥10 chars — gate the button on the same rule.
    private static let minPasswordLength = 10

    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 30) {
                    headerBlock
                    slotsBlock
                        .offset(x: shakeAmount)
                        .disabled(status == .submitting || status == .success)
                    passwordField
                        .disabled(status == .submitting || status == .success)

                    if let banner = bannerError {
                        BannerError(message: banner)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    submitButton
                    footerLink
                }
                .padding(.horizontal, 24)
                .padding(.top, 48)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .onAppear {
            codeExpiresAt = parseDate(codeExpiresAtISO) ?? Date()
            focus = .code
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) {
            now = $0
        }
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
                Text("Choose a new\n")
                    .font(Typography.ui(size: 42, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("password.")
                    .font(Typography.serifItalic(size: 42))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.5)
            .lineSpacing(-4)

            (
                Text("Enter the code we sent to ")
                    .foregroundStyle(Palette.textMuted)
                + Text(email)
                    .foregroundStyle(Palette.text)
            )
            .font(Typography.body)
        }
    }

    private var slotsBlock: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                ForEach(0..<6, id: \.self) { index in
                    CodeSlot(
                        digit: digit(at: index),
                        isActive: index == code.count && focus == .code,
                        isComplete: status == .success
                    )
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { focus = .code }
            .overlay {
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .focused($focus, equals: .code)
                    .opacity(0.001)
                    .allowsHitTesting(false)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .onChange(of: code) { _, newValue in
                handleCodeChange(newValue)
            }

            HStack(spacing: 6) {
                if codeIsExpired {
                    Text("Code expired.")
                        .foregroundStyle(Palette.danger)
                } else {
                    Text("Expires in \(formattedRemaining)")
                        .foregroundStyle(Palette.textDim)
                        .monospacedDigit()
                }
                Spacer()
                resendControl
            }
            .font(.system(size: 13, weight: .medium))
            .padding(.horizontal, 4)
        }
    }

    private var passwordField: some View {
        PremiumTextField(
            label: "New password",
            text: $password,
            textContentType: .newPassword,
            isSecure: true,
            submitLabel: .go,
            error: passwordError,
            onSubmit: { Task { await submit() } }
        )
        .focused($focus, equals: .password)
    }

    private var submitButton: some View {
        ResetSubmitButton(status: status, enabled: canSubmit) {
            Task { await submit() }
        }
        .disabled(status == .submitting || status == .success || !canSubmit)
    }

    private var footerLink: some View {
        Button(action: onChangeEmail) {
            Text("Use a different email")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Palette.accentLight)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    // MARK: - Resend

    @ViewBuilder
    private var resendControl: some View {
        if isResending {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(Palette.accentLight)
                .scaleEffect(0.8)
        } else if resendIsCoolingDown {
            Text("Resend in \(resendCooldownSeconds)s")
                .foregroundStyle(Palette.textDim)
                .monospacedDigit()
        } else {
            Button {
                Task { await resend() }
            } label: {
                Text("Resend code")
                    .foregroundStyle(Palette.accentLight)
            }
        }
    }

    // MARK: - Derived state

    private var canSubmit: Bool {
        code.count == 6
            && password.count >= Self.minPasswordLength
            && !codeIsExpired
    }

    private func digit(at index: Int) -> Character? {
        guard index < code.count else { return nil }
        return code[code.index(code.startIndex, offsetBy: index)]
    }

    private var codeIsExpired: Bool { codeExpiresAt <= now }

    private var formattedRemaining: String {
        let remaining = max(0, Int(codeExpiresAt.timeIntervalSince(now)))
        return String(format: "%d:%02d", remaining / 60, remaining % 60)
    }

    private var resendIsCoolingDown: Bool { resendAvailableAt > now }

    private var resendCooldownSeconds: Int {
        max(0, Int(resendAvailableAt.timeIntervalSince(now)))
    }

    // MARK: - Code editing

    private func handleCodeChange(_ raw: String) {
        let cleaned = raw.filter { $0.isNumber }.prefix(6)
        if cleaned.count != raw.count {
            code = String(cleaned)
            return
        }
        // Once the code is complete, jump to the password field — unlike
        // signup verify, we still need a password before submitting.
        if cleaned.count == 6 {
            focus = .password
        }
    }

    // MARK: - Submit

    private func submit() async {
        guard canSubmit, status == .idle else {
            if password.count < Self.minPasswordLength && code.count == 6 {
                passwordError = "At least \(Self.minPasswordLength) characters."
                await shake()
            }
            return
        }
        bannerError = nil
        passwordError = nil
        focus = nil
        status = .submitting

        do {
            let user = try await AuthAPI.resetPassword(
                email: email,
                code: code,
                newPassword: password
            )
            status = .success
            try? await Task.sleep(for: .milliseconds(360))
            onReset(user)
        } catch let error as APIError {
            status = .idle
            switch error {
            case .unauthorized:
                // The code is wrong/expired — clear it and refocus.
                bannerError = "That code is invalid or has expired."
                code = ""
                await shake()
                focus = .code
            case .validation(let message, let fieldErrors):
                passwordError = fieldErrors["password"]
                if passwordError == nil { bannerError = message }
                await shake()
            case .forbidden(let message):
                bannerError = message
                await shake()
            default:
                bannerError = error.errorDescription
                await shake()
            }
        } catch {
            status = .idle
            bannerError = "Something went wrong. Try again in a moment."
            await shake()
        }
    }

    private func resend() async {
        bannerError = nil
        isResending = true
        defer { isResending = false }
        do {
            let result = try await AuthAPI.requestPasswordReset(email: email)
            if let parsed = parseDate(result.codeExpiresAt) {
                codeExpiresAt = parsed
            }
            code = ""
            resendAvailableAt = Date().addingTimeInterval(60)
            focus = .code
        } catch let error as APIError {
            switch error {
            case .rateLimited(let message):
                bannerError = message
                resendAvailableAt = Date().addingTimeInterval(60)
            default:
                bannerError = error.errorDescription
            }
        } catch {
            bannerError = "Couldn't resend the code. Try again in a moment."
        }
    }

    private func shake() async {
        for delta in [10.0, -10.0, 8.0, -8.0, 4.0, -4.0, 0.0] {
            withAnimation(.linear(duration: 0.05)) { shakeAmount = delta }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    // MARK: - Date parsing

    private func parseDate(_ iso: String) -> Date? {
        let frac = ISO8601DateFormatter()
        frac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = frac.date(from: iso) { return d }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: iso)
    }
}

// MARK: - Slot view

private struct CodeSlot: View {
    let digit: Character?
    let isActive: Bool
    let isComplete: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14)
                .fill(Palette.surface)
            RoundedRectangle(cornerRadius: 14)
                .stroke(borderColor, lineWidth: isActive ? 1.5 : 1)

            if let digit {
                Text(String(digit))
                    .font(.system(size: 28, weight: .semibold, design: .rounded))
                    .foregroundStyle(textColor)
                    .monospacedDigit()
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 64)
        .shadow(color: isActive ? Palette.accentGlow : .clear, radius: 18, x: 0, y: 6)
        .animation(Motion.easeOut, value: isActive)
        .animation(Motion.spring, value: digit)
        .animation(Motion.easeOut, value: isComplete)
    }

    private var borderColor: Color {
        if isComplete { return Palette.success }
        if isActive { return Palette.accent }
        if digit != nil { return Palette.accent.opacity(0.45) }
        return Palette.hairline
    }

    private var textColor: Color {
        if isComplete { return Palette.success }
        return Palette.text
    }
}

// MARK: - Submit button

private struct ResetSubmitButton: View {
    let status: ResetPasswordScreen.SubmitStatus
    let enabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Capsule()
                    .fill(enabled ? Palette.accent : Palette.surfaceElev)
                    .shadow(color: enabled ? Palette.accentGlow : .clear, radius: 22, x: 0, y: 10)

                switch status {
                case .idle:
                    HStack(spacing: 10) {
                        Text("Reset & sign in")
                            .font(.system(size: 16, weight: .bold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(enabled ? Palette.accentContrast : Palette.textDim)
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
            .animation(Motion.easeOut, value: enabled)
        }
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
