/// SignupScreen — the second showcase moment after LoginScreen.
///
/// Layout, top → bottom:
///   1. BUILDERHQ kicker
///   2. Headline ("Create" + Instrument Serif italic "account.")
///   3. Subtitle
///   4. Role picker — role is the first decision; everything else hinges
///      on it, so it lives ABOVE the fields not below
///   5. Name (first + last side-by-side)
///   6. Email
///   7. Password — label above, "10+ characters" hint below
///   8. Submit
///   9. "Already have an account? Sign in"
///
/// Aesthetic targets (in order of priority):
///   · Starlink — austere dark, big breathing room, accent used sparingly
///   · Resend   — clean spacing, every element earns its visual weight
///   · Airbnb   — friendly role pickers but visually quiet
///   · Uber     — confident submit affordance, clear primary action
///
/// Spacing system: 32pt between sections, 12pt within a section.

import SwiftUI

struct SignupScreen: View {
    let onCodeSent: (_ email: String, _ codeExpiresAt: String) -> Void
    let onBackToLogin: () -> Void

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var role: AuthSession.Role = .projectOwner

    @State private var firstNameError: String? = nil
    @State private var lastNameError: String? = nil
    @State private var emailError: String? = nil
    @State private var passwordError: String? = nil
    @State private var bannerError: String? = nil

    @State private var status: SubmitStatus = .idle
    @State private var shakeAmount: CGFloat = 0
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case firstName, lastName, email, password }

    fileprivate enum SubmitStatus {
        case idle
        case submitting
    }

    var body: some View {
        ZStack {
            // Tap-outside-to-dismiss-keyboard.
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture { focusedField = nil }

            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    headerBlock
                    roleSection
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
    }

    // MARK: - Header

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

            // Headline — single concatenated Text so SwiftUI uses ONE
            // line-height across both fragments. Two separate Text views
            // in a VStack produced a visually disjointed double-spaced
            // gap; concat keeps the italic accent kissing the baseline
            // above.
            (
                Text("Create\n")
                    .font(Typography.ui(size: 42, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("account.")
                    .font(Typography.serifItalic(size: 42))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.5)
            .lineSpacing(-4)

            Text("Takes 30 seconds. Verify by code, sign right in.")
                .font(Typography.body)
                .foregroundStyle(Palette.textMuted)
        }
    }

    // MARK: - Role picker (sits ABOVE fields)

    private var roleSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel("I'm here to")
            HStack(spacing: 10) {
                RoleCard(
                    title: "Find a builder",
                    subtitle: "Project owner",
                    systemImage: "house.fill",
                    isSelected: role == .projectOwner
                ) { role = .projectOwner }

                RoleCard(
                    title: "Win projects",
                    subtitle: "Builder",
                    systemImage: "hammer.fill",
                    isSelected: role == .builder
                ) { role = .builder }
            }
        }
    }

    // MARK: - Fields

    private var fieldSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                PremiumTextField(
                    label: "First name",
                    text: $firstName,
                    textContentType: .givenName,
                    submitLabel: .next,
                    error: firstNameError,
                    onSubmit: { focusedField = .lastName }
                )
                .focused($focusedField, equals: .firstName)

                PremiumTextField(
                    label: "Last name",
                    text: $lastName,
                    textContentType: .familyName,
                    submitLabel: .next,
                    error: lastNameError,
                    onSubmit: { focusedField = .email }
                )
                .focused($focusedField, equals: .lastName)
            }

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

            VStack(alignment: .leading, spacing: 6) {
                PremiumTextField(
                    label: "Password",
                    text: $password,
                    // No `textContentType` here — using `.newPassword`
                    // triggers iOS's Automatic Strong Password machinery,
                    // which overlays the field with a generated-password
                    // suggestion the user has to dismiss before they
                    // can type. Skipping the content type lets the user
                    // type immediately; iOS still offers to save the
                    // password via the standard prompt after form submit.
                    isSecure: true,
                    submitLabel: .done,
                    error: passwordError,
                    onSubmit: { focusedField = nil }
                )
                .focused($focusedField, equals: .password)

                // Hint sits below the field, in muted text. Cleaner than
                // baking "10+ chars" into the label / placeholder where
                // it would compete with the floating-label state.
                if passwordError == nil {
                    Text("10 characters or more.")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .padding(.leading, 4)
                }
            }
        }
    }

    // MARK: - Submit

    private var submitButton: some View {
        SignupSubmitButton(status: status) {
            Task { await submit() }
        }
        .disabled(status == .submitting)
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 6) {
            Text("Already have an account?")
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

    // MARK: - Submit logic

    private func submit() async {
        focusedField = nil

        firstNameError = nil
        lastNameError = nil
        emailError = nil
        passwordError = nil
        bannerError = nil

        let trimmedFirst = firstName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedLast = lastName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

        var ok = true
        if trimmedFirst.isEmpty {
            firstNameError = "Required."
            ok = false
        }
        if trimmedLast.isEmpty {
            lastNameError = "Required."
            ok = false
        }
        if trimmedEmail.isEmpty {
            emailError = "Email is required."
            ok = false
        } else if !trimmedEmail.contains("@") || !trimmedEmail.contains(".") {
            emailError = "That doesn't look like an email."
            ok = false
        }
        if password.count < 10 {
            passwordError = "10 characters minimum."
            ok = false
        }
        if !ok {
            await shake()
            return
        }

        status = .submitting

        do {
            let result = try await AuthAPI.signup(
                firstName: trimmedFirst,
                lastName: trimmedLast,
                email: trimmedEmail,
                password: password,
                role: role
            )
            status = .idle
            onCodeSent(result.email, result.codeExpiresAt)
        } catch let error as APIError {
            status = .idle
            switch error {
            case .validation(_, let fieldErrors):
                firstNameError = fieldErrors["firstName"]
                lastNameError = fieldErrors["lastName"]
                emailError = fieldErrors["email"]
                passwordError = fieldErrors["password"]
                if firstNameError == nil, lastNameError == nil,
                   emailError == nil, passwordError == nil {
                    bannerError = error.errorDescription
                }
            case .conflict(let message):
                emailError = " " // accent border without dup text
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
            withAnimation(.linear(duration: 0.05)) {
                shakeAmount = delta
            }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }
}

// MARK: - Section label

/// Small, ALL-CAPS, letter-spaced label that anchors a content block.
/// Used here for "I'm here to" — kept as a reusable view so the verify
/// + login screens can pull from the same well later.
private struct SectionLabel: View {
    let text: String

    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(2.2)
            .foregroundStyle(Palette.textDim)
    }
}

// MARK: - Role picker card

private struct RoleCard: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Press(haptic: .select, action: action) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: systemImage)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(isSelected ? Palette.accent : Palette.textMuted)
                        .symbolEffect(.bounce, value: isSelected)
                    Spacer()
                    // Selected indicator — tiny dot that fills with
                    // accent. Way less heavy than a checkmark icon.
                    Circle()
                        .strokeBorder(
                            isSelected ? Palette.accent : Palette.hairlineStrong,
                            lineWidth: 1.5
                        )
                        .background(
                            Circle()
                                .fill(isSelected ? Palette.accent : .clear)
                                .padding(3)
                        )
                        .frame(width: 16, height: 16)
                        .animation(Motion.easeOut, value: isSelected)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    Text(subtitle)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isSelected ? Palette.accentMuted : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(
                        isSelected ? Palette.accent.opacity(0.7) : Palette.hairline,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: isSelected ? Palette.accentGlow.opacity(0.6) : .clear,
                radius: 18,
                x: 0,
                y: 8
            )
            .animation(Motion.easeOut, value: isSelected)
        }
    }
}

// MARK: - Submit button (idle / loading)

private struct SignupSubmitButton: View {
    let status: SignupScreen.SubmitStatus
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
                        Text("Create account")
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
                }
            }
            .frame(height: 56)
            .frame(maxWidth: .infinity)
            .animation(Motion.easeOut, value: status)
        }
        .sensoryFeedback(.impact(weight: .medium), trigger: status == .submitting)
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
