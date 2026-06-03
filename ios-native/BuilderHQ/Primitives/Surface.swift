/// Surface — the ONE card primitive.
///
/// 1:1 conceptual port of the RN `<Surface />`. Solid panel, hairline
/// border, optional 3D float shadow + top-edge hairline accent.
///
/// Variants:
///   · `.default`  — the standard solid panel
///   · `.elevated` — slightly lifted (active / selected state)
///   · `.accent`   — accent-tinted background + accent border
///   · `.quiet`    — no border, transparent (used inside list rows
///                   where the outer container already separates)
///
/// Usage:
///   Surface(.default) {
///       Text("Hello")
///   }
///   .padding(20)

import SwiftUI

struct Surface<Content: View>: View {
    enum Variant {
        case `default`
        case elevated
        case accent
        case quiet
    }

    let variant: Variant
    let radius: CGFloat
    let padding: CGFloat?
    let hairline: Bool
    let float: Bool
    let content: Content

    init(
        _ variant: Variant = .default,
        radius: CGFloat = 14,
        padding: CGFloat? = nil,
        hairline: Bool = false,
        float: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.radius = radius
        self.padding = padding
        self.hairline = hairline
        self.float = float
        self.content = content()
    }

    var body: some View {
        let resolvedPadding = padding ?? defaultPadding
        return content
            .padding(resolvedPadding)
            .background {
                ZStack(alignment: .top) {
                    RoundedRectangle(cornerRadius: radius, style: .continuous)
                        .fill(backgroundColor)
                    if variant != .quiet {
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .stroke(borderColor, lineWidth: 1)
                    }
                    if hairline {
                        // Top-edge accent hairline — the landing's
                        // signature device.
                        Rectangle()
                            .fill(Palette.accentLight.opacity(0.55))
                            .frame(height: 1)
                            .padding(.horizontal, 32)
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .shadow(
                color: shadowColor,
                radius: float ? shadowRadius : 0,
                x: 0,
                y: float ? shadowOffsetY : 0
            )
    }

    private var backgroundColor: Color {
        switch variant {
        case .default:  return Palette.surface
        case .elevated: return Palette.surfaceElev
        case .accent:   return Palette.accentMuted
        case .quiet:    return .clear
        }
    }

    private var borderColor: Color {
        switch variant {
        case .default:  return Palette.hairline
        case .elevated: return Palette.hairlineStrong
        case .accent:   return Palette.hairlineAccent
        case .quiet:    return .clear
        }
    }

    private var defaultPadding: CGFloat {
        switch variant {
        case .default, .elevated, .accent: return 20
        case .quiet: return 0
        }
    }

    private var shadowColor: Color {
        if !float || variant == .quiet { return .clear }
        return variant == .accent
            ? Palette.accent.opacity(0.16)
            : .black.opacity(0.4)
    }

    private var shadowRadius: CGFloat { variant == .accent ? 28 : 24 }
    private var shadowOffsetY: CGFloat { variant == .accent ? 14 : 12 }
}
