/**
 * AuthSigninLinkEmail — sent when a returning user requests a
 * passwordless sign-in link from /login.
 *
 * Distinct from the ads-funnel "publish your project" template:
 *
 *   · Short, minimal copy — the user is at their device waiting
 *   · One CTA, one fallback URL
 *   · 15-minute expiry messaged clearly (mirrors the actual TTL)
 *   · Anti-phishing footer ("Didn't request this? Ignore.")
 *
 * Composes the shared shell so branding + chrome stays in sync with
 * every other transactional email BuilderHQ sends.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "./_shell";

interface AuthSigninLinkEmailProps {
  magicUrl: string;
  firstName: string | null;
}

export function AuthSigninLinkEmail({
  magicUrl,
  firstName,
}: AuthSigninLinkEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  return (
    <EmailShell
      preview="Your BuilderHQ sign-in link — expires in 15 minutes."
      kicker="Sign in"
      heading="Your sign-in link"
      whyReceiving="You're receiving this because someone (hopefully you) requested a sign-in link for your BuilderHQ account. If that wasn't you, just ignore this email."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Click below to sign in. The link works once and expires in 15 minutes.
      </BodyText>

      <PrimaryButton href={magicUrl}>Sign me in</PrimaryButton>

      <Caption>
        If the button doesn&apos;t work, paste this URL into your browser:
        <br />
        <InlineLink href={magicUrl}>{magicUrl}</InlineLink>
      </Caption>

      <Divider space="28px" />

      <Caption>
        Didn&apos;t request this? You can safely ignore this email — your
        account stays exactly as it was.
      </Caption>
    </EmailShell>
  );
}

export default AuthSigninLinkEmail;
