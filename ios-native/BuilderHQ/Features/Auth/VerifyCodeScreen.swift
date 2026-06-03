/// VerifyCodeScreen — the OTP entry screen.
///
/// Composition:
///   · `BUILDERHQ` kicker
///   · "Check your" + Instrument Serif italic "inbox."
///   · "We sent a 6-digit code to {email}."
///   · Six glowing slot boxes that render the typed digits
///   · Resend with a live cooldown timer (60s after each resend)
///   · "Use a different email" → bounces back to signup
///
/// Behaviour:
///   · Numeric keypad is the only input — a single hidden TextField
///     drives the visible slots, so paste-from-clipboard "just works"
///   · Auto-submits when the 6th digit lands
///   · Wrong code → shake + clear + refocus
///   · Success → checkmark bounce on every slot, 280ms beat, then
///     onVerified() flips AuthSession to signedIn
///
/// The countdown clamps to "code expired" when codeExpiresAt passes —
/// the resend control is what they tap then.

import SwiftUI

struct VerifyCodeScreen: View {
    /// Pre-filled from the prior SignupScreen submit.
    let email: String
    /// ISO-8601 timestamp from /signup or /resend-code. Drives the
    /// "expires in 14:53" copy below the slots.
    let codeExpiresAtISO: String
    /// Called after the verify endpoint returns user + tokens. AuthFlow
    /// hands this to AuthSession.didSignIn(user:).
    let onVerified: (AuthSession.AuthUser) -> Void
    /// Tapped "Use a different email" in the footer.
    let onChangeEmail: () -> Void

    @State private var code = ""
    @State private var status: SubmitStatus = .idle
    @State private var bannerError: String? = nil
    @State private var shakeAmount: CGFloat = 0

    /// Drives the "expires in MM:SS" countdown.
    @State private var now: Date = .now
    @State private var codeExpiresAt: Date = .now

    /// Drives the resend cooldown timer (60s after each resend).
    @State private var resendAvailableAt: Date = .now
    @State private var isResending: Bool = false

    @FocusState private var isCodeFocused: Bool

    fileprivate enum SubmitStatus {
        case idle
        case submitting
        case success
    }

    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    headerBlock
                    slotsBlock
                        .offset(x: shakeAmount)
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
            // Seed timers from the prop, then focus the keypad.
            codeExpiresAt = parseDate(codeExpiresAtISO) ?? Date()
            isCodeFocused = true
        }
        // Tick every second to update the countdown display. The .common
        // run-loop mode keeps it ticking during ScrollView interaction.
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) {
            now = $0
        }
    }

    // MARK: - Sections

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 18) {
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

            // Single-Text concat keeps both lines at one line-height.
            (
                Text("Check your\n")
                    .font(Typography.ui(size: 42, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("inbox.")
                    .font(Typography.serifItalic(size: 42))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.5)
            .lineSpacing(-4)

            (
                Text("We sent a 6-digit code to ")
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
                        isActive: index == code.count && isCodeFocused,
                        isComplete: status == .success
                    )
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { isCodeFocused = true }
            .overlay {
                // Invisible text field that owns the keyboard. Paste +
                // iOS SMS autofill both flow through this binding.
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .focused($isCodeFocused)
                    .opacity(0.001)
                    .allowsHitTesting(false)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .onChange(of: code) { _, newValue in
                handleCodeChange(newValue)
            }

            // Expiry / resend row
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

    private var submitButton: some View {
        VerifySubmitButton(
            status: status,
            enabled: code.count == 6 && !codeIsExpired
        ) {
            Task { await submit() }
        }
        .disabled(
            status == .submitting || status == .success
                || code.count < 6 || codeIsExpired
        )
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

    // MARK: - Resend control

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

    // MARK: - Derived UI state

    private func digit(at index: Int) -> Character? {
        guard index < code.count else { return nil }
        return code[code.index(code.startIndex, offsetBy: index)]
    }

    private var codeIsExpired: Bool {
        codeExpiresAt <= now
    }

    private var formattedRemaining: String {
        let remaining = max(0, Int(codeExpiresAt.timeIntervalSince(now)))
        return String(format: "%d:%02d", remaining / 60, remaining % 60)
    }

    private var resendIsCoolingDown: Bool {
        resendAvailableAt > now
    }

    private var resendCooldownSeconds: Int {
        max(0, Int(resendAvailableAt.timeIntervalSince(now)))
    }

    // MARK: - Code editing

    private func handleCodeChange(_ raw: String) {
        // Strip non-digits + cap to 6. Filtering inside onChange keeps
        // the displayed value pristine even if the user pastes
        // "123-456" or similar formatting.
        let cleaned = raw.filter { $0.isNumber }.prefix(6)
        if cleaned.count != raw.count {
            code = String(cleaned)
            return
        }
        if cleaned.count == 6 {
            Task { await submit() }
        }
    }

    // MARK: - Submit

    private func submit() async {
        guard code.count == 6, status == .idle else { return }
        bannerError = nil
        isCodeFocused = false
        status = .submitting

        do {
            let user = try await AuthAPI.verifyCode(email: email, code: code)
            status = .success
            // Brief beat so the user sees the checkmark bounce before
            // the tree swaps to MainTabs.
            try? await Task.sleep(for: .milliseconds(360))
            onVerified(user)
        } catch let error as APIError {
            status = .idle
            switch error {
            case .unauthorized:
                bannerError = "That code is invalid or has expired."
            case .validation(let message, _):
                bannerError = message
            default:
                bannerError = error.errorDescription
            }
            // Clear + refocus so the next attempt is friction-free.
            code = ""
            await shake()
            isCodeFocused = true
        } catch {
            status = .idle
            bannerError = "Something went wrong. Try again in a moment."
            code = ""
            await shake()
            isCodeFocused = true
        }
    }

    private func resend() async {
        bannerError = nil
        isResending = true
        defer { isResending = false }
        do {
            let result = try await AuthAPI.resendCode(email: email)
            if result.throttled {
                // Server-side throttle (60s). Reflect that locally so
                // the timer counts down accurately.
                resendAvailableAt = Date().addingTimeInterval(60)
                bannerError = "Hold on a moment — try again in 60 seconds."
                return
            }
            if let iso = result.codeExpiresAt,
               let parsed = parseDate(iso) {
                codeExpiresAt = parsed
            }
            code = ""
            // Local 60s cooldown matches the server-side throttle so we
            // never let the user spam the button before the server
            // would accept another resend anyway.
            resendAvailableAt = Date().addingTimeInterval(60)
            isCodeFocused = true
        } catch let error as APIError {
            bannerError = error.errorDescription
        } catch {
            bannerError = "Couldn't resend the code. Try again in a moment."
        }
    }

    private func shake() async {
        for delta in [10.0, -10.0, 8.0, -8.0, 4.0, -4.0, 0.0] {
            withAnimation(.linear(duration: 0.05)) {
                shakeAmount = delta
            }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    // MARK: - Date parsing

    /// Tolerates both fractional and plain ISO-8601 — matches the
    /// flexibility in APIClient's decoder.
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
        .shadow(
            color: isActive ? Palette.accentGlow : .clear,
            radius: 18,
            x: 0,
            y: 6
        )
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

private struct VerifySubmitButton: View {
    let status: VerifyCodeScreen.SubmitStatus
    let enabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Capsule()
                    .fill(enabled ? Palette.accent : Palette.surfaceElev)
                    .shadow(
                        color: enabled ? Palette.accentGlow : .clear,
                        radius: 22,
                        x: 0,
                        y: 10
                    )

                switch status {
                case .idle:
                    HStack(spacing: 10) {
                        Text("Verify")
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
