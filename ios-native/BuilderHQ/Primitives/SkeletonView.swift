/// SkeletonView — content-shaped loading placeholder with a shimmer
/// sweep. Replaces the brand-anonymous default ProgressView in any
/// situation where the user is staring at a screen waiting for a fetch.
///
/// Use it like a Color: place it where the real content will go, with
/// the same approximate frame, and let the dashboard load *into* it
/// rather than over an empty void. Animated shimmer makes the wait
/// feel like the app is alive even when no data has arrived yet.

import SwiftUI

struct SkeletonView: View {
    /// Corner radius of the placeholder shape. 14 matches our card
    /// hierarchy; bump to .infinity for pill-shaped placeholders.
    var cornerRadius: CGFloat = 14

    /// Base fill — usually `Palette.surface`. Caller may override for
    /// nested placeholders that need to read against a tinted parent.
    var baseColor: Color = Palette.surface

    @State private var shimmerOffset: CGFloat = -1.2

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(baseColor)
            .overlay(
                // Sweeping shimmer — a translucent diagonal band that
                // travels from -1.2 to +1.2 (in unit space) and loops.
                // The mask clips it to the rounded rect underneath.
                LinearGradient(
                    colors: [
                        .clear,
                        Palette.text.opacity(0.06),
                        Palette.text.opacity(0.10),
                        Palette.text.opacity(0.06),
                        .clear,
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .scaleEffect(x: 1.6, y: 1.6)
                .offset(x: shimmerOffset * 220, y: shimmerOffset * 90)
            )
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .onAppear {
                withAnimation(
                    .linear(duration: 1.4).repeatForever(autoreverses: false)
                ) {
                    shimmerOffset = 1.2
                }
            }
    }
}
