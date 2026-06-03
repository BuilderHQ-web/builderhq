/// PublishStep2Location — where the build is happening.
///
/// Two fields, both required to advance:
///   · Postcode + suburb (PostcodeSuburbField, auto-resolves)
///   · Street address line — kept PRIVATE until a builder unlocks
///     the project. We surface the privacy promise prominently so
///     owners don't worry their exact address goes public the
///     moment they publish.
///
/// The viewmodel's canContinueFromCurrentStep now requires BOTH the
/// resolved suburb AND a non-empty street address.

import SwiftUI

struct PublishStep2Location: View {
    @Bindable var vm: ProjectPublishViewModel
    @FocusState private var streetFocused: Bool

    @State private var postcodeSelection: PostcodeSuburbField.Selection? = nil
    @State private var addressLine1: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    stepLabel("Where is it?")
                    Text("Builders within range of this suburb get matched.")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                }

                PostcodeSuburbField(selection: $postcodeSelection)
                    .onChange(of: postcodeSelection) { _, newValue in
                        syncToDraft(selection: newValue, address: addressLine1)
                    }

                if postcodeSelection != nil {
                    addressField
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .animation(Motion.easeOutSoft, value: postcodeSelection)
        .onAppear { seedFromDraft() }
    }

    private var addressField: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Privacy promise card — addresses the #1 concern owners
            // have about publishing their build address publicly.
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                    .padding(.top, 1)
                VStack(alignment: .leading, spacing: 2) {
                    Text("KEPT PRIVATE")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1.4)
                        .foregroundStyle(Palette.accent)
                    Text("Your street address stays private until a builder unlocks your project — only then is it shared with them.")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Palette.accentMuted)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Palette.accent.opacity(0.35), lineWidth: 1)
            )

            HStack(spacing: 12) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(streetFocused ? Palette.accent : Palette.textDim)
                VStack(alignment: .leading, spacing: 2) {
                    Text("STREET ADDRESS")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1.4)
                        .foregroundStyle(
                            streetFocused
                                ? Palette.accentLight
                                : Palette.textDim
                        )
                    TextField("12 Smith Street", text: $addressLine1)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Palette.text)
                        .tint(Palette.accent)
                        .focused($streetFocused)
                        .textContentType(.streetAddressLine1)
                        .submitLabel(.done)
                        .onSubmit { streetFocused = false }
                        .onChange(of: addressLine1) { _, newValue in
                            syncToDraft(
                                selection: postcodeSelection,
                                address: newValue
                            )
                        }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        streetFocused
                            ? Palette.accent.opacity(0.6)
                            : Palette.hairlineStrong,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: streetFocused
                    ? Palette.accentGlow.opacity(0.4)
                    : .clear,
                radius: 12
            )
            .animation(Motion.easeOutSoft, value: streetFocused)
        }
    }

    private func seedFromDraft() {
        if let loc = vm.draft.location {
            postcodeSelection = .init(
                postcode: loc.postcode,
                suburb: loc.suburb,
                state: loc.state
            )
            addressLine1 = loc.addressLine1
        }
    }

    private func syncToDraft(
        selection: PostcodeSuburbField.Selection?,
        address: String
    ) {
        if let sel = selection {
            vm.draft.location = ProjectDraft.Location(
                addressLine1: address,
                postcode: sel.postcode,
                suburb: sel.suburb,
                state: sel.state
            )
        } else {
            vm.draft.location = nil
        }
    }

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }
}
