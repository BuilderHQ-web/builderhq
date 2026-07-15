package au.com.builderhq.app.core.design.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Brand palette — two full palettes behind one semantic token set.
 *
 * DARK is the original brand-locked look (deep navy canvas, blueprint
 * borders, bright teal). LIGHT mirrors the builderhq.com.au web app's
 * cream / ink / deep-teal `@theme` block 1:1 — same hexes, same rule
 * that bright teal (#00D4C8) is for FILLS and glows while teal used
 * AS TEXT drops to the deep readable pair (#0A7D73 / #077E76).
 *
 * No composable may construct a `Color(0x…)` literal or import a
 * top-level color constant — everything reads `Bhq.colors.*` so both
 * palettes stay complete. (Generative art surfaces — cover art,
 * ambient backgrounds, celebration — are the one sanctioned
 * exception: they own their palettes internally per mode.)
 */
@Immutable
data class BhqColors(
    val isDark: Boolean,

    // ── canvas + surfaces ────────────────────────────────────────────
    val canvas: Color,
    val surface: Color,
    val surfaceElev: Color,
    /** Bottom sheets + the darkest field wells. */
    val sheet: Color,

    // ── brand accent (teal) ──────────────────────────────────────────
    /** Bright teal — fills, glows, progress. Never long-form text on light. */
    val accent: Color,
    /** Teal as TEXT: luminous on dark, deep + readable on light. */
    val accentLight: Color,
    /** Deepest teal — gradient tails, pressed states. */
    val accentDeep: Color,
    /** Teal wash ~14% — chips, selected fills. */
    val accentMuted: Color,
    /** Ink for text ON a teal fill. */
    val accentContrast: Color,

    // ── secondary blue + blueprint identity ─────────────────────────
    val secondaryBlue: Color,
    /**
     * The border/keyline base. Blueprint-blue on dark (the identity
     * rule: borders are never neutral grey); ink on light (matching
     * the web's rgba(24,34,44,…) border ramp). Alpha-composed at the
     * call site: `blueprintLine.copy(alpha = 0.12f)` etc.
     */
    val blueprintLine: Color,
    /** Pale blueprint text (labels over dark panels). */
    val blueprintPale: Color,

    // ── text tiers ───────────────────────────────────────────────────
    val text: Color,
    val textMuted: Color,
    val textDim: Color,

    // ── semantics ────────────────────────────────────────────────────
    val success: Color,
    val warning: Color,
    val danger: Color,
    val gold: Color,

    // ── translucent fill ramp (ghost buttons, chips, hover wells) ───
    // White-alpha over dark; ink-alpha over light.
    val fillFaint: Color,
    val fillSubtle: Color,
    val fillStrong: Color,
    val fillBold: Color,

    // ── canvas-tinted scrims (content fades under bars/sheets) ──────
    val scrimHeavy: Color,
    val scrimStrong: Color,
    val scrimSoft: Color,
    val scrimFaint: Color,

    // ── gradient stops for the standard surfaces ─────────────────────
    val cardTop: Color,
    val cardBottom: Color,
    /** Inner top-edge highlight on premium cards. */
    val cardEdge: Color,
    val fieldTop: Color,
    val fieldBottom: Color,
    val rowTop: Color,
    val rowBottom: Color,
)

/** The original brand-locked dark palette — values unchanged. */
val BhqDarkColors = BhqColors(
    isDark = true,

    canvas = Color(0xFF06080F),
    surface = Color(0xFF0E131F),
    surfaceElev = Color(0xFF141A2A),
    sheet = Color(0xFF0C1320),

    accent = Color(0xFF00D4C8),
    accentLight = Color(0xFF7EF5ED),
    accentDeep = Color(0xFF00B3A8),
    accentMuted = Color(0x2400D4C8),
    accentContrast = Color(0xFF031118),

    secondaryBlue = Color(0xFF1A5FD4),
    blueprintLine = Color(0xFF64B4FF),
    blueprintPale = Color(0xFFD6E2F2),

    text = Color(0xFFF5F7FF),
    textMuted = Color(0xFF8E9BB8),
    textDim = Color(0xFF5A6789),

    success = Color(0xFF5EEAD4),
    warning = Color(0xFFFBBF24),
    danger = Color(0xFFFB7185),
    gold = Color(0xFFF5C24A),

    fillFaint = Color(0x0AFFFFFF),
    fillSubtle = Color(0x14FFFFFF),
    fillStrong = Color(0x1FFFFFFF),
    fillBold = Color(0x30FFFFFF),

    scrimHeavy = Color(0xF205070D),
    scrimStrong = Color(0xCC070D18),
    scrimSoft = Color(0x99050810),
    scrimFaint = Color(0x66060A12),

    cardTop = Color(0xFF162033),
    cardBottom = Color(0xFF0C1424),
    cardEdge = Color(0x14CFE6FF),
    fieldTop = Color(0xFF121A28),
    fieldBottom = Color(0xFF0C1320),
    rowTop = Color(0xFF131C2B),
    rowBottom = Color(0xFF0C1320),
)

/** The web app's cream / ink / deep-teal palette, ported 1:1. */
val BhqLightColors = BhqColors(
    isDark = false,

    canvas = Color(0xFFECE7DD),        // --color-bg
    surface = Color(0xFFFFFFFF),       // --color-surface-1
    surfaceElev = Color(0xFFFAF8F3),   // --color-surface-2
    sheet = Color(0xFFFBFAF6),         // --color-bg-elev

    accent = Color(0xFF00D4C8),        // fills/glows only
    accentLight = Color(0xFF0A7D73),   // --color-accent-light (teal AS text)
    accentDeep = Color(0xFF077E76),    // --color-accent-deep
    accentMuted = Color(0x1F099489),   // rgba(9,148,137,.12)
    accentContrast = Color(0xFF031118),

    secondaryBlue = Color(0xFF1A5FD4),
    blueprintLine = Color(0xFF18222C), // ink — the web border base rgba(24,34,44,…)
    blueprintPale = Color(0xFF42606F), // --color-ink-muted

    text = Color(0xFF161C22),          // --color-text
    textMuted = Color(0xFF48535D),     // --color-text-muted
    textDim = Color(0xFF78828D),       // --color-text-dim

    success = Color(0xFF008A48),       // oklch(0.55 0.15 155)
    warning = Color(0xFFB26A08),       // --color-warning
    danger = Color(0xFFCC272E),        // oklch(0.55 0.2 25)
    gold = Color(0xFF8C5A12),          // amber-deep, readable on cream

    fillFaint = Color(0x0A18222C),
    fillSubtle = Color(0x1218222C),
    fillStrong = Color(0x1F18222C),
    fillBold = Color(0x3018222C),

    scrimHeavy = Color(0xF2ECE7DD),
    scrimStrong = Color(0xCCECE7DD),
    scrimSoft = Color(0x99ECE7DD),
    scrimFaint = Color(0x66E3DDD0),

    cardTop = Color(0xFFFFFFFF),
    cardBottom = Color(0xFFFAF8F3),
    cardEdge = Color(0xB3FFFFFF),
    fieldTop = Color(0xFFFFFFFF),
    fieldBottom = Color(0xFFFBFAF6),
    rowTop = Color(0xFFFFFFFF),
    rowBottom = Color(0xFFFAF8F3),
)
