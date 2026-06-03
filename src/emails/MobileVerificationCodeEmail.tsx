/**
 * MobileVerificationCodeEmail — sent from the iOS / Android app after
 * the user submits the sign-up form. Carries a 6-digit code with a
 * 15-minute TTL.
 *
 * Why a code instead of a magic link: links are friction on mobile —
 * the user has to leave the app, open mail, tap a link, hope universal
 * links route them back in, and then re-establish session state. A
 * 6-digit code lets them stay in the in-app keypad-friendly flow we
 * already built for OTP entry.
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

interface MobileVerificationCodeEmailProps {
  code: string;
  firstName: string | null;
  /** Minutes until the code expires — defaults to 15 to match the
   *  server-side TTL but pulled from the call site for parity. */
  expiresInMinutes?: number;
}

export function MobileVerificationCodeEmail({
  code,
  firstName,
  expiresInMinutes = 15,
}: MobileVerificationCodeEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Welcome to BuilderHQ.";

  return (
    <EmailShell
      preview={`Your BuilderHQ code is ${code} — expires in ${expiresInMinutes} minutes.`}
      kicker="Verify your account"
      heading="Enter this code in the app"
      whyReceiving="You're receiving this because you just started signing up for BuilderHQ on the mobile app. If that wasn't you, you can ignore this email — no account is created until the code is entered."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Tap back into the app and enter this code to finish setting up
        your account.
      </BodyText>

      {/*
        Code block: large, mono, generously spaced. Inline styles instead
        of a primitive because no other email shows a code today — easier
        to keep it local than to thread a one-off prop through the shell.
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
        work, you can request a new one from the verify screen in the app.
      </Caption>

      <Divider space="28px" />

      <Caption>
        Didn&apos;t try to sign up? You can safely delete this email — no
        account is created until the code is entered.
      </Caption>
    </EmailShell>
  );
}

export default MobileVerificationCodeEmail;
