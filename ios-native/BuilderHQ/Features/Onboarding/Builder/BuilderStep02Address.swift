/// BuilderStep02Address — business address (+ optional postal).
///
/// Web wizard treats address fields as recommended-but-not-required.
/// Mobile mirrors that: empty submit is allowed, the user can skip
/// straight through. Most builders do enter a business location
/// because it drives service-area defaults (the slider on step 4).

import SwiftUI

struct BuilderStep02Address: View {
    @Bindable var vm: BuilderWizardViewModel
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case businessLine1, postalLine1 }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "Address",
                        title: "Where do you",
                        titleAccent: "trade from?",
                        caption: "Your registered business address. We pre-fill it from the ABR when we can."
                    )

                    businessAddressSection
                    postalToggle

                    if vm.hasDifferentPostal {
                        postalAddressSection
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
                .animation(Motion.easeOutSoft, value: vm.hasDifferentPostal)
            }
            .scrollDismissesKeyboard(.interactively)
            .contentShape(Rectangle())
            .onTapGesture { focusedField = nil }

            WizardFooter(
                canContinue: true,
                isSaving: vm.isSaving,
                onBack: { vm.goBack() }
            ) {
                Task {
                    let ok = await vm.saveAddressStep()
                    if ok { vm.goForward() }
                }
            }
        }
    }

    private var businessAddressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            WizardSectionLabel(text: "Business address")
            PremiumTextField(
                label: "Street",
                text: $vm.businessAddressLine1Draft,
                textContentType: .streetAddressLine1,
                submitLabel: .done,
                error: vm.fieldErrors["businessAddressLine1"]
            ) {
                focusedField = nil
            }
            .focused($focusedField, equals: .businessLine1)

            PostcodeSuburbField(
                selection: $vm.businessPostcodeSelection,
                error: vm.fieldErrors["businessSuburb"]
                    ?? vm.fieldErrors["businessState"]
                    ?? vm.fieldErrors["businessPostcode"]
            )
        }
    }

    private var postalToggle: some View {
        Press(haptic: .select) {
            vm.hasDifferentPostal.toggle()
        } content: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .strokeBorder(
                            vm.hasDifferentPostal ? Palette.accent : Palette.hairlineStrong,
                            lineWidth: 1.5
                        )
                    if vm.hasDifferentPostal {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Palette.accent)
                    }
                }
                .frame(width: 18, height: 18)
                .animation(Motion.easeOut, value: vm.hasDifferentPostal)

                Text("Postal address is different from my business address")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Palette.text)
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Palette.hairline, lineWidth: 1)
            )
        }
    }

    private var postalAddressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            WizardSectionLabel(text: "Postal address")
            PremiumTextField(
                label: "Street",
                text: $vm.postalAddressLine1Draft,
                textContentType: .streetAddressLine1,
                submitLabel: .done,
                error: vm.fieldErrors["postalAddressLine1"]
            ) {
                focusedField = nil
            }
            .focused($focusedField, equals: .postalLine1)

            PostcodeSuburbField(
                selection: $vm.postalPostcodeSelection,
                error: vm.fieldErrors["postalSuburb"]
                    ?? vm.fieldErrors["postalState"]
                    ?? vm.fieldErrors["postalPostcode"]
            )
        }
    }
}
