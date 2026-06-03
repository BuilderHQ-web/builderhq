/// ProjectCoverArt — the premium, type-aware backdrop for every project
/// cover + hero (owner and builder share it).
///
/// A smooth **mesh gradient** per project type (iOS 18+) — a rich, liquid
/// dark→accent blend that reads expensive without any busy linework — with
/// a clean linear fallback on iOS 17. A whisper of top sheen gives it
/// depth; optional corner ticks / scrim / centred glyph layer on top.

import SwiftUI

struct ProjectCoverArt: View {
    let type: String
    /// Draughting registration ticks at the corners (heroes / large cards).
    var cornerTicks: Bool = false
    /// Dark bottom gradient so overlaid title/chips stay legible.
    var scrim: Bool = false
    /// Optional centered SF Symbol — used by small thumbnails as a quick
    /// type cue. Left nil on large covers.
    var glyph: String? = nil

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height

            ZStack {
                meshBase

                // Glassy top sheen for a touch of dimensional light.
                LinearGradient(colors: [Color.white.opacity(0.06), .clear],
                               startPoint: .top, endPoint: .center)
                    .blendMode(.plusLighter)

                if let glyph {
                    Image(systemName: glyph)
                        .font(.system(size: min(w, h) * 0.34, weight: .semibold))
                        .foregroundStyle(
                            LinearGradient(colors: [.white, Palette.accentLight],
                                           startPoint: .top, endPoint: .bottom)
                        )
                        .opacity(0.95)
                        .shadow(color: Palette.accentGlow.opacity(0.5), radius: 10)
                }

                if cornerTicks {
                    BlueprintCornerTicks(inset: 16, length: 16, tint: Palette.accentLight, opacity: 0.4)
                }

                if scrim {
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.18), .black.opacity(0.55)],
                        startPoint: .center, endPoint: .bottom
                    )
                }
            }
            .compositingGroup()
            .clipped()
        }
        .allowsHitTesting(false)
    }

    @ViewBuilder
    private var meshBase: some View {
        let r = ramp
        if #available(iOS 18.0, *) {
            MeshGradient(
                width: 3,
                height: 3,
                points: [
                    .init(0, 0),    .init(0.5, 0),    .init(1, 0),
                    .init(0, 0.5),  .init(0.58, 0.42), .init(1, 0.5),
                    .init(0, 1),    .init(0.5, 1),    .init(1, 1),
                ],
                colors: [
                    r.0, r.0, r.1,
                    r.0, r.1, r.2,
                    r.1, r.2, r.2,
                ]
            )
        } else {
            LinearGradient(colors: [r.0, r.1, r.2],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    /// Dark → mid → accent ramp per project type. The mesh weaves these
    /// into a smooth diagonal glow (dark top-left → bright bottom-right).
    private var ramp: (Color, Color, Color) {
        switch type {
        case "single_dwelling":
            return (Color(hex: 0x08131F), Color(hex: 0x123247), Color(hex: 0x1C73A0)) // blue-teal
        case "multi_dwelling":
            return (Color(hex: 0x06141C), Color(hex: 0x0C3340), Color(hex: 0x119C92)) // teal
        case "renovation":
            return (Color(hex: 0x0A1A1C), Color(hex: 0x0E3A36), Color(hex: 0x12A08C)) // teal-green
        case "extension":
            return (Color(hex: 0x06161E), Color(hex: 0x0E3344), Color(hex: 0x129FA8)) // cyan
        default:
            return (Color(hex: 0x080D16), Color(hex: 0x122438), Color(hex: 0x1A6E9C))
        }
    }
}
