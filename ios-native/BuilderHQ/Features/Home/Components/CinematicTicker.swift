/// CinematicTicker — a self-writing, looping status line.
///
/// Each line types itself out (with a soft blinking caret), holds for a
/// beat, then dissolves left→right through an animated gradient mask
/// before the next line types. Loops through whatever the dashboard
/// decides is most relevant right now. Honours Reduce Motion (falls back
/// to a static first line).
///
/// Used for the greeting subline on both dashboards.

import SwiftUI

struct CinematicTicker: View {
    let lines: [String]
    var font: Font = .system(size: 14, weight: .medium)
    var color: Color = Palette.textMuted
    var caretColor: Color = Palette.accent

    @State private var shown: String = ""
    @State private var wipe: CGFloat = 0          // 0 = fully shown, ~1.2 = fully dissolved
    @State private var caretLive: Bool = true     // hidden during the wipe
    @State private var caretBlink: Bool = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text(shown)
                .font(font)
                .foregroundStyle(color)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)

            RoundedRectangle(cornerRadius: 1, style: .continuous)
                .fill(caretColor)
                .frame(width: 2, height: 15)
                .opacity(caretLive ? (caretBlink ? 0.15 : 0.95) : 0)
                .shadow(color: caretColor.opacity(0.6), radius: 3)
        }
        // Mask sized to the TEXT (before the full-width frame) so the
        // dissolve starts exactly at the text's right edge.
        .mask(alignment: .leading) {
            // Reverse dissolve — clears from the RIGHT edge back toward
            // the left (the opposite of the L→R typing), with a wide
            // feather so each column melts into the background rather
            // than clipping. `1 - wipe` is the sharp/visible front.
            LinearGradient(
                stops: [
                    .init(color: .black, location: 0),
                    .init(color: .black, location: min(1, max(0, 1 - wipe))),
                    .init(color: .clear, location: min(1, max(0, 1 - wipe + 0.25))),
                    .init(color: .clear, location: 1),
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.65).repeatForever(autoreverses: true)) {
                caretBlink = true
            }
        }
        .task(id: lines) { await run() }
    }

    private func run() async {
        guard !lines.isEmpty else { shown = ""; return }

        // Reduce Motion: show the most-relevant line, no typing/looping.
        if reduceMotion {
            shown = lines[0]
            caretLive = false
            return
        }

        // Let the greeting's reveal settle before the first keystroke.
        try? await sleep(0.55)

        var i = 0
        while !Task.isCancelled {
            let line = lines[i % lines.count]
            caretLive = true
            shown = ""
            wipe = 0

            // Type it out.
            for ch in line {
                shown.append(ch)
                try? await sleep(delay(after: ch))
                if Task.isCancelled { return }
            }

            // Hold so it can actually be read.
            try? await sleep(2.6)
            if Task.isCancelled { return }

            // Dissolve right → left (un-write into the background).
            caretLive = false
            withAnimation(.easeInOut(duration: 0.9)) { wipe = 1.25 }
            try? await sleep(0.95)
            if Task.isCancelled { return }

            i += 1
            try? await sleep(0.15)
        }
    }

    /// Per-character cadence — a touch of variance reads as "typed",
    /// with a longer beat after sentence punctuation.
    private func delay(after ch: Character) -> Double {
        if ch == "." || ch == "!" || ch == "?" { return 0.22 }
        if ch == "," || ch == "—" { return 0.14 }
        return Double(Int.random(in: 26...46)) / 1000.0
    }

    private func sleep(_ seconds: Double) async throws {
        try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    }
}
