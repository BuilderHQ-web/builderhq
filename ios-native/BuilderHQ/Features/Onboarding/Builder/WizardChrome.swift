/// WizardChrome — shared header / footer / progress views used by the
/// builder onboarding wizard. Kept in one file because each piece is
/// small and reads more clearly together than across three files.

import SwiftUI

// MARK: - Progress dots

/// Slim pill-and-dots progress indicator. The current step is a
/// horizontally elongated pill in accent; past steps are solid accent
/// dots; future steps are hairline dots. A floating "1 of 7" caption
/// to the right gives explicit count context without crowding the bar.
///
/// Animates the pill widening / contracting on step change, plus a
/// staggered fill on past steps so jumping multiple steps reads as
/// natural progression rather than a snap.
struct WizardProgress: View {
    let total: Int
    let current: Int   // 0-indexed

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 6) {
                ForEach(0..<total, id: \.self) { index in
                    Capsule()
                        .fill(fillColor(for: index))
                        .frame(
                            width: index == current ? 26 : 6,
                            height: 6
                        )
                        .shadow(
                            color: index == current ? Palette.accentGlow : .clear,
                            radius: 6
                        )
                        .animation(
                            .spring(response: 0.45, dampingFraction: 0.78),
                            value: current
                        )
                }
            }

            Text("\(current + 1) of \(total)")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(Palette.textDim)
                .monospacedDigit()
        }
    }

    private func fillColor(for index: Int) -> Color {
        if index < current { return Palette.accent.opacity(0.85) }
        if index == current { return Palette.accent }
        return Palette.hairlineStrong
    }
}

// MARK: - Wizard step header

/// Standardised header block — step index, title, optional caption.
/// Uses the same single-Text concat the auth headlines use so the
/// italic accent kisses the line above.
struct WizardHeader: View {
    /// "01", "02", … shown small and accent-tinted.
    let index: String
    let kicker: String
    let title: String
    /// Italicised accent fragment displayed below `title`. Use a one-
    /// or two-word phrase (e.g. "your business.").
    let titleAccent: String
    let caption: String?

    init(
        index: String,
        kicker: String,
        title: String,
        titleAccent: String,
        caption: String? = nil
    ) {
        self.index = index
        self.kicker = kicker
        self.title = title
        self.titleAccent = titleAccent
        self.caption = caption
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Small kicker row — index + step label
            HStack(spacing: 8) {
                Text(index)
                    .font(.system(
                        size: 11,
                        weight: .bold,
                        design: .monospaced
                    ))
                    .tracking(2)
                    .foregroundStyle(Palette.accent)
                Text("/")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.textDim)
                Text(kicker.uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(Palette.textDim)
            }

            (
                Text(title + "\n")
                    .font(Typography.ui(size: 38, weight: .medium))
                    .foregroundStyle(Palette.text)
                + Text(titleAccent)
                    .font(Typography.serifItalic(size: 38))
                    .foregroundStyle(Palette.accentLight)
            )
            .tracking(-0.5)
            .lineSpacing(-4)

            if let caption = caption {
                Text(caption)
                    .font(Typography.body)
                    .foregroundStyle(Palette.textMuted)
            }
        }
    }
}

// MARK: - Wizard footer (Back + Continue)

/// Sticky footer with two affordances:
///   · Back (chevron + "Back") — left side, hidden on step 1
///   · Continue / Submit pill   — right side, primary CTA
///
/// The pill morphs through idle → spinner → checkmark just like the
/// auth submit button so completing a step feels consistent with the
/// rest of the app.
struct WizardFooter: View {
    let canContinue: Bool
    let isSaving: Bool
    let continueLabel: String
    let isFinal: Bool
    let onBack: (() -> Void)?
    let onContinue: () -> Void

    init(
        canContinue: Bool,
        isSaving: Bool,
        continueLabel: String = "Continue",
        isFinal: Bool = false,
        onBack: (() -> Void)?,
        onContinue: @escaping () -> Void
    ) {
        self.canContinue = canContinue
        self.isSaving = isSaving
        self.continueLabel = continueLabel
        self.isFinal = isFinal
        self.onBack = onBack
        self.onContinue = onContinue
    }

    var body: some View {
        HStack(spacing: 12) {
            if let onBack = onBack {
                Press(haptic: .tap, action: onBack) {
                    HStack(spacing: 6) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .bold))
                        Text("Back")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 18)
                    .frame(height: 52)
                    .background(
                        Capsule().fill(Palette.surface)
                    )
                    .overlay(
                        Capsule().stroke(Palette.hairline, lineWidth: 1)
                    )
                }
            }

            // Continue / Submit pill — fills remaining width.
            Button(action: onContinue) {
                ZStack {
                    Capsule()
                        .fill(canContinue ? Palette.accent : Palette.surfaceElev)
                        .shadow(
                            color: canContinue ? Palette.accentGlow : .clear,
                            radius: 22,
                            x: 0,
                            y: 10
                        )

                    if isSaving {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(Palette.accentContrast)
                            .transition(.opacity)
                    } else {
                        HStack(spacing: 10) {
                            Text(continueLabel)
                                .font(.system(size: 16, weight: .bold))
                            Image(systemName: isFinal ? "checkmark" : "arrow.right")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundStyle(canContinue ? Palette.accentContrast : Palette.textDim)
                        .transition(.opacity)
                    }
                }
                .frame(height: 52)
                .frame(maxWidth: .infinity)
                .animation(Motion.easeOut, value: isSaving)
                .animation(Motion.easeOut, value: canContinue)
            }
            .disabled(!canContinue || isSaving)
            .sensoryFeedback(.impact(weight: .medium), trigger: isSaving)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 16)
        .padding(.top, 12)
        // No background — the footer is stacked beneath the step's
        // ScrollView (not overlaying it), so the AmbientBackground shows
        // through cleanly. A gradient here only painted a flat strip
        // across the bottom safe-area with nothing behind it to fade.
    }
}

// MARK: - Inline banner error (shared with auth flows)

struct WizardBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .foregroundStyle(Palette.danger)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Palette.dangerMuted)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Palette.danger.opacity(0.35), lineWidth: 1)
        )
    }
}

// MARK: - Section block (used on multi-section steps)

/// Numbered subsection within a step (e.g. "02 / Business address",
/// "02 / Postal address" in step 2). Less heavy than WizardHeader.
struct WizardSectionLabel: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(2.2)
            .foregroundStyle(Palette.textDim)
    }
}
