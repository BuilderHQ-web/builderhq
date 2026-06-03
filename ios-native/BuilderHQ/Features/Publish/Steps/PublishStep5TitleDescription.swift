/// PublishStep5TitleDescription — the words that sell.
///
/// Two fields, both written into the draft as the user types:
///   · Title (required) — what builders see as the headline. Default
///     suggestions are offered as tappable chips below the field so a
///     user with nothing to type can still publish.
///   · Description (optional) — free-form text up to 2000 chars.
///     Builders read this to decide whether to tender.
///
/// The LivePreviewCard above the wizard updates the title in real-time
/// so the user sees their listing's headline form as they type. Tiny
/// moment of magic.

import SwiftUI

struct PublishStep5TitleDescription: View {
    @Bindable var vm: ProjectPublishViewModel
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case title, description }

    private let descLimit = 2000

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                stepLabel("The pitch")
                Text("A short, scannable title. Builders glance, decide whether to tap.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    titleField
                    suggestionChips
                    descriptionField
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .contentShape(Rectangle())
            .onTapGesture { focusedField = nil }
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var titleField: some View {
        PremiumTextField(
            label: "Title",
            text: $vm.draft.title,
            submitLabel: .next,
            error: nil
        ) {
            focusedField = .description
        }
        .focused($focusedField, equals: .title)
    }

    /// Small smart-suggestion chips that auto-fill the title. Helps
    /// owners who don't know what to write — one tap, done.
    private var suggestionChips: some View {
        let suggestions = titleSuggestions
        guard !suggestions.isEmpty else {
            return AnyView(EmptyView())
        }
        return AnyView(
            VStack(alignment: .leading, spacing: 8) {
                Text("QUICK SUGGESTIONS")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(suggestions, id: \.self) { suggestion in
                            Press(haptic: .tap) {
                                vm.draft.title = suggestion
                            } content: {
                                Text(suggestion)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Palette.text)
                                    .lineLimit(1)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Capsule().fill(Palette.surface))
                                    .overlay(
                                        Capsule().stroke(
                                            Palette.hairline,
                                            lineWidth: 1
                                        )
                                    )
                            }
                        }
                    }
                }
            }
        )
    }

    private var descriptionField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("DESCRIPTION (OPTIONAL)")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(Palette.textDim)
                Spacer()
                Text("\(vm.draft.description.count) / \(descLimit)")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(0.8)
                    .foregroundStyle(
                        vm.draft.description.count > descLimit
                            ? Palette.danger
                            : Palette.textDim
                    )
                    .monospacedDigit()
            }

            ZStack(alignment: .topLeading) {
                if vm.draft.description.isEmpty {
                    Text("What makes this project worth a builder's time? Scope, vision, constraints.")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)
                }
                TextEditor(text: $vm.draft.description)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .scrollContentBackground(.hidden)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .focused($focusedField, equals: .description)
            }
            .frame(minHeight: 140)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        focusedField == .description
                            ? Palette.accent.opacity(0.6)
                            : Palette.hairlineStrong,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: focusedField == .description
                    ? Palette.accentGlow.opacity(0.4)
                    : .clear,
                radius: 12
            )
            .animation(Motion.easeOutSoft, value: focusedField == .description)
        }
    }

    /// Type-aware suggestions — based on what they've already filled in.
    private var titleSuggestions: [String] {
        guard let type = vm.draft.type else { return [] }
        let suburb = vm.draft.location?.suburb
        switch type {
        case "single_dwelling":
            let beds = vm.draft.bedrooms.map { "\($0)-bed" } ?? ""
            let prefix = beds.isEmpty ? "Custom home" : "\(beds) custom home"
            return [
                suburb.map { "\(prefix) in \($0)" } ?? "New single dwelling",
                "Family home build",
                "Custom new build",
            ]
        case "multi_dwelling":
            let n = vm.draft.dwellingCount.map(String.init) ?? "multi"
            return [
                suburb.map { "\(n)-unit project in \($0)" } ?? "\(n)-unit development",
                "Townhouse development",
                "Multi-dwelling build",
            ]
        case "renovation":
            return [
                suburb.map { "Renovation in \($0)" } ?? "Full home renovation",
                "Kitchen + bathroom refresh",
                "Whole-house renovation",
            ]
        case "extension":
            return [
                suburb.map { "Extension in \($0)" } ?? "Home extension",
                "Ground floor extension",
                "Second-storey addition",
            ]
        default:
            return []
        }
    }

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }
}
