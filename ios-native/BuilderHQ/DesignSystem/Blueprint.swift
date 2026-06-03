/// Blueprint — the signature visual motif.
///
/// BuilderHQ is a construction-tendering marketplace; the whole domain
/// is plans, drawings, dimensions and draughting. These primitives
/// turn that into the app's personality: graph-paper grids, registration
/// ticks, and dimension marks rendered like a technical drawing.
///
/// Consolidated here from five near-identical `GridPatternOverlay`
/// copies that had drifted across the card components — one source of
/// truth so the motif reads identically everywhere.

import SwiftUI

// MARK: - Blueprint grid

/// Graph-paper grid: faint minor lines with brighter major lines every
/// `majorEvery` cells — the classic blueprint substrate. GPU-rasterised
/// via `Canvas`, cheap to redraw.
struct BlueprintGrid: View {
    /// Minor cell size in points.
    var spacing: CGFloat = 13
    /// Every Nth line is a "major" rule, drawn brighter.
    var majorEvery: Int = 4
    /// Base line tint. Defaults to the blueprint-blue brand line.
    var tint: Color = Palette.blueprintLine
    /// Opacity of the minor lines; major lines render at ~2.2×.
    var minorOpacity: Double = 0.10

    var body: some View {
        Canvas { ctx, size in
            var minor = Path()
            var major = Path()

            var i = 0
            var x: CGFloat = 0
            while x <= size.width {
                let line = Path { p in
                    p.move(to: CGPoint(x: x, y: 0))
                    p.addLine(to: CGPoint(x: x, y: size.height))
                }
                if i % majorEvery == 0 { major.addPath(line) } else { minor.addPath(line) }
                x += spacing
                i += 1
            }
            i = 0
            var y: CGFloat = 0
            while y <= size.height {
                let line = Path { p in
                    p.move(to: CGPoint(x: 0, y: y))
                    p.addLine(to: CGPoint(x: size.width, y: y))
                }
                if i % majorEvery == 0 { major.addPath(line) } else { minor.addPath(line) }
                y += spacing
                i += 1
            }

            ctx.stroke(minor, with: .color(tint.opacity(minorOpacity)), lineWidth: 0.5)
            ctx.stroke(major, with: .color(tint.opacity(minorOpacity * 2.2)), lineWidth: 0.6)
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Registration corner ticks

/// Four L-shaped registration marks at the corners of the frame — the
/// crop/alignment ticks you see on technical drawings and printer
/// proofs. A small, unmistakably "draughting" detail to lift heroes
/// and feature cards.
struct BlueprintCornerTicks: View {
    var inset: CGFloat = 12
    var length: CGFloat = 14
    var tint: Color = Palette.accentLight
    var lineWidth: CGFloat = 1.2
    var opacity: Double = 0.5

    var body: some View {
        Canvas { ctx, size in
            let i = inset
            let l = length
            var path = Path()

            // Top-left
            path.move(to: CGPoint(x: i, y: i + l)); path.addLine(to: CGPoint(x: i, y: i)); path.addLine(to: CGPoint(x: i + l, y: i))
            // Top-right
            path.move(to: CGPoint(x: size.width - i - l, y: i)); path.addLine(to: CGPoint(x: size.width - i, y: i)); path.addLine(to: CGPoint(x: size.width - i, y: i + l))
            // Bottom-left
            path.move(to: CGPoint(x: i, y: size.height - i - l)); path.addLine(to: CGPoint(x: i, y: size.height - i)); path.addLine(to: CGPoint(x: i + l, y: size.height - i))
            // Bottom-right
            path.move(to: CGPoint(x: size.width - i - l, y: size.height - i)); path.addLine(to: CGPoint(x: size.width - i, y: size.height - i)); path.addLine(to: CGPoint(x: size.width - i, y: size.height - i - l))

            ctx.stroke(path, with: .color(tint.opacity(opacity)), lineWidth: lineWidth)
        }
        .allowsHitTesting(false)
    }
}
