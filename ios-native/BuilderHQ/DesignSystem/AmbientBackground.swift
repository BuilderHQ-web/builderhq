/// AmbientBackground — the global page atmosphere.
///
/// Two-stop vertical gradient + two soft accent blooms (top-right
/// and bottom-left) + a faint grid overlay. Mirrors the RN
/// `<AmbientBackground />` from the (main) layout so the brand reads
/// consistent between the archived RN build and the native build.
///
/// Mounted ONCE at RootView; every screen sits on top transparently.

import SwiftUI

struct AmbientBackground: View {
    var body: some View {
        ZStack {
            // 1. Vertical canvas gradient
            LinearGradient(
                colors: [
                    Color(hex: 0x08111E),
                    Color(hex: 0x06080F),
                    Color(hex: 0x04060C),
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // 2. Two soft accent blooms — top-right and bottom-left.
            //    Implemented as radial gradients with opacity 0 at the
            //    edge so they read as light, not visible disks.
            GeometryReader { geo in
                ZStack {
                    RadialGradient(
                        colors: [
                            Palette.accent.opacity(0.18),
                            Palette.accent.opacity(0.05),
                            .clear,
                        ],
                        center: UnitPoint(x: 0.95, y: 0),
                        startRadius: 0,
                        endRadius: geo.size.width * 0.7
                    )
                    RadialGradient(
                        colors: [
                            Palette.accent.opacity(0.10),
                            Palette.accent.opacity(0.03),
                            .clear,
                        ],
                        center: UnitPoint(x: 0.05, y: 1.0),
                        startRadius: 0,
                        endRadius: geo.size.width * 0.65
                    )
                }
            }

            // 3. Faint grid overlay — 48pt squares, very low opacity,
            //    with a vignette mask so the centre reads strongest
            //    and edges fade.
            GridOverlay()
                .opacity(0.035)
        }
        .background(Palette.canvas)
    }
}

/// 48pt × 48pt grid drawn via Path. SwiftUI auto-rasterises this on
/// the GPU so it's cheap to redraw even on rotation.
private struct GridOverlay: View {
    private let spacing: CGFloat = 48

    var body: some View {
        GeometryReader { geo in
            Path { path in
                var x: CGFloat = 0
                while x <= geo.size.width {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: geo.size.height))
                    x += spacing
                }
                var y: CGFloat = 0
                while y <= geo.size.height {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: geo.size.width, y: y))
                    y += spacing
                }
            }
            .stroke(Palette.accentLight, lineWidth: 0.5)
            .mask {
                // Vignette mask — centre opaque, edges fade.
                RadialGradient(
                    colors: [.black, .black.opacity(0.6), .clear],
                    center: .center,
                    startRadius: 80,
                    endRadius: max(geo.size.width, geo.size.height) * 0.6
                )
            }
        }
    }
}
