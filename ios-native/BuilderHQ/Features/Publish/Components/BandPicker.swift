/// BandPicker — a vertical-tile selector for enum bands (budget,
/// land size, build size, etc.).
///
/// Each option becomes a tile in a single-column list:
///   · Left:  big formatted label ("$500k–$1M")
///   · Right: accent dot when selected
///   · On select: subtle accent glow + bounce
///
/// Compared to a segmented control or dropdown:
///   · Easier to scan (vertical = thumb-friendly)
///   · Tapping is one-shot (no scroll-wheel-style fiddling)
///   · The selected one is unmistakable
///
/// Generic over the option type so the wizard can use the same
/// component for budget, land size, build size, etc.

import SwiftUI

struct BandOption<Value: Hashable>: Hashable {
    let value: Value
    let title: String
    let subtitle: String?

    init(value: Value, title: String, subtitle: String? = nil) {
        self.value = value
        self.title = title
        self.subtitle = subtitle
    }
}

struct BandPicker<Value: Hashable>: View {
    let options: [BandOption<Value>]
    @Binding var selection: Value?

    var body: some View {
        VStack(spacing: 8) {
            ForEach(options, id: \.self) { option in
                row(for: option)
            }
        }
    }

    private func row(for option: BandOption<Value>) -> some View {
        let isSelected = selection == option.value

        return Press(haptic: .select) {
            selection = option.value
        } content: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(option.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    if let subtitle = option.subtitle {
                        Text(subtitle)
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(Palette.textDim)
                    }
                }
                Spacer()
                Circle()
                    .strokeBorder(
                        isSelected ? Palette.accent : Palette.hairlineStrong,
                        lineWidth: 1.5
                    )
                    .background(
                        Circle()
                            .fill(isSelected ? Palette.accent : .clear)
                            .padding(3)
                    )
                    .frame(width: 16, height: 16)
                    .animation(Motion.easeOut, value: isSelected)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(isSelected ? Palette.accentMuted : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(
                        isSelected ? Palette.accent.opacity(0.6) : Palette.hairline,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: isSelected ? Palette.accentGlow.opacity(0.4) : .clear,
                radius: 10,
                x: 0,
                y: 4
            )
            .animation(Motion.easeOut, value: isSelected)
        }
    }
}
