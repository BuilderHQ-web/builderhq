/// BuilderStep01Company — ABN-first company step.
///
/// Composition:
///   1. WizardHeader (01 / COMPANY · "Start with\nyour ABN.")
///   2. ABN field + Verify button
///   3. Outcome card (idle / verifying / verified / failed)
///   4. Reveal of follow-up fields (trading name, ACN, years, legal
///      entity name) once we know the verify state. We keep the legal
///      entity name editable only when verify FAILS — when verified,
///      it's locked to whatever ABR returned.
///   5. WizardFooter — Continue saves the patched profile and advances
///
/// The premium moment here is the verify outcome card: a smooth slide-
/// in with the resolved legal entity name + business location chips,
/// confirming the ABR check landed in one round-trip.

import SwiftUI

struct BuilderStep01Company: View {
    @Bindable var vm: BuilderWizardViewModel
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case abn, tradingName, acn, years, companyName, phone }

    /// True after the user has either verified the ABN OR explicitly
    /// chose "Skip for now" on a failed verify. Both paths leave the
    /// follow-up fields onscreen even if abnVerifyState later resets.
    @State private var manualMode = false

    /// Reveal follow-up fields the moment the verify call resolves —
    /// success OR failure. On failure the user can keep editing the
    /// ABN to retry OR just type their entity name manually without an
    /// extra tap. Idle state only reveals when manualMode was set
    /// explicitly via "Skip for now".
    private var revealFollowUp: Bool {
        switch vm.abnVerifyState {
        case .verified, .failed: return true
        case .verifying: return false
        case .idle: return manualMode
        }
    }

    /// Digits-only view of the ABN draft. Defensive against pasted
    /// content with spaces/dashes/letters — strips everything that
    /// isn't a digit before counting.
    private var cleanedAbn: String {
        vm.abnDraft.filter(\.isNumber)
    }

    /// True when the ABN is exactly 11 digits — the only valid length.
    /// Drives the Verify button's enabled state.
    private var abnIsComplete: Bool {
        cleanedAbn.count == 11
    }

    /// Continue requires a company name. The ABN can be EITHER
    /// completely empty (user skipped) OR exactly 11 digits — anything
    /// in-between (partial typing) blocks Continue.
    private var canContinue: Bool {
        let nameOk = !vm.companyNameDraft
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .isEmpty
        let abnOk = cleanedAbn.isEmpty || cleanedAbn.count == 11
        let phoneOk = AuPhone.isValid(vm.phoneDraft)
        return nameOk && abnOk && phoneOk
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "Company",
                        title: "Start with",
                        titleAccent: "your ABN.",
                        caption: "We'll look you up on the ABR and pre-fill the rest. Takes a second."
                    )

                    abnBlock

                    if revealFollowUp {
                        followUpFields
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    if let banner = vm.bannerError {
                        WizardBanner(message: banner)
                            .transition(.opacity)
                    }

                    Spacer(minLength: 80)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .animation(Motion.easeOutSoft, value: revealFollowUp)
                .animation(Motion.easeOutSoft, value: vm.abnVerifyState)
            }
            .scrollDismissesKeyboard(.interactively)
            .contentShape(Rectangle())
            .onTapGesture { focusedField = nil }

            WizardFooter(
                canContinue: canContinue,
                isSaving: vm.isSaving,
                onBack: nil
            ) {
                Task {
                    let ok = await vm.saveCompanyStep()
                    if ok { vm.goForward() }
                }
            }
        }
    }

    // MARK: - ABN field + verify

    @ViewBuilder
    private var abnBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                PremiumTextField(
                    label: "ABN",
                    text: $vm.abnDraft,
                    keyboardType: .numberPad,
                    submitLabel: .done,
                    error: vm.fieldErrors["abn"]
                ) {
                    focusedField = nil
                }
                .focused($focusedField, equals: .abn)
                .disabled(isAbnLocked)
                .overlay(alignment: .bottomLeading) {
                    // Digit progress hint below the field — appears only
                    // while the user is mid-typing. Confirms exactly how
                    // many of the 11 digits have landed.
                    if !cleanedAbn.isEmpty && !abnIsComplete && !isAbnLocked {
                        Text("\(cleanedAbn.count) / 11 digits")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(Palette.textDim)
                            .padding(.leading, 4)
                            .offset(y: 22)
                            .transition(.opacity)
                    }
                }

                verifyButton
            }
            .animation(Motion.easeOutSoft, value: cleanedAbn.count)

            outcomeCard
        }
    }

    @ViewBuilder
    private var verifyButton: some View {
        // Three distinct visual states so the affordance reads cleanly:
        //   · disabled  → ghost outline, no fill, no glow
        //   · enabled   → filled accent + glow
        //   · verifying → filled accent + spinner
        //   · verified  → ghost gray (locked) — can't re-verify
        let canTap = abnIsComplete && !isAbnLocked && !isVerifying

        Press(haptic: .tap) {
            guard canTap else { return }
            Task { await vm.runAbnVerify() }
        } content: {
            HStack(spacing: 6) {
                if isVerifying {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(Palette.accentContrast)
                        .scaleEffect(0.8)
                } else if isAbnLocked {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 13, weight: .bold))
                    Text("Locked")
                        .font(.system(size: 14, weight: .bold))
                } else {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 14, weight: .bold))
                    Text("Verify")
                        .font(.system(size: 14, weight: .bold))
                }
            }
            .foregroundStyle(verifyButtonForeground(canTap: canTap))
            .padding(.horizontal, 16)
            .frame(height: 52)
            .background(
                Capsule().fill(verifyButtonFill(canTap: canTap))
            )
            .overlay(
                Capsule().stroke(
                    canTap || isVerifying
                        ? Color.clear
                        : Palette.hairlineStrong,
                    lineWidth: 1
                )
            )
            .shadow(
                color: canTap ? Palette.accentGlow : .clear,
                radius: 14,
                x: 0,
                y: 6
            )
        }
        .disabled(!canTap)
        .animation(Motion.easeOut, value: canTap)
        .animation(Motion.easeOut, value: isVerifying)
        .animation(Motion.easeOut, value: isAbnLocked)
    }

    private var isAbnLocked: Bool {
        if case .verified = vm.abnVerifyState { return true }
        return false
    }

    private var isVerifying: Bool {
        if case .verifying = vm.abnVerifyState { return true }
        return false
    }

    /// Fill colour for the verify button. Filled accent only when
    /// genuinely tappable; otherwise a flat surface so the disabled
    /// state reads as "no, you can't tap this yet".
    private func verifyButtonFill(canTap: Bool) -> Color {
        if isAbnLocked { return Palette.surfaceElev }
        if canTap || isVerifying { return Palette.accent }
        return Palette.surface
    }

    private func verifyButtonForeground(canTap: Bool) -> Color {
        if isAbnLocked { return Palette.textDim }
        if canTap || isVerifying { return Palette.accentContrast }
        return Palette.textDim
    }

    @ViewBuilder
    private var outcomeCard: some View {
        switch vm.abnVerifyState {
        case .idle:
            EmptyView()

        case .verifying:
            EmptyView() // spinner is in the button

        case .verified(let matchedName):
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Palette.accent)
                    Text("VERIFIED")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(2)
                        .foregroundStyle(Palette.accent)
                }
                Text(matchedName)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.text)
                Text("ABN locked. We'll show this name on your public profile.")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Palette.textDim)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Palette.accentMuted)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Palette.accent.opacity(0.35), lineWidth: 1)
            )
            .transition(.opacity.combined(with: .move(edge: .top)))

        case .failed(let reason):
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.warning)
                    Text("COULDN'T VERIFY")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(2)
                        .foregroundStyle(Palette.warning)
                }
                Text(reason)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)

                HStack(spacing: 16) {
                    Press(haptic: .tap) {
                        // Clear the bogus ABN so it's not silently
                        // re-sent on Continue. User can either type a
                        // new ABN + retry verify, or proceed with no
                        // ABN at all (schema allows null).
                        vm.abnDraft = ""
                        vm.abnVerifyState = .idle
                    } content: {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 11, weight: .bold))
                            Text("Try a different ABN")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(Palette.accentLight)
                    }
                    Spacer()
                    Press(haptic: .tap) {
                        // Skip ABN entirely. Clear it so the upsert
                        // sends null, not the bogus value.
                        vm.abnDraft = ""
                        vm.abnVerifyState = .idle
                        manualMode = true
                    } content: {
                        HStack(spacing: 6) {
                            Text("Skip for now")
                                .font(.system(size: 13, weight: .semibold))
                            Image(systemName: "arrow.right")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(Palette.textMuted)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Palette.warning.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Palette.warning.opacity(0.35), lineWidth: 1)
            )
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }

    // MARK: - Follow-up fields

    @ViewBuilder
    private var followUpFields: some View {
        VStack(alignment: .leading, spacing: 14) {
            WizardSectionLabel(text: "Business details")

            // Legal entity name — locked when verified; editable otherwise.
            PremiumTextField(
                label: isAbnLocked ? "Legal entity name (from ABR)" : "Legal entity name",
                text: $vm.companyNameDraft,
                textContentType: .organizationName,
                submitLabel: .next,
                error: vm.fieldErrors["companyName"]
            ) {
                focusedField = .tradingName
            }
            .focused($focusedField, equals: .companyName)
            .disabled(isAbnLocked)
            .opacity(isAbnLocked ? 0.7 : 1)

            PremiumTextField(
                label: "Trading name (optional)",
                text: $vm.tradingNameDraft,
                textContentType: .organizationName,
                submitLabel: .next,
                error: vm.fieldErrors["tradingName"]
            ) {
                focusedField = .acn
            }
            .focused($focusedField, equals: .tradingName)

            HStack(spacing: 12) {
                PremiumTextField(
                    label: "ACN (optional)",
                    text: $vm.acnDraft,
                    keyboardType: .numberPad,
                    submitLabel: .next,
                    error: vm.fieldErrors["acn"]
                ) {
                    focusedField = .years
                }
                .focused($focusedField, equals: .acn)

                PremiumTextField(
                    label: "Years",
                    text: $vm.yearsInOperationDraft,
                    keyboardType: .numberPad,
                    submitLabel: .done,
                    error: vm.fieldErrors["yearsInOperation"]
                ) {
                    focusedField = nil
                }
                .focused($focusedField, equals: .years)
            }

            // Contact phone — required. Clients + the BuilderHQ team
            // reach you here. Reads as a natural part of "your business
            // details" rather than a separate gate.
            VStack(alignment: .leading, spacing: 8) {
                WizardSectionLabel(text: "Contact phone")
                AuPhoneField(
                    text: $vm.phoneDraft,
                    serverError: vm.fieldErrors["phone"]
                ) {
                    focusedField = nil
                }
                Text("Used for tender coordination and account verification.")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.leading, 4)
            }
            .padding(.top, 4)
        }
    }
}
