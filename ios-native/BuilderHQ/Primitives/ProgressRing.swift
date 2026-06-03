/// ProgressRing — animated circular progress indicator.
///
/// Used on the FBA hero card (and any future progress UI). On first
/// render, the ring fills clockwise from 0 to the target progress over
/// ~700ms using a cubic ease-out. Subsequent value changes animate
/// smoothly between states (useful when an unlock fires and the
/// remaining count drops live).
///
/// The visual is two concentric arcs:
///   · Track   — full circle, hairline accent at low opacity
///   · Fill    — animated arc that paints the active portion in solid
///                accent with a soft outer glow
///
/// Sized via the .frame() the caller imposes — the geometry is fully
/// driven by the available square frame so the ring scales cleanly
/// from 24pt favicon size up to a 200pt hero centrepiece.

import SwiftUI

struct ProgressRing: View {
    /// Active fraction, 0.0 → 1.0. Values outside [0, 1] are clamped.
    var progress: Double

    /// Stroke thickness as a fraction of the ring radius. 0.12 looks
    /// premium at large sizes; bump to 0.18 for small icon-sized rings.
    var thickness: CGFloat = 0.12

    /// Accent override. Defaults to `Palette.accent`.
    var color: Color = Palette.accent

    /// When true the fill arc emits a soft outer glow — high contrast
    /// in dark contexts. Off for small icon-style rings.
    var glow: Bool = true

    private var clamped: Double {
        min(max(progress, 0), 1)
    }

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let lineWidth = size * thickness

            ZStack {
                // Track — full circle, low-opacity accent so the
                // unfilled portion feels like an outline of intent
                // rather than an empty void.
                Circle()
                    .stroke(
                        color.opacity(0.18),
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                    )

                // Active arc — animates clockwise from 12 o'clock.
                Circle()
                    .trim(from: 0, to: clamped)
                    .stroke(
                        color,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .shadow(
                        color: glow ? color.opacity(0.55) : .clear,
                        radius: glow ? lineWidth * 1.4 : 0
                    )
            }
            .frame(width: size, height: size)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .animation(.counterReveal, value: clamped)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}
