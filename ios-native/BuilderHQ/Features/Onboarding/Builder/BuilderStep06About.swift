/// BuilderStep06About — public-facing copy + social links.
///
/// All fields optional. The bio (max 2000 chars) is the headline of
/// the public profile page; the URLs surface as small chips beside
/// the company name. Builders can skip this entire step and fill it
/// in later from Settings.

import SwiftUI

struct BuilderStep06About: View {
    @Bindable var vm: BuilderWizardViewModel
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case bio, website, linkedin, instagram }

    private let bioLimit = 2000

    private var bioCount: Int {
        vm.bioDraft.count
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "About",
                        title: "Show owners",
                        titleAccent: "who you are.",
                        caption: "Optional. A short pitch + links go on your public profile when an owner unlocks your contact."
                    )

                    bioField

                    VStack(spacing: 12) {
                        socialField(
                            label: "Website",
                            systemImage: "globe",
                            text: $vm.websiteDraft,
                            placeholder: "yourcompany.com.au",
                            contentType: .URL,
                            field: .website
                        )
                        socialField(
                            label: "LinkedIn",
                            systemImage: "link",
                            text: $vm.linkedinUrlDraft,
                            placeholder: "linkedin.com/in/you",
                            contentType: .URL,
                            field: .linkedin
                        )
                        socialField(
                            label: "Instagram",
                            systemImage: "camera.fill",
                            text: $vm.instagramUrlDraft,
                            placeholder: "instagram.com/yourbuild",
                            contentType: .URL,
                            field: .instagram
                        )
                    }

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
            .contentShape(Rectangle())
            .onTapGesture { focusedField = nil }

            WizardFooter(
                canContinue: bioCount <= bioLimit,
                isSaving: vm.isSaving,
                onBack: { vm.goBack() }
            ) {
                Task {
                    let ok = await vm.saveAboutStep()
                    if ok { vm.goForward() }
                }
            }
        }
    }

    // MARK: - Bio with counter

    private var bioField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                WizardSectionLabel(text: "Bio")
                Spacer()
                Text("\(bioCount) / \(bioLimit)")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(1)
                    .foregroundStyle(bioCount > bioLimit ? Palette.danger : Palette.textDim)
                    .monospacedDigit()
            }

            // Multiline text editor. SwiftUI's TextEditor doesn't style
            // nicely on its own, so we wrap it in our card chrome.
            ZStack(alignment: .topLeading) {
                if vm.bioDraft.isEmpty {
                    Text("Tell owners what you build best. What makes you the right pick.")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)
                }
                TextEditor(text: $vm.bioDraft)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .scrollContentBackground(.hidden)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .focused($focusedField, equals: .bio)
            }
            .frame(minHeight: 160)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(
                        focusedField == .bio
                            ? Palette.accent.opacity(0.6)
                            : Palette.hairlineStrong,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: focusedField == .bio ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: 14
            )
            .animation(Motion.easeOutSoft, value: focusedField == .bio)

            if bioCount > bioLimit {
                Text("Bio is over the \(bioLimit)-character limit.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.danger)
            }
        }
    }

    // MARK: - Social field

    private func socialField(
        label: String,
        systemImage: String,
        text: Binding<String>,
        placeholder: String,
        contentType: UITextContentType?,
        field: Field
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(focusedField == field ? Palette.accent : Palette.textDim)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text(label.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(focusedField == field ? Palette.accentLight : Palette.textDim)

                TextField(placeholder, text: text)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .keyboardType(.URL)
                    .textContentType(contentType)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($focusedField, equals: field)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Palette.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(
                    focusedField == field
                        ? Palette.accent.opacity(0.6)
                        : Palette.hairlineStrong,
                    lineWidth: 1
                )
        )
        .animation(Motion.easeOutSoft, value: focusedField == field)
    }
}
