/// PublishStep1Type — pick the project type.
///
/// 2×2 grid of BigChoiceCard. Tapping a card immediately writes to the
/// draft and triggers an auto-advance after a short bounce delay so
/// the LivePreviewCard above has a moment to populate visibly before
/// the next step takes over.
///
/// First impression of the wizard — the speed of this interaction
/// (tap → see card morph → swipe forward) sets the tone for the
/// whole flow.

import SwiftUI

struct PublishStep1Type: View {
    @Bindable var vm: ProjectPublishViewModel

    private struct Option {
        let value: String
        let icon: String
        let title: String
        let subtitle: String
    }

    private let options: [Option] = [
        .init(
            value: "single_dwelling",
            icon: "house.fill",
            title: "Single dwelling",
            subtitle: "Building one home"
        ),
        .init(
            value: "multi_dwelling",
            icon: "building.2.fill",
            title: "Multi-dwelling",
            subtitle: "Townhouses, duplex, units"
        ),
        .init(
            value: "renovation",
            icon: "paintbrush.fill",
            title: "Renovation",
            subtitle: "Kitchen, bathroom, full"
        ),
        .init(
            value: "extension",
            icon: "rectangle.expand.vertical",
            title: "Extension",
            subtitle: "Adding to existing home"
        ),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            stepLabel("What are you building?")

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                ],
                spacing: 12
            ) {
                ForEach(options, id: \.value) { opt in
                    BigChoiceCard(
                        icon: opt.icon,
                        title: opt.title,
                        subtitle: opt.subtitle,
                        isSelected: vm.draft.type == opt.value
                    ) {
                        select(opt)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func select(_ option: Option) {
        vm.draft.type = option.value

        // Auto-advance after the LivePreviewCard above has had time
        // to animate the type chip + gradient morph. Slight delay
        // makes the transition feel deliberate, not jarring.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            // Only advance if the user hasn't tapped a different option
            // in the meantime.
            if vm.draft.type == option.value && vm.step == .type {
                vm.goForward()
            }
        }
    }

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }
}
