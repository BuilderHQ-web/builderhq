/// SavedOverlay — a premium "saved" confirmation.
///
/// A frosted scrim + a medallion with a self-drawing checkmark, sonar
/// ripples, and a soft sparkle. Pops in with a spring + a haptic, then
/// dismisses itself after a beat. Tapping anywhere dismisses early.
/// `onDismiss` fires exactly once (auto or tap).
///
///   .overlay { if showSaved { SavedOverlay(title: "Changes saved") { … } } }

import SwiftUI

struct SavedOverlay: View {
    var title: String = "Changes saved"
    var subtitle: String? = "Your updates are live"
    /// Seconds before it auto-dismisses.
    var autoDismissAfter: Double = 2.4
    let onDismiss: () -> Void

    @State private var live = false        // guards single dismiss
    @State private var appear = false
    @State private var ring: CGFloat = 0   // 0→1 draws the ring
    @State private var pulse = false       // sonar
    @State private var checkIn = false

    var body: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
            Color.black.opacity(0.3).ignoresSafeArea()

            VStack(spacing: 16) {
                medallion
                VStack(spacing: 4) {
                    Text(title)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(Palette.text)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Palette.textMuted)
                    }
                }
                .opacity(appear ? 1 : 0)
                .offset(y: appear ? 0 : 8)
            }
            .padding(.horizontal, 36).padding(.vertical, 34)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(Palette.surface.opacity(0.85))
                    .overlay(RoundedRectangle(cornerRadius: 28, style: .continuous).stroke(Palette.accent.opacity(0.25), lineWidth: 1))
                    .shadow(color: Palette.accentGlow.opacity(0.35), radius: 30, y: 12)
            )
            .scaleEffect(appear ? 1 : 0.9)
            .opacity(appear ? 1 : 0)
        }
        .contentShape(Rectangle())
        .onTapGesture { close() }
        .onAppear { start() }
        .task {
            try? await Task.sleep(for: .seconds(autoDismissAfter))
            close()
        }
        .sensoryFeedback(.success, trigger: checkIn)
    }

    private var medallion: some View {
        ZStack {
            // Sonar ripples.
            ForEach(0..<2, id: \.self) { i in
                Circle()
                    .stroke(Palette.accent.opacity(0.5), lineWidth: 1.5)
                    .frame(width: 78, height: 78)
                    .scaleEffect(pulse ? 1.7 : 0.9)
                    .opacity(pulse ? 0 : 0.6)
                    .animation(
                        .easeOut(duration: 1.8).repeatForever(autoreverses: false).delay(Double(i) * 0.9),
                        value: pulse
                    )
            }
            // Filled medallion.
            Circle()
                .fill(Palette.accentToBlue)
                .frame(width: 72, height: 72)
                .shadow(color: Palette.accentGlow.opacity(0.6), radius: 16, y: 6)
            // Drawing ring.
            Circle()
                .trim(from: 0, to: ring)
                .stroke(Color.white.opacity(0.9), style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .frame(width: 72, height: 72)
                .rotationEffect(.degrees(-90))
            // Checkmark.
            Image(systemName: "checkmark")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(Palette.accentContrast)
                .scaleEffect(checkIn ? 1 : 0.4)
                .opacity(checkIn ? 1 : 0)
        }
    }

    private func start() {
        live = true
        withAnimation(.spring(response: 0.45, dampingFraction: 0.7)) { appear = true }
        withAnimation(.easeOut(duration: 0.6)) { ring = 1 }
        withAnimation(.spring(response: 0.5, dampingFraction: 0.55).delay(0.15)) { checkIn = true }
        pulse = true
    }

    private func close() {
        guard live else { return }
        live = false
        withAnimation(.easeOut(duration: 0.25)) { appear = false }
        // Let the fade play before handing control back.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.26) { onDismiss() }
    }
}
