/// ConfirmOverlay — a premium, centred confirmation modal.
///
/// A frosted scrim + a centred card with an icon medallion, title,
/// optional message, and a stacked Confirm / Cancel. Replaces SwiftUI's
/// `.confirmationDialog` where we want full control over presentation
/// (no anchored popover) and the brand look. Tapping the scrim cancels.
///
///   .overlay { if confirming { ConfirmOverlay(title: "Sign out?", …) } }

import SwiftUI

struct ConfirmOverlay: View {
    var icon: String = "exclamationmark.triangle.fill"
    var iconTint: Color = Palette.danger
    let title: String
    var message: String? = nil
    var confirmLabel: String = "Confirm"
    var confirmTint: Color = Palette.danger
    let onConfirm: () -> Void
    let onCancel: () -> Void

    @State private var appear = false
    @State private var live = true

    var body: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
                .opacity(appear ? 1 : 0)
            Color.black.opacity(appear ? 0.4 : 0)
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture { close(false) }

            card
                .scaleEffect(appear ? 1 : 0.9)
                .opacity(appear ? 1 : 0)
        }
        .onAppear { withAnimation(.spring(response: 0.42, dampingFraction: 0.82)) { appear = true } }
        .sensoryFeedback(.warning, trigger: appear)
    }

    private var card: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle().fill(iconTint.opacity(0.16)).frame(width: 60, height: 60)
                Image(systemName: icon)
                    .font(.system(size: 25, weight: .bold))
                    .foregroundStyle(iconTint)
            }
            VStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Palette.text)
                    .multilineTextAlignment(.center)
                if let message {
                    Text(message)
                        .font(.system(size: 13.5, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            VStack(spacing: 8) {
                Press(haptic: .tap) { close(true) } content: {
                    Text(confirmLabel)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity).frame(height: 50)
                        .background(Capsule().fill(confirmTint))
                        .shadow(color: confirmTint.opacity(0.4), radius: 14, y: 6)
                }
                Press(haptic: .tap) { close(false) } content: {
                    Text("Cancel")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .contentShape(Rectangle())
                }
            }
            .padding(.top, 2)
        }
        .padding(.horizontal, 24).padding(.top, 28).padding(.bottom, 14)
        .frame(maxWidth: 360)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Palette.surface.opacity(0.96))
                .overlay(RoundedRectangle(cornerRadius: 28, style: .continuous).stroke(Palette.hairlineStrong, lineWidth: 1))
                .shadow(color: .black.opacity(0.45), radius: 30, y: 16)
        )
        .padding(.horizontal, 32)
    }

    private func close(_ confirmed: Bool) {
        guard live else { return }
        live = false
        withAnimation(.easeOut(duration: 0.18)) { appear = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.19) {
            if confirmed { onConfirm() } else { onCancel() }
        }
    }
}
