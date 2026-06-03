/// PressButtonStyle — the Press feel, as a ButtonStyle.
///
/// `Press` (the standalone view) installs its own `.onTapGesture` and
/// long-press handlers. That works fine for plain "tap me to do X"
/// surfaces, but it collides with `NavigationLink` and `Button`
/// containers — the inner tap gesture consumes the press before the
/// outer Button/NavigationLink can fire its action, which silently
/// breaks navigation.
///
/// This style gives the same haptic + scale-down feedback by reading
/// `configuration.isPressed`, so the outer gesture (NavigationLink's
/// Button or any other Button) keeps full ownership of the tap.
///
/// Usage:
///   NavigationLink(value: slug) {
///       SomeCardView()
///   }
///   .buttonStyle(PressButtonStyle())          // default tap haptic
///   .buttonStyle(PressButtonStyle(haptic: .soft, scaleTo: 0.985))
///
/// For pure-content cards being pushed to detail, prefer this over
/// `.buttonStyle(.plain)` so the press feel stays consistent across
/// the app.

import SwiftUI

struct PressButtonStyle: ButtonStyle {
    var haptic: PressHaptic = .tap
    var scaleTo: CGFloat = 0.985

    func makeBody(configuration: Configuration) -> some View {
        PressButtonStyleBody(
            configuration: configuration,
            haptic: haptic,
            scaleTo: scaleTo
        )
    }

    // Extracted into a real View so we can use @State for the haptic
    // trigger counter. ButtonStyle.makeBody can't own @State directly.
    private struct PressButtonStyleBody: View {
        let configuration: ButtonStyle.Configuration
        let haptic: PressHaptic
        let scaleTo: CGFloat

        @State private var hapticTrigger: Int = 0

        var body: some View {
            configuration.label
                .scaleEffect(configuration.isPressed ? scaleTo : 1.0)
                .animation(Motion.easeOut, value: configuration.isPressed)
                // Bump the trigger on the press-in edge so the haptic
                // fires the instant the finger lands, not on release.
                .onChange(of: configuration.isPressed) { _, newValue in
                    if newValue {
                        hapticTrigger &+= 1
                    }
                }
                .sensoryFeedback(trigger: hapticTrigger) { _, _ in
                    haptic.feedback
                }
        }
    }
}
