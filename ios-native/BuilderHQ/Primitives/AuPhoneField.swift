/// AuPhoneField — premium AU phone input.
///
/// Wraps the same frosted pill look as `PremiumTextField` but adds
/// phone-specific behaviour:
///   · `.phonePad` keyboard + `.telephoneNumber` content type so iOS
///     offers the right keys + autofill from Contacts.
///   · Light AU grouping as the user types (04XX XXX XXX / 0X XXXX
///     XXXX) via `AuPhone.formatAsTyping`.
///   · Live validity: a teal check + "Looks good" once the number is
///     a valid AU mobile/landline; a soft red error once they've
///     typed enough to know it's wrong (we don't nag mid-type).
///   · A leading 🇦🇺 +61 affordance chip so it's unmistakably an
///     Australian number field — reduces "what format?" hesitation.
///
/// Binds to a raw string; the parent normalizes to E.164 via
/// `AuPhone.normalise` at submit time.

import SwiftUI

struct AuPhoneField: View {
    @Binding var text: String
    /// Server-provided field error (e.g. from a 400) takes precedence
    /// over the local live-validation message.
    var serverError: String? = nil
    var onSubmit: (() -> Void)? = nil

    @FocusState private var isFocused: Bool

    private var isValid: Bool { AuPhone.isValid(text) }

    /// Only surface a local error once the user has typed a plausible
    /// number's worth of digits AND it's still invalid — keeps the
    /// field calm while they're mid-entry.
    private var liveError: String? {
        if let serverError { return serverError }
        let sig = AuPhone.significantDigitCount(text)
        if !text.isEmpty, sig >= 9, !isValid {
            return "Enter a valid AU mobile or landline."
        }
        return nil
    }

    private var showsValidTick: Bool {
        isValid && !text.isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                // AU country affordance — static, signals the expected
                // number origin without making them type +61.
                HStack(spacing: 4) {
                    Text("🇦🇺")
                        .font(.system(size: 15))
                    Text("+61")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                }
                .padding(.trailing, 2)

                Rectangle()
                    .fill(Palette.hairline)
                    .frame(width: 1, height: 22)

                ZStack(alignment: .leading) {
                    if text.isEmpty {
                        Text("0412 345 678")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Palette.textDim)
                    }
                    TextField("", text: $text)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Palette.text)
                        .tint(Palette.accent)
                        .focused($isFocused)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                        .submitLabel(.done)
                        .onChange(of: text) { _, newValue in
                            // Reformat on each edit. Guard against the
                            // formatter fighting itself (only reassign
                            // when it actually changes the string).
                            let formatted = AuPhone.formatAsTyping(newValue)
                            if formatted != newValue {
                                text = formatted
                            }
                        }
                        .onSubmit { onSubmit?() }
                        .toolbar {
                            if isFocused {
                                ToolbarItemGroup(placement: .keyboard) {
                                    Spacer()
                                    Button("Done") { isFocused = false }
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Palette.accentLight)
                                }
                            }
                        }
                }

                // Trailing validity tick — springs in when valid.
                if showsValidTick {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Palette.accent)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(.horizontal, 16)
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
                radius: isFocused ? 14 : 0
            )
            .animation(Motion.easeOutSoft, value: isFocused)
            .animation(Motion.easeOut, value: showsValidTick)
            .animation(Motion.easeOut, value: liveError != nil)

            if let liveError {
                Text(liveError)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.danger)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                    .padding(.leading, 4)
            }
        }
    }

    private var borderColor: Color {
        if liveError != nil { return Palette.danger.opacity(0.6) }
        if showsValidTick { return Palette.accent.opacity(0.55) }
        if isFocused { return Palette.accent.opacity(0.6) }
        return Palette.hairlineStrong
    }
}
