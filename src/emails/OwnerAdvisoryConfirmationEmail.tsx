/**
 * OwnerAdvisoryConfirmationEmail — sent to the homeowner immediately
 * after they request Owner Advisory.
 *
 * Tone: calm, warm, certain. Sets the "within one business day"
 * expectation, frames what happens next, and reinforces the
 * independence promise. Copy will be refined.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  MetaCard,
  MetaRow,
  MiniLabel,
  PrimaryButton,
  Strong,
} from "./_shell";

interface OwnerAdvisoryConfirmationEmailProps {
  firstName: string;
  projectType: string;
  suburb: string;
  guideUrl: string;
}

export function OwnerAdvisoryConfirmationEmail({
  firstName,
  projectType,
  suburb,
  guideUrl,
}: OwnerAdvisoryConfirmationEmailProps) {
  return (
    <EmailShell
      preview={`We've got your request, ${firstName}. Here's what happens next.`}
      kicker="Owner Advisory · Melbourne"
      heading={`We've got it, ${firstName}.`}
      whyReceiving="You're receiving this because you requested Owner Advisory at builderhq.com.au/owneradvisory."
    >
      <BodyText>
        Thank you for reaching out. You&apos;re about to make one of the
        biggest financial decisions of your life, and now you won&apos;t make
        it alone.
      </BodyText>

      <MetaCard title="What happens next">
        <MetaRow
          label="1"
          value={`We review your project: the ${projectType.toLowerCase()} in ${suburb}.`}
        />
        <MetaRow
          label="2"
          value="Someone from the team is in touch within one business day."
        />
        <MetaRow
          label="3"
          value="We walk you through finding the right builders, getting them to quote, comparing what comes back, and where the real risk sits. No cost, no obligation."
        />
      </MetaCard>

      <BodyText>
        Our job is to sit on your side of the table, so we can be{" "}
        <Strong>straight with you</Strong> about every quote and every clause.
      </BodyText>

      <MiniLabel>While you wait</MiniLabel>
      <BodyText>
        If you haven&apos;t read it yet, the Melbourne Build Brief covers real
        2026 costs, the contract clauses that matter, and the red flags worth
        walking away from.
      </BodyText>

      <PrimaryButton href={guideUrl}>
        Read the Melbourne Build Brief
      </PrimaryButton>

      <Caption>
        Keep your drawings and project details handy, so that first
        conversation counts. Just reply to this email if anything changes in
        the meantime.
      </Caption>
    </EmailShell>
  );
}

export default OwnerAdvisoryConfirmationEmail;
