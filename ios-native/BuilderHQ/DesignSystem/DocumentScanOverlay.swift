/// DocumentScanOverlay — the immersive "reading your document" moment.
///
/// Shared by every PDF auto-fill flow (tender quotes, project plans).
/// A stylised document sits under a sweeping teal scan-beam; faux
/// content lines light up as the beam passes, selling the idea that
/// the document is being read line-by-line. Pure theatre over a real
/// network round-trip — but it turns a 3-30s wait into a moment.
///
/// Caller-agnostic: pass the `title` + `subtitle` to show (each flow
/// computes them from its own phase). The parent shows/hides it and
/// animates the opacity.

import SwiftUI

struct DocumentScanOverlay: View {
    let title: String
    var subtitle: String? = nil
    var accent: Color = Palette.accent

    /// Number of faux content lines on the document.
    private let lineCount = 8

    var body: some View {
        ZStack {
            // Dim + blur everything behind so the document is the focus.
            Rectangle()
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
                .ignoresSafeArea()
            Color.black.opacity(0.35).ignoresSafeArea()

            VStack(spacing: 28) {
                scanningDocument
                statusBlock
            }
            .padding(.horizontal, 40)
        }
        .transition(.opacity)
    }

    // MARK: - Document

    private var scanningDocument: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            // 2.4s cycle, ping-pong so the beam sweeps down then back up.
            let cycle = (t.truncatingRemainder(dividingBy: 2.4)) / 2.4
            let tri = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2
            let eased = tri * tri * (3 - 2 * tri)
            documentCard(progress: eased)
        }
        .frame(width: 196, height: 244)
    }

    private func documentCard(progress: Double) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Palette.surfaceElev)
            BlueprintGrid(spacing: 15, tint: .white, minorOpacity: 0.05)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            VStack(alignment: .leading, spacing: 11) {
                HStack(spacing: 7) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(lineFilled(0, progress: progress) ? accent : Palette.hairlineStrong)
                        .frame(width: 13, height: 13)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(lineFilled(0, progress: progress) ? Palette.accentLight : Palette.hairlineStrong)
                        .frame(width: 74, height: 9)
                }
                .padding(.bottom, 2)

                ForEach(1..<lineCount, id: \.self) { i in
                    Capsule()
                        .fill(lineFilled(i, progress: progress) ? accent.opacity(0.85) : Palette.hairline)
                        .frame(width: lineWidth(i), height: 7)
                        .animation(.easeOut(duration: 0.25), value: lineFilled(i, progress: progress))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(22)

            scanBeam
                .frame(height: 3)
                .frame(maxWidth: .infinity)
                .offset(y: beamOffset(progress: progress))

            BlueprintCornerTicks(inset: 10, length: 13, tint: Palette.accentLight, opacity: 0.6)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(accent.opacity(0.35), lineWidth: 1)
        )
        .shadow(color: Palette.accentGlow.opacity(0.55), radius: 28, y: 10)
    }

    private var scanBeam: some View {
        ZStack {
            LinearGradient(
                colors: [accent.opacity(0), accent.opacity(0.5), accent.opacity(0)],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 40)
            .blur(radius: 7)
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [accent.opacity(0), Palette.accentLight, accent.opacity(0)],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .frame(height: 2.5)
                .shadow(color: Palette.accentLight, radius: 6)
        }
        .padding(.horizontal, 12)
        .allowsHitTesting(false)
    }

    private func beamOffset(progress: Double) -> CGFloat {
        let travel: CGFloat = 200
        return -travel / 2 + travel * CGFloat(progress)
    }

    private func lineFilled(_ index: Int, progress: Double) -> Bool {
        let fraction = Double(index) / Double(lineCount - 1)
        return progress >= fraction - 0.02
    }

    private func lineWidth(_ index: Int) -> CGFloat {
        let widths: [CGFloat] = [150, 120, 138, 96, 132, 108, 142, 88, 124]
        return widths[index % widths.count]
    }

    // MARK: - Status

    private var statusBlock: some View {
        VStack(spacing: 8) {
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { i in
                    ScanPulseDot(delay: Double(i) * 0.18)
                }
            }
            .padding(.bottom, 2)

            Text(title)
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(Palette.text)
                .contentTransition(.opacity)
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: title)
    }
}

/// A single softly-pulsing dot for the "working…" indicator.
private struct ScanPulseDot: View {
    let delay: Double
    @State private var on = false

    var body: some View {
        Circle()
            .fill(Palette.accent)
            .frame(width: 6, height: 6)
            .opacity(on ? 1 : 0.3)
            .scaleEffect(on ? 1 : 0.7)
            .onAppear {
                withAnimation(
                    .easeInOut(duration: 0.6)
                        .repeatForever(autoreverses: true)
                        .delay(delay)
                ) { on = true }
            }
    }
}
