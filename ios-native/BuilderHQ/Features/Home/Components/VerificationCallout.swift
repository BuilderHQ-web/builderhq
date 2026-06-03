/// VerificationCallout — surfaces approval status for builders who
/// aren't yet `approved`. Same role as the web's `<VerificationCallout>`
/// but redesigned for mobile (less space, more presence).
///
/// Three visual treatments depending on what the server returned:
///
///   · `incomplete` — still wrapping up onboarding. Shouldn't happen
///                    on the home tab (we gate the dashboard on
///                    completed onboarding) but we handle it gracefully.
///   · `pending_review` — ABN + at least one licence verified. We're
///                        waiting on admin sign-off. Pulsing review pill.
///   · `pending_review` w/ missing verification — soft amber tone, says
///                        what's still missing.
///   · `rejected` / `suspended` — danger tone, says they need to talk
///                                to support.
///
/// Card always renders a two-row checklist of (ABN verified) +
/// (licence verified) so the user can see at a glance what's done.

import SwiftUI

struct VerificationCallout: View {
    let approvalStatus: String
    let abnVerified: Bool
    let anyLicenceVerified: Bool

    @State private var pulse = false
    @State private var hourglassTick = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Status pill — colour + label vary by state. Hourglass
            // rotates 180° every 2.4 seconds via .symbolEffect(.rotate)
            // so the card has a heartbeat without being noisy.
            HStack(spacing: 8) {
                Image(systemName: pillIcon)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(pillTone)
                    // `.pulse` is iOS 17-compatible (vs `.rotate`
                    // which needs iOS 18). Re-fires every 2.4s via the
                    // `hourglassTick` counter so the symbol breathes.
                    .symbolEffect(.pulse, value: hourglassTick)
                Text(pillLabel)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(pillTone)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Capsule().fill(pillTone.opacity(0.12)))
            .overlay(Capsule().stroke(pillTone.opacity(0.35), lineWidth: 1))
            .scaleEffect(pulse ? 1.03 : 1)
            .animation(
                .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                value: pulse
            )
            .onAppear { pulse = true }
            .onReceive(
                // Repeating timer fires the rotate symbol effect.
                Timer.publish(every: 2.4, on: .main, in: .common).autoconnect()
            ) { _ in hourglassTick &+= 1 }

            // Headline + body
            VStack(alignment: .leading, spacing: 6) {
                Text(headline)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .tracking(-0.3)
                Text(body_)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Checklist — quick at-a-glance summary of what's done
            VStack(spacing: 8) {
                ChecklistRow(
                    label: "ABN verified against ABR",
                    isComplete: abnVerified
                )
                ChecklistRow(
                    label: "Builder licence on file",
                    isComplete: anyLicenceVerified
                )
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(.lifted, radius: 24, borderColor: pillTone.opacity(0.32))
    }

    // MARK: - Derived display props

    private var pillTone: Color {
        switch approvalStatus {
        case "approved":
            return Palette.success
        case "rejected", "suspended":
            return Palette.danger
        case "pending_review":
            return Palette.accent
        default:
            return Palette.warning
        }
    }

    private var pillLabel: String {
        switch approvalStatus {
        case "pending_review": return "REVIEWING"
        case "rejected": return "ACTION NEEDED"
        case "suspended": return "ACCOUNT PAUSED"
        case "incomplete": return "INCOMPLETE"
        default: return approvalStatus.uppercased()
        }
    }

    private var pillIcon: String {
        switch approvalStatus {
        case "pending_review": return "hourglass"
        case "rejected", "suspended": return "exclamationmark.triangle.fill"
        case "incomplete": return "circle.dotted"
        default: return "circle"
        }
    }

    private var headline: String {
        switch approvalStatus {
        case "pending_review":
            return "We're reviewing your account."
        case "rejected":
            return "Your application needs attention."
        case "suspended":
            return "Your account is on hold."
        case "incomplete":
            return "Finish setting up your profile."
        default:
            return "Account under review."
        }
    }

    private var body_: String {
        switch approvalStatus {
        case "pending_review":
            return abnVerified && anyLicenceVerified
                ? "Both checks landed — we'll be in touch within 24 hours. You can browse projects in the meantime."
                : "We're working through your details. The items below are still in review."
        case "rejected":
            return "Tap support@builderhq.com.au and we'll walk you through what's needed."
        case "suspended":
            return "Get in touch with support@builderhq.com.au to reactivate."
        case "incomplete":
            return "Open the You tab to pick up where you left off."
        default:
            return "Hang tight — we'll have an answer soon."
        }
    }
}

// MARK: - Checklist row

private struct ChecklistRow: View {
    let label: String
    let isComplete: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: isComplete ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(isComplete ? Palette.accent : Palette.textDim)
                .symbolEffect(.bounce, value: isComplete)
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(isComplete ? Palette.text : Palette.textMuted)
            Spacer()
        }
    }
}
