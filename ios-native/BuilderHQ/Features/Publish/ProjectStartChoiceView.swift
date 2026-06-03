/// ProjectStartChoiceView — the first thing in the publish wizard.
///
/// Two ways to begin a project listing:
///   · AI (hero): upload architectural plans and let Claude pre-fill
///     every field — the owner just reviews + publishes.
///   · Manual: fill the form step by step (the original flow).
///
/// Deliberately a fork, not a default — some owners aren't ready to
/// share plans yet, and that's fine.

import SwiftUI

struct ProjectStartChoiceView: View {
    let onAI: () -> Void
    let onManual: () -> Void
    let onClose: () -> Void

    @State private var appear = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    header
                    aiCard
                    manualCard
                    Spacer(minLength: 20)
                }
                .padding(.horizontal, 22)
                .padding(.top, 14)
            }
            .scrollIndicators(.hidden)
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.82).delay(0.05)) {
                appear = true
            }
        }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack {
            Press(haptic: .tap, action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Palette.surface.opacity(0.7)))
                    .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 6)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Kicker("New project")
            (
                Text("Two ways to ")
                    .font(Typography.ui(size: 30, weight: .semibold))
                    .foregroundStyle(Palette.text)
                + Text("begin.")
                    .font(Typography.serifItalic(size: 34))
                    .foregroundStyle(Palette.accent)
            )
            .fixedSize(horizontal: false, vertical: true)
            Text("Start with your plans for an instant draft, or fill it in yourself.")
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .opacity(appear ? 1 : 0)
        .offset(y: appear ? 0 : 10)
    }

    // MARK: - AI card (hero)

    private var aiCard: some View {
        Press(haptic: .select, action: onAI) {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 15, style: .continuous)
                            .fill(Palette.accentToBlue)
                        Image(systemName: "doc.text.viewfinder")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundStyle(Palette.accentContrast)
                    }
                    .frame(width: 56, height: 56)
                    .shadow(color: Palette.accentGlow.opacity(0.6), radius: 14, y: 5)

                    Spacer()

                    Text("FASTEST")
                        .font(.system(size: 9, weight: .black))
                        .tracking(1.2)
                        .foregroundStyle(Palette.accentContrast)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Palette.accentLight))
                }

                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 7) {
                        Text("Auto-fill from plans")
                            .font(.system(size: 19, weight: .bold))
                            .foregroundStyle(Palette.text)
                        Text("AI")
                            .font(.system(size: 9, weight: .black))
                            .tracking(0.8)
                            .foregroundStyle(Palette.accentContrast)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1.5)
                            .background(Capsule().fill(Palette.accentLight))
                    }
                    Text("Upload your architectural plans (PDF). We read them and fill in the project details — you just review and publish.")
                        .font(.system(size: 13.5, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                }

                HStack(spacing: 8) {
                    Image(systemName: "arrow.up.doc.fill")
                        .font(.system(size: 14, weight: .bold))
                    Text("Upload plans")
                        .font(.system(size: 14, weight: .bold))
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(Palette.accent)
                .padding(.top, 2)
            }
            .padding(20)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: Radius.hero, style: .continuous)
                        .fill(Palette.accent.opacity(0.08))
                    BlueprintGrid(spacing: 20, tint: Palette.accentLight, minorOpacity: 0.06)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.hero, style: .continuous))
                    BlueprintCornerTicks(inset: 12, length: 14, tint: Palette.accentLight, opacity: 0.4)
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radius.hero, style: .continuous)
                    .stroke(Palette.accent.opacity(0.4), lineWidth: 1)
            )
            .shadow(color: Palette.accentGlow.opacity(0.3), radius: 22, y: 8)
        }
        .opacity(appear ? 1 : 0)
        .offset(y: appear ? 0 : 18)
    }

    // MARK: - Manual card

    private var manualCard: some View {
        Press(haptic: .tap, action: onManual) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .fill(Palette.surfaceElev)
                        .overlay(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .stroke(Palette.hairlineStrong, lineWidth: 1)
                        )
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 3) {
                    Text("Enter details myself")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    Text("Fill the form step by step. You can add plans later.")
                        .font(.system(size: 12.5, weight: .regular))
                        .foregroundStyle(Palette.textDim)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 4)

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.textDim)
            }
            .padding(16)
            .cardSurface(.flat, radius: Radius.card)
        }
        .opacity(appear ? 1 : 0)
        .offset(y: appear ? 0 : 24)
    }
}
