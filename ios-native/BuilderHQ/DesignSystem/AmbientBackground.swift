/// AmbientBackground — the global page atmosphere.
///
/// Layered, alive. Composes:
///
///   1. A multi-stop vertical gradient on the canvas — three dark
///      stops with a subtle warm cyan undertone so the screen doesn't
///      feel like flat black.
///   2. Three radial accent blooms (top-right, bottom-left, plus a
///      deeper centre bloom) — the top-right one breathes very
///      slowly (8s cycle, ±2% opacity) so the background feels alive
///      without ever drawing attention.
///   3. A faint 48pt grid with vignette mask — anchors the brand.
///   4. A barely-visible noise overlay — kills banding in the
///      gradient and gives the surface a premium feel on OLED.
///
/// Mounted ONCE at RootView; every screen sits on top transparently.
/// All sub-layers ignoreSafeArea so the gradient pours into the
/// status-bar + home-indicator zones.

import SwiftUI

struct AmbientBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    @State private var pulse: Double = 0
    /// Very slow horizontal drift on the top-right bloom — adds life
    /// without ever drawing attention. ±3% over 18 seconds.
    @State private var bloomDriftX: Double = 0
    /// Vertical drift, slightly different period than the X drift so
    /// the bloom traces a soft figure-8 over time.
    @State private var bloomDriftY: Double = 0

    private var isDark: Bool { colorScheme == .dark }

    var body: some View {
        ZStack {
            // 1. Base canvas — subtle multi-stop so the screen feels
            //    layered, not flat. Dark: the original navy ramp with
            //    a faint warm-cyan tilt. Light: the web's cream field
            //    warming toward the base. Restrained on purpose；
            //    this is brand atmosphere, not a focal point.
            if isDark {
                LinearGradient(
                    stops: [
                        .init(color: Color(hex: 0x0A1622), location: 0.0),
                        .init(color: Color(hex: 0x07111B), location: 0.4),
                        .init(color: Color(hex: 0x04080F), location: 0.75),
                        .init(color: Color(hex: 0x02050A), location: 1.0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            } else {
                LinearGradient(
                    stops: [
                        .init(color: Color(hex: 0xECE7DD), location: 0.0),
                        .init(color: Color(hex: 0xF1EDE4), location: 0.45),
                        .init(color: Color(hex: 0xE9E4D8), location: 0.8),
                        .init(color: Color(hex: 0xE3DDD0), location: 1.0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }

            // 2. Soft accent blooms — depth + light. Tuned so the
            //    breath is felt, not seen. Light mode runs the same
            //    geometry at whisper strength with normal compositing
            //    (screen-blend washes out on a bright field).
            GeometryReader { geo in
                ZStack {
                    RadialGradient(
                        colors: [
                            Palette.accent.opacity((isDark ? 0.22 : 0.09) + pulse),
                            Palette.accent.opacity(isDark ? 0.06 : 0.03),
                            .clear,
                        ],
                        center: UnitPoint(
                            x: 0.92 + bloomDriftX,
                            y: -0.05 + bloomDriftY
                        ),
                        startRadius: 0,
                        endRadius: geo.size.width * 0.85
                    )

                    RadialGradient(
                        colors: [
                            Palette.accent.opacity(isDark ? 0.14 : 0.06),
                            Palette.accent.opacity(isDark ? 0.04 : 0.02),
                            .clear,
                        ],
                        center: UnitPoint(x: 0.05, y: 1.0),
                        startRadius: 0,
                        endRadius: geo.size.width * 0.75
                    )

                    if isDark {
                        RadialGradient(
                            colors: [
                                Color(hex: 0x1A4E5C).opacity(0.16),
                                Color(hex: 0x1A4E5C).opacity(0.04),
                                .clear,
                            ],
                            center: UnitPoint(x: 0.5, y: 0.35),
                            startRadius: 30,
                            endRadius: geo.size.width * 0.9
                        )
                        .blendMode(.screen)
                    }

                    // Secondary brand-blue depth bloom, low + left.
                    // Gives the atmosphere a teal→blue depth axis so
                    // the screen no longer reads as one flat hue — the
                    // brand's secondary blue finally earning its keep.
                    RadialGradient(
                        colors: [
                            Palette.blue.opacity(isDark ? 0.13 : 0.05),
                            Palette.blue.opacity(isDark ? 0.03 : 0.015),
                            .clear,
                        ],
                        center: UnitPoint(x: 0.16, y: 0.82),
                        startRadius: 0,
                        endRadius: geo.size.width * 0.95
                    )
                    .blendMode(isDark ? .screen : .normal)
                }
            }

            // 3. Blueprint graph-paper grid — the brand substrate.
            //    Major/minor rules vignette-masked so they concentrate
            //    toward the centre and fade at the edges. blueprintLine
            //    is dynamic (blueprint-blue on dark, ink on light) so
            //    the grid reads as drafting paper in both modes.
            GridOverlay()
                .opacity(isDark ? 0.06 : 0.045)

            // 4. Subtle noise — kills any banding in the long
            //    gradient + adds texture (OLED-friendly on dark,
            //    paper-grain on light).
            NoiseOverlay()
                .opacity(isDark ? 0.035 : 0.02)
                .blendMode(.overlay)
        }
        .background(Palette.canvas)
        .onAppear {
            // Slow breath on bloom opacity.
            withAnimation(
                .easeInOut(duration: 8).repeatForever(autoreverses: true)
            ) {
                pulse = 0.04
            }
            // Slow horizontal drift (18s cycle).
            withAnimation(
                .easeInOut(duration: 18).repeatForever(autoreverses: true)
            ) {
                bloomDriftX = -0.06
            }
            // Vertical drift on a slightly different period (22s) so
            // the bloom traces an irregular path over time, never
            // settling into a predictable loop.
            withAnimation(
                .easeInOut(duration: 22).repeatForever(autoreverses: true)
            ) {
                bloomDriftY = 0.05
            }
        }
    }
}

/// Blueprint graph-paper for the global atmosphere: 36pt minor cells
/// with a brighter major rule every 4th line, blueprint-blue tinted,
/// vignette-masked so it concentrates toward the centre and fades to
/// nothing at the edges. GPU-rasterised via Path so it's cheap to
/// redraw on rotation.
private struct GridOverlay: View {
    private let spacing: CGFloat = 36
    private let majorEvery: Int = 4

    var body: some View {
        GeometryReader { geo in
            let mask = RadialGradient(
                colors: [.black, .black.opacity(0.55), .clear],
                center: .center,
                startRadius: 60,
                endRadius: max(geo.size.width, geo.size.height) * 0.62
            )

            ZStack {
                // Minor rules — dimmer + thinner.
                gridPath(in: geo.size, major: false)
                    .stroke(Palette.blueprintLine.opacity(0.5), lineWidth: 0.5)
                // Major rules — brighter + slightly thicker, every 4th.
                gridPath(in: geo.size, major: true)
                    .stroke(Palette.blueprintLine, lineWidth: 0.7)
            }
            .mask { mask }
        }
    }

    private func gridPath(in size: CGSize, major: Bool) -> Path {
        Path { path in
            var i = 0
            var x: CGFloat = 0
            while x <= size.width {
                if (i % majorEvery == 0) == major {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                }
                x += spacing; i += 1
            }
            i = 0
            var y: CGFloat = 0
            while y <= size.height {
                if (i % majorEvery == 0) == major {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                }
                y += spacing; i += 1
            }
        }
    }
}

/// Very-low-opacity procedural noise. Kills the visible banding that
/// shows up in long dark gradients on OLED + breaks up the pure black
/// just enough to read as "high-end finish" rather than "default
/// background color".
private struct NoiseOverlay: View {
    var body: some View {
        Canvas { ctx, size in
            // Sample sparsely — 1 dot per 8pt² — so the noise reads as
            // texture rather than static. Pseudo-random via hash on
            // the coordinate pair, deterministic per pixel so it never
            // shimmers between frames.
            let step: CGFloat = 4
            var y: CGFloat = 0
            while y < size.height {
                var x: CGFloat = 0
                while x < size.width {
                    let h = (Int(x) &* 0x1F1F1F1F) &+ (Int(y) &* 0x3C3C3C3C)
                    let v = (h >> 4) & 0xFF
                    if v > 128 {
                        ctx.fill(
                            Path(CGRect(x: x, y: y, width: 1, height: 1)),
                            with: .color(.white.opacity(Double(v) / 4096))
                        )
                    }
                    x += step
                }
                y += step
            }
        }
    }
}
