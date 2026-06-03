/// Press — tap-aware container with haptic + scale.
///
/// SwiftUI port of the RN `<Press />`. Wraps any view with:
///   1. Haptic on press-in (NOT press-out — that's the iOS HIG default
///      for premium feel).
///   2. Scale-down to 0.97 on press, springs back on release.
///   3. Optional long-press handler.
///
/// On iOS 17+ we use `.sensoryFeedback` for the haptic. Below that
/// we'd fall back to UIImpactFeedbackGenerator, but the project's
/// minimum is iOS 17 so we don't bother.

import SwiftUI

/// Haptic profile used by `Press` and `PressButtonStyle`. Hoisted out
/// of `Press<Content>` so non-generic consumers (like ButtonStyle)
/// can reference it without specifying a phantom Content type.
enum PressHaptic {
    case tap     // .impact(weight: .light)
    case soft    // .impact(weight: .soft)
    case select  // .selection
    case none    // disabled

    @available(iOS 17.0, *)
    var feedback: SensoryFeedback? {
        switch self {
        case .tap:
            return .impact(weight: .light)
        case .soft:
            // `.soft` is a Flexibility, not a Weight — the API
            // splits the two axes. Soft flexibility on default
            // intensity gives the squishy tap we want for low-
            // emphasis presses (list rows in dense scrolls).
            return .impact(flexibility: .soft, intensity: 0.6)
        case .select:
            return .selection
        case .none:
            return nil
        }
    }
}

struct Press<Content: View>: View {
    /// Back-compat alias — existing call sites use `Press.HapticKind`.
    /// New code should reference `PressHaptic` directly.
    typealias HapticKind = PressHaptic

    let action: () -> Void
    var longPress: (() -> Void)? = nil
    var haptic: PressHaptic = .tap
    var scaleTo: CGFloat = 0.97
    let content: Content

    @State private var isPressed = false
    @State private var hapticTrigger = 0

    init(
        haptic: PressHaptic = .tap,
        scaleTo: CGFloat = 0.97,
        longPress: (() -> Void)? = nil,
        action: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.action = action
        self.longPress = longPress
        self.haptic = haptic
        self.scaleTo = scaleTo
        self.content = content()
    }

    var body: some View {
        content
            .scaleEffect(isPressed ? scaleTo : 1.0)
            .animation(Motion.easeOut, value: isPressed)
            .sensoryFeedback(trigger: hapticTrigger) { _, _ in
                haptic.feedback
            }
            .contentShape(Rectangle())
            .onTapGesture {
                hapticTrigger &+= 1
                action()
            }
            .gesture(
                LongPressGesture(minimumDuration: 0.4)
                    .onChanged { _ in isPressed = true }
                    .onEnded { _ in
                        isPressed = false
                        longPress?()
                    }
                    .simultaneously(
                        with: DragGesture(minimumDistance: 0)
                            .onChanged { _ in isPressed = true }
                            .onEnded { _ in isPressed = false }
                    )
            )
    }
}
