/// BrowseSearchBar — frosted search field for the Browse tab.
///
/// Pill-shaped, sits inside the sticky header. Magnifying-glass icon
/// on the left, optional clear (X) button on the right when the field
/// has text. Tapping outside the field dismisses the keyboard via the
/// parent's `scrollDismissesKeyboard` modifier.
///
/// Debounces input slightly via the parent's `.onChange` handler —
/// the view model itself doesn't refetch on every keystroke, only
/// once the user pauses.

import SwiftUI

struct BrowseSearchBar: View {
    @Binding var text: String
    var onSubmit: () -> Void = {}

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(isFocused ? Palette.accent : Palette.textDim)

            TextField("Search projects", text: $text)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Palette.text)
                .tint(Palette.accent)
                .focused($isFocused)
                .submitLabel(.search)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .onSubmit { onSubmit() }

            if !text.isEmpty {
                Press(haptic: .tap) {
                    text = ""
                    onSubmit()
                } content: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.textDim)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(
            Capsule()
                .fill(.regularMaterial)
        )
        .overlay(
            Capsule()
                .stroke(
                    isFocused
                        ? Palette.accent.opacity(0.6)
                        : Palette.cardBorder,
                    lineWidth: 1
                )
        )
        .shadow(
            color: isFocused ? Palette.accentGlow.opacity(0.4) : .clear,
            radius: 14
        )
        .animation(Motion.easeOutSoft, value: isFocused)
        .animation(Motion.easeOutSoft, value: text.isEmpty)
    }
}
