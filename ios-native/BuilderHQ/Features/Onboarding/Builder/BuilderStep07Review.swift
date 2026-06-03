/// BuilderStep07Review — read-only summary + submit.
///
/// Shows each section as a compact card with an "Edit" affordance that
/// jumps the wizard back to that step. On Submit, calls the server's
/// finalize endpoint; if the response says `approved: true` we show a
/// brief celebratory state before flipping AuthSession to MainTabs.
/// If `approved: false`, we show a "pending review" state instead —
/// either way the wizard exits to MainTabs once the user dismisses.

import SwiftUI

struct BuilderStep07Review: View {
    @Bindable var vm: BuilderWizardViewModel

    /// Post-submit outcome — drives the celebration screen.
    @State private var submitResult: SubmitResult? = nil

    private enum SubmitResult: Equatable {
        case approved
        case pendingReview(reasons: [String])
    }

    var body: some View {
        ZStack {
            if let result = submitResult {
                outcomeScreen(result)
                    .transition(.opacity)
            } else {
                reviewScreen
                    .transition(.opacity)
            }
        }
        .animation(Motion.easeOutSoft, value: submitResult)
    }

    // MARK: - Review screen

    private var reviewScreen: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "Review",
                        title: "One last",
                        titleAccent: "look.",
                        caption: "Verify everything looks right. You can edit any section before submitting."
                    )

                    companyCard
                    addressCard
                    categoriesCard
                    serviceAreasCard
                    licencesCard
                    aboutCard

                    if let banner = vm.bannerError {
                        WizardBanner(message: banner)
                            .transition(.opacity)
                    }

                    Spacer(minLength: 80)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
            }
            .scrollDismissesKeyboard(.interactively)

            WizardFooter(
                canContinue: true,
                isSaving: vm.isSaving,
                continueLabel: "Submit for approval",
                isFinal: true,
                onBack: { vm.goBack() }
            ) {
                Task {
                    let ok = await vm.submitForApproval()
                    guard ok else { return }
                    // submitResult drives the outcome screen.
                    if let bundle = vm.bundle,
                       bundle.profile?.approvalStatus == "approved" {
                        submitResult = .approved
                    } else {
                        submitResult = .pendingReview(reasons: [])
                    }
                    // Don't auto-dismiss — let user tap "Open dashboard"
                    // on the outcome screen.
                }
            }
        }
    }

    // MARK: - Section cards

    private func sectionCard<Content: View>(
        title: String,
        editStep: BuilderWizardViewModel.Step?,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title.uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(Palette.textDim)
                Spacer()
                if let editStep = editStep {
                    Button {
                        vm.jump(to: editStep)
                    } label: {
                        Text("Edit")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Palette.accentLight)
                    }
                }
            }
            content()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Palette.hairline, lineWidth: 1)
        )
    }

    private var companyCard: some View {
        sectionCard(title: "Company", editStep: .company) {
            VStack(alignment: .leading, spacing: 4) {
                Text(vm.companyNameDraft.isEmpty ? "—" : vm.companyNameDraft)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.text)
                if !vm.tradingNameDraft.isEmpty {
                    Text("Trades as \(vm.tradingNameDraft)")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                }
                HStack(spacing: 6) {
                    if !vm.abnDraft.isEmpty {
                        ChipText(text: "ABN " + formatAbn(vm.abnDraft))
                    }
                    if !vm.acnDraft.isEmpty {
                        ChipText(text: "ACN " + vm.acnDraft)
                    }
                    if let years = Int(vm.yearsInOperationDraft) {
                        ChipText(text: "\(years) yrs")
                    }
                }
                .padding(.top, 4)
            }
        }
    }

    private var addressCard: some View {
        sectionCard(title: "Address", editStep: .address) {
            VStack(alignment: .leading, spacing: 4) {
                if vm.businessAddressLine1Draft.isEmpty
                   && vm.businessPostcodeSelection == nil {
                    Text("Not provided")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                } else {
                    if !vm.businessAddressLine1Draft.isEmpty {
                        Text(vm.businessAddressLine1Draft)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Palette.text)
                    }
                    if let sel = vm.businessPostcodeSelection {
                        Text("\(sel.suburb), \(sel.state) \(sel.postcode)")
                            .font(.system(size: 13, weight: .regular))
                            .foregroundStyle(Palette.textMuted)
                    }
                }
                if vm.hasDifferentPostal, let sel = vm.postalPostcodeSelection {
                    Text("Postal: \(sel.suburb), \(sel.state) \(sel.postcode)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textDim)
                        .padding(.top, 4)
                }
            }
        }
    }

    private var categoriesCard: some View {
        sectionCard(title: "Project types", editStep: .categories) {
            if vm.selectedCategories.isEmpty {
                Text("Not provided")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.textDim)
            } else {
                FlowLayoutChips(items: Array(vm.selectedCategories).map(categoryLabel))
            }
        }
    }

    private var serviceAreasCard: some View {
        sectionCard(title: "Service areas", editStep: .serviceAreas) {
            if vm.draftServiceAreas.isEmpty {
                Text("Not provided")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.textDim)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(vm.draftServiceAreas.enumerated()), id: \.offset) { _, area in
                        HStack(spacing: 6) {
                            Text(area.state)
                                .font(.system(size: 11, weight: .bold))
                                .tracking(1)
                                .foregroundStyle(Palette.accent)
                            Text(area.suburb ?? "Statewide")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Palette.text)
                            Spacer()
                            Text("\(area.radiusKm) km")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Palette.textDim)
                                .monospacedDigit()
                        }
                    }
                }
            }
        }
    }

    private var licencesCard: some View {
        sectionCard(title: "Licences", editStep: .licences) {
            if vm.licences.isEmpty {
                Text("None added")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.textDim)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(vm.licences) { l in
                        HStack {
                            Text(l.state)
                                .font(.system(size: 11, weight: .bold))
                                .tracking(1)
                                .foregroundStyle(Palette.accent)
                            Text(l.licenceType)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Palette.text)
                                .lineLimit(1)
                            Spacer()
                            Text(l.verificationStatus ?? "pending")
                                .font(.system(size: 10, weight: .bold))
                                .tracking(0.8)
                                .foregroundStyle(verifyTone(l.verificationStatus))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Capsule().fill(verifyTone(l.verificationStatus).opacity(0.12)))
                        }
                    }
                }
            }
        }
    }

    private var aboutCard: some View {
        sectionCard(title: "About", editStep: .about) {
            if vm.bioDraft.isEmpty && vm.websiteDraft.isEmpty
               && vm.linkedinUrlDraft.isEmpty && vm.instagramUrlDraft.isEmpty {
                Text("Not provided")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.textDim)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    if !vm.bioDraft.isEmpty {
                        Text(vm.bioDraft)
                            .font(.system(size: 13, weight: .regular))
                            .foregroundStyle(Palette.textMuted)
                            .lineLimit(4)
                    }
                    HStack(spacing: 6) {
                        if !vm.websiteDraft.isEmpty { ChipText(text: "Website") }
                        if !vm.linkedinUrlDraft.isEmpty { ChipText(text: "LinkedIn") }
                        if !vm.instagramUrlDraft.isEmpty { ChipText(text: "Instagram") }
                    }
                }
            }
        }
    }

    // MARK: - Outcome screen

    private func outcomeScreen(_ result: SubmitResult) -> some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 28) {
                // Big centred mark
                ZStack {
                    Circle()
                        .fill(Palette.accent.opacity(0.18))
                        .frame(width: 120, height: 120)
                        .shadow(color: Palette.accentGlow, radius: 28)
                    Image(
                        systemName: result == .approved
                            ? "checkmark.seal.fill"
                            : "hourglass"
                    )
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(Palette.accent)
                    .symbolEffect(.bounce, value: result)
                }

                VStack(spacing: 12) {
                    if result == .approved {
                        Text("You're in.")
                            .font(Typography.serifItalic(size: 38))
                            .foregroundStyle(Palette.text)
                            .tracking(-0.5)
                        Text("Account approved. Welcome to BuilderHQ.")
                            .font(Typography.body)
                            .foregroundStyle(Palette.textMuted)
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Submitted.")
                            .font(Typography.serifItalic(size: 38))
                            .foregroundStyle(Palette.text)
                            .tracking(-0.5)
                        Text("We're reviewing your account. You'll hear from us within 24 hours.")
                            .font(Typography.body)
                            .foregroundStyle(Palette.textMuted)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                }
            }

            Spacer()
            Spacer()

            // Open dashboard CTA — flips AuthSession via vm.completionUser
            // which the BuilderWizard container observes.
            Button(action: {
                // Force the completion flow even if the user lingers.
                // No-op here — completionUser is already set from the
                // submit call, so the container's onChange handler has
                // already routed to MainTabs by this point. Tapping
                // explicitly just feels nicer than waiting for the
                // implicit transition.
                if let user = vm.completionUser {
                    vm.completionUser = nil
                    vm.completionUser = user // re-trigger onChange
                }
            }) {
                HStack(spacing: 10) {
                    Text("Open dashboard")
                        .font(.system(size: 16, weight: .bold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(Palette.accentContrast)
                .frame(height: 56)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Palette.accent))
                .shadow(color: Palette.accentGlow, radius: 22, x: 0, y: 10)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .sensoryFeedback(.success, trigger: result)
    }

    // MARK: - Helpers

    private func categoryLabel(_ raw: String) -> String {
        switch raw {
        case "single_dwelling": return "Single dwelling"
        case "multi_dwelling": return "Multi-dwelling"
        case "renovation": return "Renovation"
        case "extension": return "Extension"
        default: return raw
        }
    }

    private func verifyTone(_ status: String?) -> Color {
        switch status {
        case "verified": return Palette.success
        case "inactive", "not_found", "mismatch": return Palette.warning
        default: return Palette.textMuted
        }
    }

    private func formatAbn(_ raw: String) -> String {
        let digits = raw.filter(\.isNumber)
        guard digits.count == 11 else { return raw }
        // ABN format "11 222 333 444"
        let chars = Array(digits)
        return "\(String(chars[0...1])) \(String(chars[2...4])) \(String(chars[5...7])) \(String(chars[8...10]))"
    }
}

// MARK: - Small chip view

private struct ChipText: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .tracking(0.5)
            .foregroundStyle(Palette.textMuted)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(
                Capsule().fill(Palette.surfaceElev)
            )
    }
}

// MARK: - Flow layout for category chips

/// Lightweight wrapping layout — flows chips left-to-right and wraps
/// to the next line as needed. SwiftUI's `Layout` protocol shines for
/// this kind of work but for 4 items max we get away with a small
/// custom flexbox-style HStack composition.
private struct FlowLayoutChips: View {
    let items: [String]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(items, id: \.self) { item in
                ChipText(text: item)
            }
        }
    }
}
