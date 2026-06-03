/// PremiumTextField — the BuilderHQ form input.
///
/// Pill-shaped, dark frosted, with a smooth border + label transition
/// on focus. Inspired by Linear / Cluely / Revolut form fields, with
/// our teal accent as the focus highlight.
///
/// States:
///   · idle      → hairline border, label as placeholder inside
///   · focused   → accent-tinted border + soft outer accent glow,
///                 label lifts to a small caption above the value
///   · error     → danger-tinted border + small error text below
///
/// Keyboard handling:
///   · `keyboardType` + `textContentType` so iOS suggests the right
///     QuickType chips (email autocomplete, password manager, etc.)
///   · `submitLabel` shows the right Return key (next / done / go)

import SwiftUI

struct PremiumTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String? = nil
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType? = nil
    var isSecure: Bool = false
    var submitLabel: SubmitLabel = .next
    var error: String? = nil
    var onSubmit: (() -> Void)? = nil

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Field
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: hasFloatingLabel ? 4 : 0) {
                    if hasFloatingLabel {
                        Text(label)
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(labelColor)
                            .tracking(1.4)
                            .textCase(.uppercase)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }

                    Group {
                        // When the floating label is up, hide the
                        // in-field placeholder so we never see the same
                        // text twice (e.g. "Password" both floating AND
                        // as the empty-field placeholder).
                        let p = hasFloatingLabel ? "" : (placeholder ?? label)
                        if isSecure {
                            SecureField(p, text: $text)
                        } else {
                            TextField(p, text: $text)
                        }
                    }
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Palette.text)
                    .tint(Palette.accent)
                    .focused($isFocused)
                    .keyboardType(keyboardType)
                    .textContentType(textContentType)
                    .submitLabel(submitLabel)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(
                        // No auto-cap for emails OR secure fields. The
                        // .sentences default was capitalising the first
                        // letter of typed passwords — annoying for any
                        // password that isn't a proper noun.
                        (keyboardType == .emailAddress || isSecure)
                            ? .never : .sentences
                    )
                    .onSubmit { onSubmit?() }
                    // Number-pad keyboards have no Return key. Without a
                    // Done toolbar the user gets stuck with the keyboard
                    // up after typing a digit field — there's nothing to
                    // press to dismiss. Attach the toolbar only to those
                    // kinds; other keyboards already have a submitLabel.
                    .toolbar {
                        if isFocused && needsDoneToolbar {
                            ToolbarItemGroup(placement: .keyboard) {
                                Spacer()
                                Button("Done") { isFocused = false }
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Palette.accentLight)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Palette.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
            .shadow(
                color: isFocused ? Palette.accentGlow.opacity(0.5) : .clear,
                radius: isFocused ? 14 : 0,
                x: 0,
                y: 0
            )
            .animation(Motion.easeOutSoft, value: isFocused)
            .animation(Motion.easeOutSoft, value: text.isEmpty)
            .animation(Motion.easeOut, value: error != nil)

            if let error = error {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.danger)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                    .padding(.leading, 4)
            }
        }
    }

    private var hasFloatingLabel: Bool {
        !text.isEmpty || isFocused
    }

    private var labelColor: Color {
        if error != nil { return Palette.danger }
        return isFocused ? Palette.accentLight : Palette.textDim
    }

    private var borderColor: Color {
        if error != nil { return Palette.danger.opacity(0.6) }
        if isFocused { return Palette.accent.opacity(0.6) }
        return Palette.hairlineStrong
    }

    /// Number-pad / decimal-pad / phone-pad keyboards lack a Return key,
    /// so we surface a Done button in the keyboard toolbar. Other
    /// keyboards already give the user a way to dismiss / submit.
    private var needsDoneToolbar: Bool {
        switch keyboardType {
        case .numberPad, .decimalPad, .phonePad, .asciiCapableNumberPad:
            return true
        default:
            return false
        }
    }
}
