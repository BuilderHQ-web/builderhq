/**
 * MobilePasswordResetCodeEmail — sent from the iOS / Android app when a
 * user taps "Forgot password?". Carries a 6-digit code with a 15-minute
 * TTL that they enter in-app alongside a new password.
 *
 * Sister to MobileVerificationCodeEmail: same in-app, keypad-friendly
 * code flow, different intent (recover an existing account rather than
 * verify a new one). We deliberately avoid a magic link — the reset
 * happens entirely inside the app's OTP screen.
 *
 * Composes the shared shell + primitives so this stays in lockstep with
 * the rest of the BuilderHQ transactional emails.
 */

import {
  BodyText,
  brand,
  Caption,
  Divider,
  EmailShell,
} from "./_shell";

interface MobilePasswordResetCodeEmailProps {
  code: string;
  firstName: string | null;
  /** Minutes until the code expires — defaults to 15 to match the
   *  server-side TTL but pulled from the call site for parity. */
  expiresInMinutes?: number;
}

export function MobilePasswordResetCodeEmail({
  code,
  firstName,
  expiresInMinutes = 15,
}: MobilePasswordResetCodeEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <EmailShell
      preview={`Your BuilderHQ password reset code is ${code} — expires in ${expiresInMinutes} minutes.`}
      kicker="Reset your password"
      heading="Enter this code in the app"
      whyReceiving="You're receiving this because someone asked to reset the password on your BuilderHQ account from the mobile app. If that wasn't you, you can safely ignore this email — your password stays unchanged."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Tap back into the app and enter this code to choose a new
        password.
      </BodyText>

      {/*
        Code block: large, mono, generously spaced. Inline styles mirror
        MobileVerificationCodeEmail so both codes look identical in the
        inbox.
      */}
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{
          margin: "32px 0",
          borderCollapse: "separate",
        }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              style={{
                background: brand.accentMuted,
                border: `1px solid ${brand.accentBorder}`,
                borderRadius: "14px",
                padding: "26px 24px",
              }}
            >
              <div
                style={{
                  color: brand.accent,
                  fontFamily:
                    '"SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
                  fontSize: "40px",
                  fontWeight: 700,
                  letterSpacing: "12px",
                  // Negative right margin offsets the trailing letter-
                  // spacing so the visible block is optically centred.
                  marginRight: "-12px",
                  lineHeight: 1,
                }}
              >
                {code}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <Caption>
        This code expires in {expiresInMinutes} minutes. If it doesn&apos;t
        work, you can request a new one from the reset screen in the app.
      </Caption>

      <Divider space="28px" />

      <Caption>
        Didn&apos;t ask to reset your password? You can safely delete this
        email — nothing changes unless the code is entered.
      </Caption>
    </EmailShell>
  );
}

export default MobilePasswordResetCodeEmail;
