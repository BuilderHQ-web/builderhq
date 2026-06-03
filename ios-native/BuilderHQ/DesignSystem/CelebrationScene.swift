/// CelebrationScene — the shared, choreographed "moment" overlay.
///
/// One premium celebration system for every achievement in the app —
/// project published, builder unlocked, tender sent, tender awarded —
/// so they feel like one coherent, intentional language instead of
/// three hand-rolled one-offs.
///
/// The choreography (Strava-grade, but elegant/restrained):
///
///   stage 0  backdrop frosts in
///   stage 1  medallion springs in (0.7→1) + the ring begins to draw
///            itself around it  ·  light haptic
///   stage 2  ring completes, sonar ripples ping outward, icon bounces,
///            particles rise  ·  medium haptic
///   stage 3  headline rises + fades in
///   stage 4  detail / subtitle / metric resolve  ·  success haptic
///   stage 5  CTA (if any) rises in
///
/// The signature element is the **self-drawing progress ring** — an
/// angular teal→blue gradient stroke that sweeps closed like an Apple
/// activity ring completing. That single move is what makes it read
/// as "premium" rather than "a popup".
///
/// The scene runs its own entrance on `.onAppear`; the *parent* owns
/// when it's shown/hidden and any auto-dismiss timing (unchanged from
/// before). Pass a `cta` for a full-screen moment with a bottom
/// button; omit it for a centered auto-dismissing moment.

import SwiftUI

// MARK: - Tone

enum CelebrationTone {
    case accent   // teal — the everyday win (unlock, tender sent)
    case success  // brighter — project went live
    case gold     // the peak — tender awarded

    var primary: Color {
        switch self {
        case .accent:  return Palette.accent
        case .success: return Palette.accentLight
        case .gold:    return Color(hex: 0xF5C451)
        }
    }
    var secondary: Color {
        switch self {
        case .accent:  return Palette.blue
        case .success: return Palette.accent
        case .gold:    return Color(hex: 0xE08A2B)
        }
    }
    var glow: Color { primary.opacity(0.5) }
    var contrast: Color { Palette.accentContrast }
}

// MARK: - CTA

struct CelebrationCTA {
    let label: String
    let action: () -> Void
}

// MARK: - Scene

struct CelebrationScene: View {
    let symbol: String
    var tone: CelebrationTone = .accent
    /// Plain leading words of the headline (e.g. "Your project is").
    /// May be empty for a single-word headline.
    var titlePlain: String = ""
    /// The emphasis word, rendered in serif italic accent ("live.").
    let titleEmphasis: String
    /// Optional strong detail line (e.g. the project title).
    var detail: String? = nil
    var subtitle: String? = nil
    /// Optional metric pill (e.g. "You saved $249").
    var metric: String? = nil
    var metricIcon: String = "sparkles"
    var cta: CelebrationCTA? = nil

    /// Drives the staged choreography. Advanced on appear.
    @State private var stage: Int = 0
    /// 0→1 sweep that draws the ring closed.
    @State private var ringProgress: CGFloat = 0
    /// Toggles the continuous sonar ripple + medallion breathing.
    @State private var alive: Bool = false

    var body: some View {
        ZStack {
            backdrop

            if cta != nil {
                // Full-screen moment with a bottom CTA.
                VStack(spacing: 0) {
                    Spacer()
                    centerpiece
                    textBlock.padding(.top, 36)
                    Spacer()
                    Spacer()
                    ctaButton
                }
            } else {
                // Centered, auto-dismissing moment.
                VStack(spacing: 28) {
                    centerpiece
                    textBlock
                }
            }
        }
        .sensoryFeedback(trigger: stage) { _, s in
            switch s {
            case 1:  return .impact(weight: .light)
            case 2:  return .impact(weight: .medium)
            case 4:  return .success
            default: return nil
            }
        }
        .onAppear(perform: runChoreography)
    }

    // MARK: - Backdrop

    private var backdrop: some View {
        Rectangle()
            .fill(.ultraThinMaterial)
            .ignoresSafeArea()
            .overlay(Palette.canvas.opacity(0.55).ignoresSafeArea())
            .opacity(stage >= 0 ? 1 : 0)
    }

    // MARK: - Centerpiece (medallion + ring + ripples + particles)

    private var centerpiece: some View {
        ZStack {
            // Particle field rising behind the medallion.
            CelebrationSparkles(tone: tone, fire: alive)
                .frame(width: 300, height: 300)

            // Sonar ripples — three rings pinging outward. Technical /
            // radar feel that ties to the blueprint identity.
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .stroke(tone.primary.opacity(0.26), lineWidth: 1.1)
                    .frame(width: 116, height: 116)
                    .scaleEffect(alive ? 2.3 : 0.92)
                    .opacity(alive ? 0 : 0.7)
                    .animation(
                        .easeOut(duration: 1.9)
                            .repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.5),
                        value: alive
                    )
            }

            // Soft radial core glow.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [tone.primary.opacity(0.30), tone.primary.opacity(0.04)],
                        center: .center,
                        startRadius: 6,
                        endRadius: 80
                    )
                )
                .frame(width: 150, height: 150)
                .shadow(color: tone.glow, radius: 40)
                .scaleEffect(stage >= 1 ? 1 : 0.7)
                .opacity(stage >= 1 ? 1 : 0)

            // The self-drawing progress ring — the signature move.
            Circle()
                .trim(from: 0, to: ringProgress)
                .stroke(
                    AngularGradient(
                        colors: [
                            tone.primary, tone.secondary, tone.primary,
                        ],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: 3, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .frame(width: 132, height: 132)
                .shadow(color: tone.glow, radius: 10)

            // The icon.
            Image(systemName: symbol)
                .font(.system(size: 46, weight: .bold))
                .foregroundStyle(tone.primary)
                .shadow(color: tone.glow, radius: 18)
                .scaleEffect(stage >= 1 ? (alive ? 1.0 : 0.5) : 0.5)
                .opacity(stage >= 1 ? 1 : 0)
                .symbolEffect(.bounce, value: stage >= 2)
                .animation(.spring(response: 0.5, dampingFraction: 0.55), value: stage >= 1)
        }
        .frame(width: 200, height: 200)
    }

    // MARK: - Text

    private var textBlock: some View {
        VStack(spacing: 12) {
            // Headline — plain words + serif-italic emphasis word.
            VStack(spacing: -6) {
                if !titlePlain.isEmpty {
                    Text(titlePlain)
                        .font(Typography.ui(size: 27, weight: .medium))
                        .foregroundStyle(Palette.text)
                        .tracking(-0.4)
                }
                Text(titleEmphasis)
                    .font(Typography.serifItalic(size: titlePlain.isEmpty ? 40 : 38))
                    .foregroundStyle(tone.primary == Palette.accent ? Palette.accentLight : tone.primary)
                    .tracking(-0.4)
            }
            .opacity(stage >= 3 ? 1 : 0)
            .offset(y: stage >= 3 ? 0 : 14)

            if let detail {
                Text(detail)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .multilineTextAlignment(.center)
                    .padding(.top, 2)
                    .opacity(stage >= 4 ? 1 : 0)
                    .offset(y: stage >= 4 ? 0 : 10)
            }

            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Palette.textDim)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 40)
                    .opacity(stage >= 4 ? 1 : 0)
                    .offset(y: stage >= 4 ? 0 : 10)
            }

            if let metric {
                HStack(spacing: 6) {
                    Image(systemName: metricIcon)
                        .font(.system(size: 11, weight: .bold))
                    Text(metric)
                        .font(.system(size: 12, weight: .bold))
                        .tracking(0.2)
                }
                .foregroundStyle(tone.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Capsule().fill(tone.primary.opacity(0.12)))
                .overlay(Capsule().stroke(tone.primary.opacity(0.35), lineWidth: 1))
                .padding(.top, 6)
                .opacity(stage >= 4 ? 1 : 0)
                .scaleEffect(stage >= 4 ? 1 : 0.9)
            }
        }
        .animation(.spring(response: 0.55, dampingFraction: 0.86), value: stage)
    }

    // MARK: - CTA

    @ViewBuilder
    private var ctaButton: some View {
        if let cta {
            Button(action: cta.action) {
                HStack(spacing: 10) {
                    Text(cta.label)
                        .font(.system(size: 16, weight: .bold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundStyle(tone.contrast)
                .frame(height: 56)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(tone.primary))
                .shadow(color: tone.glow, radius: 22, x: 0, y: 10)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
            .opacity(stage >= 5 ? 1 : 0)
            .offset(y: stage >= 5 ? 0 : 14)
            .animation(.spring(response: 0.55, dampingFraction: 0.86), value: stage >= 5)
        }
    }

    // MARK: - Choreography

    private func runChoreography() {
        // Backdrop is up at stage 0 immediately.
        advance(to: 1, after: 0.10) {
            withAnimation(.easeOut(duration: 0.95)) { ringProgress = 1 }
        }
        advance(to: 2, after: 0.34) {
            withAnimation(.easeOut(duration: 0.2)) { alive = true }
        }
        advance(to: 3, after: 0.50)
        advance(to: 4, after: 0.70)
        advance(to: 5, after: 0.92)
    }

    private func advance(to value: Int, after delay: Double, _ extra: (() -> Void)? = nil) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            stage = value
            extra?()
        }
    }
}

// MARK: - Particle field

/// Refined sparkle field — small tone-tinted dots that rise and fade
/// once on `fire`. Varied size / drift / lifetime so it reads as a
/// gentle shimmer, never a confetti dump.
private struct CelebrationSparkles: View {
    let tone: CelebrationTone
    let fire: Bool

    private struct Particle: Identifiable {
        let id: Int
        let x: CGFloat
        let yStart: CGFloat
        let size: CGFloat
        let delay: Double
        let duration: Double
        let useSecondary: Bool
    }

    // Deterministic spread (no Math.random at runtime — varied by index).
    private let particles: [Particle] = (0..<16).map { i in
        let golden = Double(i) * 2.399963   // golden-angle scatter
        let x = CGFloat(cos(golden)) * CGFloat(40 + (i % 5) * 22)
        return Particle(
            id: i,
            x: x,
            yStart: CGFloat((i * 37) % 60) - 10,
            size: CGFloat(3 + (i % 3)),
            delay: Double(i % 6) * 0.05,
            duration: 1.7 + Double(i % 4) * 0.25,
            useSecondary: i % 3 == 0
        )
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(particles) { p in
                    Circle()
                        .fill(p.useSecondary ? tone.secondary : tone.primary)
                        .frame(width: p.size, height: p.size)
                        .shadow(color: tone.glow, radius: 5)
                        .position(
                            x: geo.size.width / 2 + p.x,
                            y: fire
                                ? geo.size.height * 0.18
                                : geo.size.height * 0.56 + p.yStart
                        )
                        .opacity(fire ? 0 : 0.9)
                        .animation(
                            .easeOut(duration: p.duration).delay(p.delay),
                            value: fire
                        )
                }
            }
        }
    }
}
