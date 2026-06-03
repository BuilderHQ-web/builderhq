/// CardSurface — the unified "floating glass on atmosphere" treatment
/// for every card on the dashboard.
///
/// Switched from solid gradient fills to iOS system materials. The
/// material lets the AmbientBackground's gradient + accent bloom
/// blur through each card, so cards genuinely feel like frosted glass
/// plates suspended above the page — not opaque rectangles glued on
/// top.
///
/// Composition (deepest → frontmost):
///
///   1. `.regularMaterial` fill — Apple's GPU-accelerated frosted
///      glass. Naturally dark in dark-mode and adapts to whatever's
///      behind it. This is the "premium" tier of materials — strong
///      enough to read against text but transparent enough to feel
///      lifted.
///   2. Subtle brand-tinted wash — a low-opacity teal-gray laid on
///      top of the material aligns cards to our brand identity
///      without making them feel painted-over.
///   3. 1pt top-edge highlight via `.plusLighter` — sells the
///      "light catches the upper edge" lifted feel.
///   4. Hairline border — keeps the card's outline crisp.
///   5. Accent-tinted drop shadow — the secret to "premium" depth.
///      Pure-black shadows on dark backgrounds read as flat; a
///      teal-tinted shadow reads as luxurious lift.
///
/// Three elevation presets:
///   · `.flat`     — stat tiles, secondary surfaces
///   · `.lifted`   — primary content (callouts, project feed)
///   · `.hero`     — flagship FBA hero card

import SwiftUI

enum CardElevation {
    case flat
    case lifted
    case hero

    /// Which iOS material this elevation maps to. Thicker materials
    /// blur more aggressively — the hero gets the thickest treatment
    /// so it visually dominates without needing to be physically
    /// bigger than its neighbours.
    var material: Material {
        switch self {
        case .flat:   return .regularMaterial
        case .lifted: return .regularMaterial
        case .hero:   return .thickMaterial
        }
    }

    /// Brand-tinted wash applied OVER the material. Subtle enough
    /// that the bg gradient still bleeds through; saturated enough
    /// that cards feel branded rather than generic system surfaces.
    var washOpacity: Double {
        switch self {
        case .flat:   return 0.32
        case .lifted: return 0.36
        case .hero:   return 0.28
        }
    }

    var shadowRadius: CGFloat {
        switch self {
        case .flat:   return 14
        case .lifted: return 22
        case .hero:   return 34
        }
    }

    var shadowOffsetY: CGFloat {
        switch self {
        case .flat:   return 6
        case .lifted: return 12
        case .hero:   return 20
        }
    }

    var shadowOpacity: Double {
        switch self {
        case .flat:   return 0.55
        case .lifted: return 0.85
        case .hero:   return 1.1
        }
    }

    /// Hero gets a stronger accent border. Everything else uses the
    /// neutral premium border.
    var borderOverride: Color? {
        switch self {
        case .hero: return Palette.accent.opacity(0.34)
        default:    return nil
        }
    }
}

struct CardSurface: ViewModifier {
    var elevation: CardElevation = .lifted
    var cornerRadius: CGFloat = 22
    var borderColor: Color? = nil

    func body(content: Content) -> some View {
        let resolvedBorder = borderColor
            ?? elevation.borderOverride
            ?? Palette.cardBorder
        let shape = RoundedRectangle(
            cornerRadius: cornerRadius,
            style: .continuous
        )

        content
            .background(
                ZStack {
                    // 1. Frosted glass fill — blurs the AmbientBg
                    //    bloom through the card. The single most
                    //    important "premium" lever in this whole
                    //    design system.
                    shape.fill(elevation.material)

                    // 2. Subtle brand-tinted wash. Dark teal-gray
                    //    at low opacity — aligns the system
                    //    material to our identity without painting
                    //    over the gradient bleed-through.
                    shape.fill(
                        LinearGradient(
                            colors: [
                                // Top stop leans a touch more blueprint-
                                // blue so the card glass harmonises with
                                // the new blue-tinted edges + atmosphere.
                                Color(hex: 0x112A45).opacity(elevation.washOpacity + 0.04),
                                Color(hex: 0x05101C).opacity(elevation.washOpacity),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
            )
            .overlay(
                // Hairline border
                shape.stroke(resolvedBorder, lineWidth: 1)
            )
            .overlay(alignment: .top) {
                // 3. 1pt top-edge highlight sells the "lit from
                //    above" lift. Plus-lighter blend makes the
                //    highlight read as a glow rather than a stroke.
                shape
                    .stroke(
                        LinearGradient(
                            colors: [
                                Palette.cardEdgeHighlight,
                                Palette.cardEdgeHighlight.opacity(0),
                            ],
                            startPoint: .top,
                            endPoint: .center
                        ),
                        lineWidth: 1
                    )
                    .padding(0.5)
                    .blendMode(.plusLighter)
            }
            .clipShape(shape)
            .shadow(
                color: Palette.cardShadow.opacity(elevation.shadowOpacity),
                radius: elevation.shadowRadius,
                x: 0,
                y: elevation.shadowOffsetY
            )
    }
}

extension View {
    /// Apply the premium card treatment (frosted material + brand
    /// wash + edge highlight + accent shadow).
    func cardSurface(
        _ elevation: CardElevation = .lifted,
        radius: CGFloat = 22,
        borderColor: Color? = nil
    ) -> some View {
        modifier(
            CardSurface(
                elevation: elevation,
                cornerRadius: radius,
                borderColor: borderColor
            )
        )
    }
}
