/// HomeStickyHeader — always-on liquid-glass top bar.
///
/// The Revolut / Apple Wallet pattern:
///   · `.ultraThinMaterial` permanent fill so the header is visible
///     at all times — the wordmark always sits on frosted glass.
///   · iOS's GPU-accelerated material samples whatever's behind the
///     view every frame, so as content scrolls upward into the
///     header zone it visibly frosts through.
///   · A very faint top-edge gloss + a hair-thin bottom highlight
///     give the glass plate physical-feeling depth without ever
///     reading as a "divider line".
///   · Extends up into the status-bar zone so the dynamic island /
///     time / battery sit on the same frosted surface as the
///     wordmark — no chrome-on-chrome collision.
///
/// scrollOffset is still piped in (PreferenceKey-backed) in case
/// future iterations want to morph the header on scroll (e.g. a
/// title fade-in once the greeting passes), but the glass itself
/// is constant.

import SwiftUI

struct HomeStickyHeader: View {
    /// Drives the scroll-morph: the wordmark hands off to a compact
    /// greeting as the big greeting scrolls away.
    let scrollOffset: CGFloat
    /// Compact title that fades in on scroll (e.g. the user's name).
    var compactTitle: String? = nil

    @State private var dotPulse: Bool = false

    /// 0 at the top → 1 once scrolled past the greeting. Buttery because
    /// it's scroll-linked (no spring) — interpolates every frame.
    private var morph: CGFloat {
        guard compactTitle != nil else { return 0 }
        return min(1, max(0, (scrollOffset - 28) / 56))
    }

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(Palette.accent)
                .frame(width: 6, height: 6)
                .shadow(color: Palette.accentGlow, radius: 6)
                .scaleEffect(dotPulse ? 1.0 : 0.78)
                .animation(
                    .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                    value: dotPulse
                )

            ZStack(alignment: .leading) {
                // Brand wordmark — "Builder" + teal "HQ" (mirrors the
                // web logo's teal accent), not generic tracked caps.
                (
                    Text("Builder").foregroundStyle(Palette.text)
                    + Text("HQ").foregroundStyle(Palette.accent)
                )
                .font(.system(size: 16, weight: .bold))
                .tracking(0.2)
                .opacity(1 - morph)
                .offset(y: -10 * morph)

                if let compactTitle {
                    Text(compactTitle)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                        .opacity(morph)
                        .offset(y: 12 * (1 - morph))
                }
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 14)
        .background(
            ZStack(alignment: .bottom) {
                // 1. Frosted glass — Apple's GPU-rendered live blur.
                //    Samples whatever's behind it every frame so
                //    scrolling content gets a real-time frost.
                Rectangle()
                    .fill(.ultraThinMaterial)

                // 2. Very faint top-edge gloss — fakes light catching
                //    the upper edge of the glass plate. Reads as
                //    "this glass has thickness" rather than a flat
                //    sheet of color. PlusLighter blend keeps it bright
                //    on dark + invisible on lighter passes.
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.06),
                        Color.white.opacity(0),
                    ],
                    startPoint: .top,
                    endPoint: .center
                )
                .blendMode(.plusLighter)
                .allowsHitTesting(false)

                // 3. Hair-thin highlight along the BOTTOM edge — the
                //    counterpart to the top gloss. Together they
                //    sandwich the glass with a soft luminance, giving
                //    a tangible "depth" without ever being a visible
                //    line. Mixed via plusLighter so it disappears
                //    when scrolled content behind is bright.
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Palette.accent.opacity(0),
                                Palette.accent.opacity(0.18),
                                Palette.accent.opacity(0),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 0.5)
                    .blendMode(.plusLighter)
                    .allowsHitTesting(false)
            }
            // Extend the entire stack UP into the status-bar zone so
            // time / dynamic island / battery sit on the same
            // frosted surface as the wordmark.
            .ignoresSafeArea(edges: .top)
        )
        .onAppear { dotPulse = true }
    }
}

// MARK: - Scroll offset tracking

/// PreferenceKey that propagates the scroll-content's top edge offset
/// up the view tree. Kept around for future scroll-driven effects on
/// the header (e.g. morphing the wordmark into a section title once
/// the greeting passes).
struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

// MARK: - Reliable scroll-offset tracking (iOS 18+)

extension View {
    /// Drives a scroll-offset value from the canonical `ScrollGeometry`
    /// on iOS 18+ (reliable, every frame). On iOS 17 it's a no-op — those
    /// screens fall back to the GeometryReader + PreferenceKey path.
    /// Value is 0 at the natural top, positive when scrolled down,
    /// negative when over-scrolled (pulled) at the top.
    @ViewBuilder
    func trackScrollOffset(_ onChange: @escaping (CGFloat) -> Void) -> some View {
        if #available(iOS 18.0, *) {
            self.onScrollGeometryChange(for: CGFloat.self) { geo in
                geo.contentOffset.y + geo.contentInsets.top
            } action: { _, newValue in
                onChange(newValue)
            }
        } else {
            self
        }
    }
}
