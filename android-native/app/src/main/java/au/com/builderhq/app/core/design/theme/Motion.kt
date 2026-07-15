package au.com.builderhq.app.core.design.theme

import androidx.compose.animation.core.CubicBezierEasing

/** Brand motion easings (mirror the web/iOS curves). */
object Motion {
    /** Apple/Resend-flavoured soft settle — hero + reveal entrances. */
    val EaseOutSoft = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)

    /** Punchy settle — default fades + translates. */
    val EaseOut = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)

    /** Subtle overshoot — celebratory arrivals only. */
    val EaseSpring = CubicBezierEasing(0.34f, 1.56f, 0.64f, 1f)

    const val FAST = 180
    const val BASE = 320
    const val SLOW = 500
}
