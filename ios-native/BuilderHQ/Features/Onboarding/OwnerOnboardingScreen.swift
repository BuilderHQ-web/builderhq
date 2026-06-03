/// OwnerOnboardingScreen — project-owner onboarding wizard.
///
/// One scrollable screen with three sections (matches the web's
/// /onboarding/owner page exactly):
///
///   01 — Entity type: 8 cards (homeowner, owner_builder, developer,
///        investor, architect, drafter, project_manager, other).
///        Some entity types reveal an optional company name input.
///   02 — Default location: postcode + suburb autocomplete + state.
///        Optional — pre-fills the project upload form later.
///   03 — Contact preference: email / phone / both, default email.
///
/// On submit, hits POST /api/mobile/profile/owner which upserts +
/// marks onboarding complete in one call, and returns a fresh user
/// with needsOnboarding=false. RootView then routes to MainTabs.

import SwiftUI

struct OwnerOnboardingScreen: View {
    @Environment(AuthSession.self) private var session
    let user: AuthSession.AuthUser

    // MARK: - Form state

    @State private var entityType: EntityType? = nil
    @State private var companyName: String = ""
    @State private var postcodeSelection: PostcodeSuburbField.Selection? = nil
    @State private var contactPref: ContactPref = .email
    @State private var phone: String = ""

    @State private var entityTypeError: String? = nil
    @State private var companyNameError: String? = nil
    @State private var phoneError: String? = nil
    @State private var bannerError: String? = nil

    @State private var status: SubmitStatus = .idle

    enum EntityType: String, CaseIterable {
        case homeowner
        case ownerBuilder = "owner_builder"
        case developer
        case investor
        case architect
        case drafter
        case projectManager = "project_manager"
        case other

        var label: String {
            switch self {
            case .homeowner: return "Homeowner"
            case .ownerBuilder: return "Owner-builder"
            case .developer: return "Developer"
            case .investor: return "Investor"
            case .architect: return "Architect"
            case .drafter: return "Drafter"
            case .projectManager: return "Project manager"
            case .other: return "Other"
            }
        }

        var caption: String {
            switch self {
            case .homeowner: return "Building or renovating my home"
            case .ownerBuilder: return "Managing my own build"
            case .developer: return "Multi-unit / townhouse"
            case .investor: return "Investment property"
            case .architect: return "On behalf of a client"
            case .drafter: return "On behalf of a client"
            case .projectManager: return "Managing residential builds"
            case .other: return "Something else"
            }
        }

        var systemImage: String {
            switch self {
            case .homeowner: return "house.fill"
            case .ownerBuilder: return "hammer.fill"
            case .developer: return "building.2.fill"
            case .investor: return "chart.line.uptrend.xyaxis"
            case .architect: return "ruler.fill"
            case .drafter: return "pencil.and.ruler.fill"
            case .projectManager: return "checklist"
            case .other: return "ellipsis.circle.fill"
            }
        }

        /// Mirrors the web's `hasCompany` flag — these entity types
        /// reveal an optional company-name field.
        var showsCompany: Bool {
            switch self {
            case .developer, .investor, .architect, .drafter, .projectManager:
                return true
            default:
                return false
            }
        }
    }

    enum ContactPref: String, CaseIterable {
        case email
        case phone
        case both

        var label: String {
            switch self {
            case .email: return "Email"
            case .phone: return "Phone"
            case .both: return "Both"
            }
        }

        var caption: String {
            switch self {
            case .email: return "Updates by email"
            case .phone: return "Builders may call"
            case .both: return "Either is fine"
            }
        }

        var systemImage: String {
            switch self {
            case .email: return "envelope.fill"
            case .phone: return "phone.fill"
            case .both: return "tray.fill"
            }
        }
    }

    fileprivate enum SubmitStatus {
        case idle
        case submitting
        case success
    }

    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 36) {
                    headerBlock
                    entitySection
                    locationSection
                    contactSection

                    if let banner = bannerError {
                        BannerError(message: banner)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    submitButton
                    footerNote
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)
            .disabled(status == .submitting || status == .success)
        }
    }

    // MARK: - Header

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 10) {
                Circle()
                    .fill(Palette.accent)
                    .frame(width: 6, height: 6)
                    .shadow(color: Palette.accentGlow, radius: 6)
                Text("LET'S SET UP")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(2.4)
                    .foregroundStyle(Palette.accent)
            }

            (
                Text("A few quick\n")
                    .font(Typography.ui(size: 40, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text("questions.")
                    .font(Typography.serifItalic(size: 40))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.5)
            .lineSpacing(-4)

            Text(
                "Hi \(firstName) — tell us a bit about your projects so the dashboard fits the way you build."
            )
            .font(Typography.body)
            .foregroundStyle(Palette.textMuted)
        }
    }

    private var firstName: String {
        user.name?
            .split(separator: " ")
            .first
            .map(String.init) ?? "there"
    }

    // MARK: - Section 01 — Entity type

    private var entitySection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(index: "01", title: "What kind of project are you running?")

            // 2-column grid of entity cards. 8 options → 4 rows on phone.
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10),
                ],
                spacing: 10
            ) {
                ForEach(EntityType.allCases, id: \.self) { type in
                    EntityCard(
                        type: type,
                        isSelected: entityType == type
                    ) {
                        entityType = type
                        entityTypeError = nil
                    }
                }
            }

            if let err = entityTypeError {
                FieldError(text: err)
            }

            // Company name reveal — animates in for relevant entity types.
            if entityType?.showsCompany == true {
                PremiumTextField(
                    label: "Company name",
                    text: $companyName,
                    textContentType: .organizationName,
                    submitLabel: .done,
                    error: companyNameError
                )
                .transition(
                    .opacity.combined(with: .move(edge: .top))
                )
                .padding(.top, 6)
            }
        }
        .animation(Motion.easeOutSoft, value: entityType?.showsCompany == true)
    }

    // MARK: - Section 02 — Location

    private var locationSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(
                index: "02",
                title: "Where are your projects based?",
                caption: "Optional — pre-fills the project upload form so you don't re-type your area."
            )
            PostcodeSuburbField(selection: $postcodeSelection)
        }
    }

    // MARK: - Section 03 — Contact preference

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(
                index: "03",
                title: "How should builders reach you?",
                caption: "You can change this any time in Settings."
            )
            HStack(spacing: 10) {
                ForEach(ContactPref.allCases, id: \.self) { pref in
                    ContactCard(
                        pref: pref,
                        isSelected: contactPref == pref
                    ) {
                        contactPref = pref
                    }
                }
            }

            // Phone number — required. Sits right under the contact
            // preference so it reads as the natural completion of
            // "here's how to reach me", not a separate ask.
            VStack(alignment: .leading, spacing: 8) {
                Text("YOUR CONTACT NUMBER")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
                AuPhoneField(
                    text: $phone,
                    serverError: phoneError
                )
                Text("Shared with builders only after they unlock your project.")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 4)
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Submit

    private var submitButton: some View {
        OnboardingSubmitButton(
            status: status,
            enabled: canSubmit
        ) {
            Task { await submit() }
        }
        .disabled(
            status == .submitting || status == .success || !canSubmit
        )
    }

    /// Entity type chosen AND a valid AU phone entered. The phone gate
    /// here matches the server's requirement so the button never
    /// promises a submit that'll bounce on validation.
    private var canSubmit: Bool {
        entityType != nil && AuPhone.isValid(phone)
    }

    private var footerNote: some View {
        Text("You can update everything later in Settings.")
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(Palette.textDim)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.top, 4)
    }

    // MARK: - Submit logic

    private func submit() async {
        entityTypeError = nil
        companyNameError = nil
        phoneError = nil
        bannerError = nil

        guard let entityType = entityType else {
            entityTypeError = "Pick the option that fits best."
            return
        }

        // Normalize the phone client-side so we send E.164. The button
        // is already gated on validity, but guard anyway.
        guard let phoneE164 = AuPhone.normalise(phone) else {
            phoneError = "Enter a valid AU mobile or landline."
            return
        }

        // Server is the source of truth for whether companyName is
        // required (currently optional everywhere). Client just trims
        // and forwards.
        let trimmedCompany = companyName.trimmingCharacters(
            in: .whitespacesAndNewlines
        )

        status = .submitting

        do {
            let user = try await AuthAPI.completeOwnerOnboarding(
                entityType: entityType.rawValue,
                companyName: trimmedCompany.isEmpty ? nil : trimmedCompany,
                defaultPostcode: postcodeSelection?.postcode,
                defaultSuburb: postcodeSelection?.suburb,
                defaultState: postcodeSelection?.state,
                contactPref: contactPref.rawValue,
                phone: phoneE164
            )
            status = .success
            // Brief beat so the checkmark animation lands before the
            // tree swaps to MainTabs.
            try? await Task.sleep(for: .milliseconds(360))
            session.didCompleteOnboarding(user: user)
        } catch let error as APIError {
            status = .idle
            switch error {
            case .validation(_, let fieldErrors):
                entityTypeError = fieldErrors["entityType"]
                companyNameError = fieldErrors["companyName"]
                phoneError = fieldErrors["phone"]
                if entityTypeError == nil && companyNameError == nil
                    && phoneError == nil {
                    bannerError = error.errorDescription
                }
            default:
                bannerError = error.errorDescription
            }
        } catch {
            status = .idle
            bannerError = "Something went wrong. Try again in a moment."
        }
    }
}

// MARK: - Section header

private struct SectionHeader: View {
    let index: String
    let title: String
    var caption: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(index)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Palette.accent)
                Text(title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .tracking(-0.2)
            }
            if let caption = caption {
                Text(caption)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 28)
            }
        }
    }
}

// MARK: - Entity card

private struct EntityCard: View {
    let type: OwnerOnboardingScreen.EntityType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Press(haptic: .select, action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: type.systemImage)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(isSelected ? Palette.accent : Palette.textMuted)
                        .symbolEffect(.bounce, value: isSelected)
                    Spacer()
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
                        .frame(width: 14, height: 14)
                        .animation(Motion.easeOut, value: isSelected)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(type.label)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    Text(type.caption)
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 90, alignment: .topLeading)
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(isSelected ? Palette.accentMuted : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(
                        isSelected ? Palette.accent.opacity(0.7) : Palette.hairline,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: isSelected ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: 14,
                x: 0,
                y: 6
            )
            .animation(Motion.easeOut, value: isSelected)
        }
    }
}

// MARK: - Contact card

private struct ContactCard: View {
    let pref: OwnerOnboardingScreen.ContactPref
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Press(haptic: .select, action: action) {
            VStack(spacing: 8) {
                Image(systemName: pref.systemImage)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(isSelected ? Palette.accent : Palette.textMuted)
                    .symbolEffect(.bounce, value: isSelected)
                Text(pref.label)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.text)
                Text(pref.caption)
                    .font(.system(size: 10, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 88)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(isSelected ? Palette.accentMuted : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(
                        isSelected ? Palette.accent.opacity(0.7) : Palette.hairline,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: isSelected ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: 14,
                x: 0,
                y: 6
            )
            .animation(Motion.easeOut, value: isSelected)
        }
    }
}

// MARK: - Field error

private struct FieldError: View {
    let text: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 12))
                .foregroundStyle(Palette.danger)
            Text(text)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Palette.danger)
        }
        .padding(.leading, 4)
    }
}

// MARK: - Submit button

private struct OnboardingSubmitButton: View {
    let status: OwnerOnboardingScreen.SubmitStatus
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
                        Text("Continue to dashboard")
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
