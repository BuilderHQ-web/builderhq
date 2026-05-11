/**
 * GuideDownloadEmail — sent to homeowners who fill out the /guide
 * form. Delivers the "Melbourne Build Brief" PDF as a download link
 * (not an attachment — keeps the email under any provider's clipping
 * threshold + plays nicer with deliverability filters).
 *
 * Tone: warm but disciplined. They asked for the guide, here it is —
 * no upsell, no sales follow-up. The fact that we're useful + don't
 * spam earns the trust we'll need when they're ready to actually run
 * a tender.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "./_shell";

interface GuideDownloadEmailProps {
  firstName: string;
  downloadUrl: string;
}

export function GuideDownloadEmail({
  firstName,
  downloadUrl,
}: GuideDownloadEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <EmailShell
      preview="Your Melbourne Build Brief is inside — 21 pages, no sales call."
      kicker="The Melbourne Build Brief"
      heading="Your guide is here."
      whyReceiving="You're receiving this because you requested the Melbourne Build Brief from builderhq.com.au. We won't add you to a sales list — this is the only email you'll get from us about the guide."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Thanks for grabbing the Brief. It&apos;s a 21-page independent
        field guide for homeowners building or renovating in Melbourne
        in 2026 — real costs, contract clauses, the 12 red flags, the
        2024 reforms most miss, and an 18-point checklist for the day
        you sign.
      </BodyText>

      <PrimaryButton href={downloadUrl}>Download the PDF</PrimaryButton>

      <Caption>
        If the button doesn&apos;t work, paste this link into your
        browser:
        <br />
        <InlineLink href={downloadUrl}>{downloadUrl}</InlineLink>
      </Caption>

      <Divider space="32px" />

      <BodyText>
        Read it in one sitting. Use the checklist on the last two pages
        when you start collecting builder quotes — those questions are
        the difference between a builder who can deliver and one who
        learns at your expense.
      </BodyText>

      <BodyText>
        When you&apos;re ready to run a real tender across multiple
        verified builders, the platform that wrote this guide is
        waiting at{" "}
        <InlineLink href="https://builderhq.com.au">
          builderhq.com.au
        </InlineLink>{" "}
        — but no rush. Read the Brief first.
      </BodyText>

      <Divider space="28px" />

      <Caption>
        Questions, feedback, or want a future volume on a specific topic?
        Reply to this email — it lands in our inbox, not a no-reply
        graveyard. Or write to{" "}
        <InlineLink href="mailto:hello@builderhq.com.au">
          hello@builderhq.com.au
        </InlineLink>
        .
      </Caption>
    </EmailShell>
  );
}

export default GuideDownloadEmail;
