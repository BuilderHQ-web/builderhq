/**
 * LaunchInviteEmail — sent once to every Bubble-migrated user during
 * the platform relaunch. Single CTA: claim your account.
 *
 * Tone is event-launch, not transactional. The user hasn't requested
 * this email — they're getting it because we migrated them. So:
 *
 *   - Lead with "BuilderHQ has rebuilt" (the reason they're hearing
 *     from us at all)
 *   - Explain why a fresh password is needed (security upgrade — not
 *     "we lost it")
 *   - Make the CTA unmissable + the URL pasteable
 *   - Soft mention what changed so they're primed for the new UI
 *   - Close with a support fallback + the standard
 *     "didn't recognise this account?" off-ramp
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "./_shell";

interface LaunchInviteEmailProps {
  claimUrl: string;
  firstName: string | null;
  /** Days until the claim link expires — drives the urgency line. */
  daysToExpire: number;
}

export function LaunchInviteEmail({
  claimUrl,
  firstName,
  daysToExpire,
}: LaunchInviteEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <EmailShell
      preview="BuilderHQ has rebuilt. Claim your account in one click."
      kicker="BuilderHQ 2.0"
      heading="We've rebuilt. Your account is waiting."
      whyReceiving="You're receiving this because you have an existing BuilderHQ account from the platform we launched on Bubble. We've now rebuilt BuilderHQ from the ground up — faster, sharper, native — and we've imported your account into the new version."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        BuilderHQ has been rebuilt from the ground up. Same mission — connecting
        Australian project owners with the right builder — sharper everything
        else. Your account, your projects, and your tender history are already
        on the new platform.
      </BodyText>
      <BodyText>
        To pick up where you left off, set a new password. Passwords from the
        old platform can&apos;t be carried over (a security upgrade — we&apos;ve
        moved from bcrypt to argon2id), so this is the one-time step you need
        to take.
      </BodyText>

      <PrimaryButton href={claimUrl}>Claim my account</PrimaryButton>

      <Caption>
        This link expires in {daysToExpire} days. If the button doesn&apos;t
        work, paste this URL into your browser:
        <br />
        <InlineLink href={claimUrl}>{claimUrl}</InlineLink>
      </Caption>

      <Divider space="32px" />

      <BodyText>What&apos;s new at a glance:</BodyText>
      <BodyText>
        — A redesigned dashboard with the four numbers that actually matter
        <br />
        — Tender comparison side-by-side, decisions in two clicks
        <br />
        — Verified ABN + licence check, live against ABR + state registers
        <br />
        — Founding Builder Access: free unlocks while we open the platform
        <br />
        — Inline messaging on every project, not buried two screens deep
      </BodyText>

      <Divider space="32px" />

      <Caption>
        Stuck? Reply to this email or write to{" "}
        <InlineLink href="mailto:info@builderhq.com.au">
          info@builderhq.com.au
        </InlineLink>{" "}
        — we&apos;ll get you sorted in a few hours.
      </Caption>
      <Caption>
        Didn&apos;t expect this email? Someone may have used your address to
        register an old BuilderHQ account. You can safely ignore this — no
        action is taken on your account until you click the claim link.
      </Caption>
    </EmailShell>
  );
}

export default LaunchInviteEmail;
