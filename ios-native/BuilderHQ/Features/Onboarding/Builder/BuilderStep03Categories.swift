/// BuilderStep03Categories — pick the project types you take on.
///
/// 4 options sourced from the `project_type` enum on the server:
///   · single_dwelling
///   · multi_dwelling
///   · renovation
///   · extension
///
/// Min 1 to advance. The visual is a 2-column grid of soft tiles that
/// snap to the accent on select with a subtle SF Symbol bounce.

import SwiftUI

struct BuilderStep03Categories: View {
    @Bindable var vm: BuilderWizardViewModel

    private struct Option {
        let value: String
        let label: String
        let caption: String
        let systemImage: String
    }

    private let options: [Option] = [
        .init(
            value: "single_dwelling",
            label: "Single dwelling",
            caption: "Standalone homes — new builds + custom",
            systemImage: "house.fill"
        ),
        .init(
            value: "multi_dwelling",
            label: "Multi-dwelling",
            caption: "Townhouses, duplexes, multi-unit",
            systemImage: "building.2.fill"
        ),
        .init(
            value: "renovation",
            label: "Renovation",
            caption: "Kitchen, bathroom, full refurb",
            systemImage: "paintbrush.fill"
        ),
        .init(
            value: "extension",
            label: "Extension",
            caption: "Adding to an existing home",
            systemImage: "rectangle.expand.vertical"
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WizardHeader(
                        index: vm.step.index,
                        kicker: "Project types",
                        title: "What kind of",
                        titleAccent: "work do you do?",
                        caption: "Pick everything that fits. You'll see projects that match these in your inbox."
                    )

                    LazyVGrid(
                        columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12),
                        ],
                        spacing: 12
                    ) {
                        ForEach(options, id: \.value) { opt in
                            CategoryCard(
                                label: opt.label,
                                caption: opt.caption,
                                systemImage: opt.systemImage,
                                isSelected: vm.selectedCategories.contains(opt.value)
                            ) {
                                if vm.selectedCategories.contains(opt.value) {
                                    vm.selectedCategories.remove(opt.value)
                                } else {
                                    vm.selectedCategories.insert(opt.value)
                                }
                            }
                        }
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

            WizardFooter(
                canContinue: !vm.selectedCategories.isEmpty,
                isSaving: vm.isSaving,
                onBack: { vm.goBack() }
            ) {
                Task {
                    let ok = await vm.saveCategoriesStep()
                    if ok { vm.goForward() }
                }
            }
        }
    }
}

// MARK: - Category card

private struct CategoryCard: View {
    let label: String
    let caption: String
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Press(haptic: .select, action: action) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: systemImage)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(isSelected ? Palette.accent : Palette.textMuted)
                        .symbolEffect(.bounce, value: isSelected)
                    Spacer()
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(isSelected ? Palette.accent : Palette.hairlineStrong)
                        .animation(Motion.easeOut, value: isSelected)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    Text(caption)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 124, alignment: .topLeading)
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
                color: isSelected ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: 14,
                x: 0,
                y: 6
            )
            .animation(Motion.easeOut, value: isSelected)
        }
    }
}
