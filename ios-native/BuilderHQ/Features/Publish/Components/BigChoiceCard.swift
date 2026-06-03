/// BigChoiceCard — the large tappable card used on single-decision
/// steps (project type, contact preference, etc.).
///
/// Two-tier layout:
///   · Top: SF Symbol icon in accent (bounces on select)
///   · Bottom: title + optional subtitle
///
/// Selection state visually morphs:
///   · `.accentMuted` fill at low opacity
///   · `.accent` border (1.5pt)
///   · accent glow shadow
///   · small dot indicator in the top-right that fills with accent
///
/// Used in a 2-column grid for the wizard's type step.

import SwiftUI

struct BigChoiceCard: View {
    let icon: String
    let title: String
    let subtitle: String?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Press(haptic: .select, action: action) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(isSelected ? Palette.accent : Palette.textMuted)
                        .symbolEffect(.bounce, value: isSelected)
                    Spacer()
                    selectionDot
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(Palette.textDim)
                            .lineLimit(2)
                    }
                }
            }
            .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isSelected ? Palette.accentMuted : Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(
                        isSelected ? Palette.accent.opacity(0.7) : Palette.hairline,
                        lineWidth: isSelected ? 1.5 : 1
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

    private var selectionDot: some View {
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
            .frame(width: 14, height: 14)
            .animation(Motion.easeOut, value: isSelected)
    }
}
