/// Motion — named curves + durations, mirroring the RN v4 system.
///
/// Five curves, four durations. Spring is reserved for celebration
/// moments only (state transitions: tender awarded, project published,
/// builder unlocks). Every other animation uses easeOut or easeOutSoft.
///
/// SwiftUI's `Animation` is the surface layer; UIKit-flavoured callers
/// (rare) can use the raw cubic-bezier helpers below.

import SwiftUI

enum Motion {
    // ── Durations ─────────────────────────────────────────────────
    static let fast       = Duration.milliseconds(180)
    static let base       = Duration.milliseconds(320)
    static let slow       = Duration.milliseconds(500)
    static let celebrate  = Duration.milliseconds(1200)

    // ── Named animations ─────────────────────────────────────────

    /// Default — most things (fades, translates).
    static let easeOut: Animation = .timingCurve(0.2, 0.8, 0.2, 1, duration: 0.32)

    /// Premium feel — slide-ins, sheet expansions, hero entries.
    static let easeOutSoft: Animation = .timingCurve(0.16, 1, 0.3, 1, duration: 0.5)

    /// Reversible — open / close, symmetric transitions.
    static let easeInOut: Animation = .timingCurve(0.65, 0, 0.35, 1, duration: 0.32)

    /// Celebration ONLY — moments of achievement. Big damping ratio
    /// so the overshoot reads as joy, not jitter.
    static let spring: Animation = .spring(response: 0.55, dampingFraction: 0.62)

    /// Linear — ticking timers, progress bars.
    static let linear: Animation = .linear(duration: 0.32)
}

/// Reanimated-style transition presets adapted for SwiftUI's
/// `.transition` modifier. Use for FadeInDown-style entries.
extension AnyTransition {
    /// Fade in while sliding up from 12pt below — the v4 row entry.
    static let fadeInUpV4: AnyTransition = .asymmetric(
        insertion: .move(edge: .bottom).combined(with: .opacity),
        removal: .opacity
    )

    /// Spring-scale entry for the Strava-style celebration moment.
    static let momentZoom: AnyTransition = .asymmetric(
        insertion: .scale(scale: 0.4).combined(with: .opacity),
        removal: .opacity
    )
}
