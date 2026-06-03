/// PublishStep3Specs — the project's structural specifics.
///
/// Body depends on `draft.type` — different types ask for different
/// things:
///   · single_dwelling: bedrooms, bathrooms, floors, build size, land
///   · multi_dwelling:  dwelling count + bedrooms/baths (per dwelling),
///                      build size, land
///   · renovation:      scope tags (multi-select) + age band + build
///   · extension:       extension type + size + bedrooms/baths
///
/// Each sub-section is a focused row — `PillStepper` for counts, the
/// `BandPicker` for size bands, a tag-style multi-select for scope.
/// Designed to require ≤5 thumb taps total in the common path.

import SwiftUI

struct PublishStep3Specs: View {
    @Bindable var vm: ProjectPublishViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                stepLabel("The specifics")
                Text(subtitle)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    typeSpecificSections
                }
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
        .padding(.horizontal, 24)
        // Critical: claim the full available height so the inner
        // ScrollView gets a real height constraint to scroll inside.
        // Without this the VStack sizes to its content, the ScrollView
        // gets its content's own size (no scroll needed), and the
        // overflow gets clipped by the parent ZStack.
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private var typeSpecificSections: some View {
        switch vm.draft.type {
        case "single_dwelling":
            singleDwellingFields
        case "multi_dwelling":
            multiDwellingFields
        case "renovation":
            renovationFields
        case "extension":
            extensionFields
        default:
            Text("Pick a project type first.")
                .font(.system(size: 14))
                .foregroundStyle(Palette.textMuted)
        }
    }

    // MARK: - Single dwelling

    private var singleDwellingFields: some View {
        VStack(alignment: .leading, spacing: 22) {
            PillStepper(
                value: $vm.draft.bedrooms,
                range: 1...7,
                caption: "Bedrooms"
            )
            PillStepper(
                value: $vm.draft.bathrooms,
                range: 1...5,
                caption: "Bathrooms"
            )
            PillStepper(
                value: $vm.draft.floors,
                range: 1...4,
                caption: "Floors (optional)"
            )
            buildSizeBlock
            landSizeBlock
        }
    }

    // MARK: - Multi dwelling

    private var multiDwellingFields: some View {
        VStack(alignment: .leading, spacing: 22) {
            PillStepper(
                value: $vm.draft.dwellingCount,
                range: 2...12,
                lastPillSuffix: "+",
                caption: "Number of dwellings"
            )
            PillStepper(
                value: $vm.draft.bedrooms,
                range: 1...5,
                caption: "Bedrooms per dwelling"
            )
            PillStepper(
                value: $vm.draft.bathrooms,
                range: 1...4,
                caption: "Bathrooms per dwelling"
            )
            landSizeBlock
        }
    }

    // MARK: - Renovation

    private var renovationFields: some View {
        VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 10) {
                Text("WHAT'S IN SCOPE")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.textDim)
                renovationScopeTags
                Text("Pick all that apply.")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .padding(.top, 2)
            }

            BandPicker(
                options: ageOptions,
                selection: $vm.draft.existingAgeBand
            )
        }
    }

    private var renovationScopeTags: some View {
        let tags: [(value: String, label: String)] = [
            ("kitchen", "Kitchen"),
            ("bathroom", "Bathroom"),
            ("kitchen_and_bathroom", "Kitchen + Bathroom"),
            ("full_internal", "Full internal"),
            ("full_internal_and_external", "Internal + External"),
            ("structural", "Structural"),
        ]
        return LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8),
            ],
            spacing: 8
        ) {
            ForEach(tags, id: \.value) { tag in
                tagButton(value: tag.value, label: tag.label)
            }
        }
    }

    private func tagButton(value: String, label: String) -> some View {
        let isSelected = vm.draft.renovationScopeTags.contains(value)
        return Press(haptic: .select) {
            if let idx = vm.draft.renovationScopeTags.firstIndex(of: value) {
                vm.draft.renovationScopeTags.remove(at: idx)
            } else {
                vm.draft.renovationScopeTags.append(value)
            }
        } content: {
            HStack(spacing: 6) {
                Image(
                    systemName: isSelected
                        ? "checkmark.circle.fill"
                        : "circle"
                )
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(
                    isSelected ? Palette.accent : Palette.textDim
                )
                Text(label)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.text)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 11)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Palette.accentMuted : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected
                            ? Palette.accent.opacity(0.6)
                            : Palette.hairline,
                        lineWidth: 1
                    )
            )
            .animation(Motion.easeOut, value: isSelected)
        }
    }

    private var ageOptions: [BandOption<String>] {
        [
            .init(value: "under_10", title: "Less than 10 years old"),
            .init(value: "10_25", title: "10–25 years"),
            .init(value: "25_50", title: "25–50 years"),
            .init(value: "50_75", title: "50–75 years"),
            .init(value: "over_75", title: "Over 75 years"),
        ]
    }

    // MARK: - Extension

    private var extensionFields: some View {
        VStack(alignment: .leading, spacing: 22) {
            BandPicker(
                options: extensionTypeOptions,
                selection: $vm.draft.extensionType
            )
            BandPicker(
                options: extensionSizeOptions,
                selection: $vm.draft.extensionSizeBand
            )
            PillStepper(
                value: $vm.draft.bedrooms,
                range: 1...4,
                caption: "Bedrooms added (optional)"
            )
            PillStepper(
                value: $vm.draft.bathrooms,
                range: 1...3,
                caption: "Bathrooms added (optional)"
            )
        }
    }

    private var extensionTypeOptions: [BandOption<String>] {
        [
            .init(value: "ground_floor", title: "Ground floor"),
            .init(value: "first_floor", title: "First floor"),
            .init(value: "ground_and_first", title: "Both floors"),
            .init(value: "rear", title: "Rear"),
            .init(value: "side", title: "Side"),
        ]
    }

    private var extensionSizeOptions: [BandOption<String>] {
        [
            .init(value: "under_20", title: "Under 20 m²"),
            .init(value: "20_40", title: "20–40 m²"),
            .init(value: "40_60", title: "40–60 m²"),
            .init(value: "60_80", title: "60–80 m²"),
            .init(value: "80_100", title: "80–100 m²"),
            .init(value: "over_100", title: "Over 100 m²"),
        ]
    }

    // MARK: - Shared size sections

    private var buildSizeBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("BUILD SIZE")
                .font(.system(size: 10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(Palette.textDim)
            BandPicker(
                options: [
                    .init(value: "under_100", title: "Under 100 m²"),
                    .init(value: "100_150", title: "100–150 m²"),
                    .init(value: "150_200", title: "150–200 m²"),
                    .init(value: "200_250", title: "200–250 m²"),
                    .init(value: "250_300", title: "250–300 m²"),
                    .init(value: "300_400", title: "300–400 m²"),
                    .init(value: "over_400", title: "Over 400 m²"),
                ],
                selection: $vm.draft.buildSizeBand
            )
        }
    }

    private var landSizeBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LAND SIZE")
                .font(.system(size: 10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(Palette.textDim)
            BandPicker(
                options: [
                    .init(value: "under_200", title: "Under 200 m²"),
                    .init(value: "200_400", title: "200–400 m²"),
                    .init(value: "400_600", title: "400–600 m²"),
                    .init(value: "600_800", title: "600–800 m²"),
                    .init(value: "800_1000", title: "800–1000 m²"),
                    .init(value: "over_1000", title: "Over 1000 m²"),
                ],
                selection: $vm.draft.landSizeBand
            )
        }
    }

    // MARK: - Headings

    private func stepLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Palette.text)
            .tracking(-0.2)
    }

    private var subtitle: String {
        switch vm.draft.type {
        case "single_dwelling": return "Builders will use this to estimate scope + materials."
        case "multi_dwelling":  return "Across all dwellings — each gets these specs."
        case "renovation":      return "Pick everything in scope. The more accurate, the better the matches."
        case "extension":       return "Quick details for builders to scope your extension."
        default:                return "Tell builders what you're building."
        }
    }
}
