/// BrowseFilterChips — horizontal row of filter pills under the search bar.
///
/// Includes:
///   · "All" / type-specific chips (Single dwelling, Multi, Renovation, Extension)
///   · A "My areas" toggle chip that scopes to the builder's saved
///     service areas
///
/// Selected chips morph to accent fill with a smooth spring; unselected
/// stay surface-toned with a hairline border. Tapping fires a light
/// haptic + the parent's `onChange` callback.

import SwiftUI

struct BrowseFilterChips: View {
    @Binding var typeFilter: String?
    @Binding var serviceAreaOnly: Bool

    private struct TypeOption {
        let value: String?       // nil = all
        let label: String
        let icon: String?
    }

    private let typeOptions: [TypeOption] = [
        .init(value: nil,                  label: "All",          icon: nil),
        .init(value: "single_dwelling",    label: "Single",       icon: "house.fill"),
        .init(value: "multi_dwelling",     label: "Multi",        icon: "building.2.fill"),
        .init(value: "renovation",         label: "Renovation",   icon: "paintbrush.fill"),
        .init(value: "extension",          label: "Extension",    icon: "rectangle.expand.vertical"),
    ]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                serviceAreaChip

                Rectangle()
                    .fill(Palette.hairline)
                    .frame(width: 1, height: 20)
                    .padding(.horizontal, 4)

                ForEach(typeOptions, id: \.label) { opt in
                    chip(for: opt)
                }
            }
            .padding(.horizontal, 20)
        }
        .scrollIndicators(.hidden)
    }

    private var serviceAreaChip: some View {
        let isActive = serviceAreaOnly

        return Press(haptic: .select) {
            serviceAreaOnly.toggle()
        } content: {
            HStack(spacing: 5) {
                Image(systemName: "location.fill")
                    .font(.system(size: 11, weight: .bold))
                Text("My areas")
                    .font(.system(size: 13, weight: .bold))
                    .tracking(0.3)
            }
            .foregroundStyle(isActive ? Palette.accentContrast : Palette.text)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(
                Capsule().fill(isActive ? Palette.accent : Palette.surface)
            )
            .overlay(
                Capsule().stroke(
                    isActive ? .clear : Palette.cardBorder,
                    lineWidth: 1
                )
            )
            .shadow(
                color: isActive ? Palette.accentGlow : .clear,
                radius: 12
            )
            .scaleEffect(isActive ? 1.03 : 1)
            .animation(
                .spring(response: 0.32, dampingFraction: 0.7),
                value: isActive
            )
        }
    }

    private func chip(for opt: TypeOption) -> some View {
        let isSelected = typeFilter == opt.value

        return Press(haptic: .select) {
            typeFilter = opt.value
        } content: {
            HStack(spacing: 5) {
                if let icon = opt.icon {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .bold))
                }
                Text(opt.label)
                    .font(.system(size: 13, weight: .bold))
                    .tracking(0.3)
            }
            .foregroundStyle(
                isSelected ? Palette.accentContrast : Palette.text
            )
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(
                Capsule().fill(isSelected ? Palette.accent : Palette.surface)
            )
            .overlay(
                Capsule().stroke(
                    isSelected ? .clear : Palette.cardBorder,
                    lineWidth: 1
                )
            )
            .shadow(
                color: isSelected ? Palette.accentGlow : .clear,
                radius: 12
            )
            .scaleEffect(isSelected ? 1.03 : 1)
            .animation(
                .spring(response: 0.32, dampingFraction: 0.7),
                value: isSelected
            )
        }
    }
}
