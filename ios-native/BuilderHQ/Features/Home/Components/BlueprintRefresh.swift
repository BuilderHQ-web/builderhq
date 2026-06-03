/// BlueprintRefresh — a branded pull-to-refresh indicator.
///
/// Replaces the system spinner with the app's drafting language: a ring
/// that *draws* itself as you pull (with a registration cross snapping in
/// at the trigger point), then spins as a survey sweep while refreshing.
/// Driven entirely by the scroll offset the dashboards already track.

import SwiftUI

struct BlueprintRefresh: View {
    /// 0 → 1 as the user pulls toward the trigger threshold.
    var progress: CGFloat
    var refreshing: Bool

    @State private var spin = false

    private var armed: Bool { progress >= 1 }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Palette.hairlineStrong, lineWidth: 1.5)
                .frame(width: 30, height: 30)

            Circle()
                .trim(from: 0, to: refreshing ? 0.72 : max(0.02, min(1, progress)))
                .stroke(
                    armed || refreshing ? Palette.accent : Palette.accentLight,
                    style: StrokeStyle(lineWidth: 2.2, lineCap: .round)
                )
                .frame(width: 30, height: 30)
                .rotationEffect(.degrees(refreshing ? (spin ? 360 : 0) : -90))

            // Registration cross — snaps in once you've pulled far enough.
            Image(systemName: "plus")
                .font(.system(size: 9, weight: .black))
                .foregroundStyle(Palette.accentLight)
                .opacity(refreshing ? 0 : Double(min(1, progress)))
                .scaleEffect(armed ? 1.15 : 1)
                .animation(.spring(response: 0.3, dampingFraction: 0.5), value: armed)
        }
        .shadow(color: Palette.accentGlow.opacity(0.5), radius: 8)
        .onChange(of: refreshing) { _, isRefreshing in
            if isRefreshing {
                withAnimation(.linear(duration: 0.85).repeatForever(autoreverses: false)) { spin = true }
            } else {
                withAnimation(.easeOut(duration: 0.2)) { spin = false }
            }
        }
        .sensoryFeedback(.impact(weight: .light), trigger: armed)
    }
}
