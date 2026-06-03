/// Pill — status indicator + small chip.
///
/// Six tones, two sizes. Mirrors the RN `<Pill />` primitive 1:1.

import SwiftUI

struct Pill: View {
    enum Tone {
        case neutral
        case accent
        case success
        case warning
        case danger
        case solid

        var bg: Color {
            switch self {
            case .neutral: return .clear
            case .accent:  return Palette.accentMuted
            case .success: return Palette.successMuted
            case .warning: return Palette.warningMuted
            case .danger:  return Palette.dangerMuted
            case .solid:   return Palette.accent
            }
        }

        var border: Color {
            switch self {
            case .neutral: return Palette.hairlineStrong
            case .accent:  return Palette.hairlineAccent
            case .success: return Palette.success.opacity(0.30)
            case .warning: return Palette.warning.opacity(0.30)
            case .danger:  return Palette.danger.opacity(0.30)
            case .solid:   return Palette.accent
            }
        }

        var foreground: Color {
            switch self {
            case .neutral: return Palette.textMuted
            case .accent:  return Palette.accentLight
            case .success: return Palette.success
            case .warning: return Palette.warning
            case .danger:  return Palette.danger
            case .solid:   return Palette.accentContrast
            }
        }
    }

    enum Size {
        case small
        case medium

        var fontSize: CGFloat { self == .small ? 11 : 13 }
        var paddingX: CGFloat { self == .small ? 10 : 14 }
        var paddingY: CGFloat { self == .small ? 4  : 6  }
    }

    let label: String
    var tone: Tone = .neutral
    var size: Size = .small
    var leadingSymbol: String? = nil

    var body: some View {
        HStack(spacing: 6) {
            if let leadingSymbol {
                Image(systemName: leadingSymbol)
                    .font(.system(size: size.fontSize - 1, weight: .semibold))
                    .foregroundStyle(tone.foreground)
            }
            Text(label)
                .font(.system(size: size.fontSize, weight: .semibold))
                .tracking(0.2)
                .foregroundStyle(tone.foreground)
        }
        .padding(.horizontal, size.paddingX)
        .padding(.vertical, size.paddingY)
        .background(
            Capsule()
                .fill(tone.bg)
                .overlay(
                    Capsule()
                        .stroke(tone.border, lineWidth: 1)
                )
        )
    }
}
