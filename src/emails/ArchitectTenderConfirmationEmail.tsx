/**
 * ArchitectTenderConfirmationEmail — receipt sent to the architect
 * after they confirm onboarding via /architect-tender.
 *
 * The tone here is the most restrained of any BuilderHQ email. The
 * audience is a senior architect who just clicked a personal-style
 * cold email from Aryan and submitted a form. They don't want an
 * onboarding sequence, a welcome video, or a list of features.
 * They want one paragraph confirming Aryan will be in touch.
 *
 * The actual outreach reply (dashboard access, project brief, builder
 * shortlist) is sent by Aryan personally — not by this email.
 */

import { BodyText, EmailShell, InlineLink, Strong } from "./_shell";

interface ArchitectTenderConfirmationEmailProps {
  firstName: string;
  practiceName: string;
  projectAddress: string;
}

export function ArchitectTenderConfirmationEmail({
  firstName,
  practiceName,
  projectAddress,
}: ArchitectTenderConfirmationEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <EmailShell
      preview={`Received — onboarding ${projectAddress}. We will be in touch within 24 hours.`}
      kicker="Received"
      heading="Your project is being onboarded."
      whyReceiving="You're receiving this because you confirmed onboarding for a project on builderhq.com.au/architect-tender. If you didn't do this, ignore this email — no further action is taken without your reply."
    >
      <BodyText>{greeting}</BodyText>

      <BodyText>
        Thank you for confirming. I have the project at{" "}
        <Strong>{projectAddress}</Strong> queued for onboarding under{" "}
        <Strong>{practiceName}</Strong>.
      </BodyText>

      <BodyText>
        We&rsquo;ll be in touch within 24 hours with your dashboard access
        and the draft project profile, prepared from the publicly available
        planning application materials. Reply to that email with any
        questions or context you&rsquo;d like reflected before builder
        outreach starts.
      </BodyText>

      <BodyText>
        — The BuilderHQ team
        <br />
        <InlineLink href="mailto:info@builderhq.com.au">
          info@builderhq.com.au
        </InlineLink>
      </BodyText>
    </EmailShell>
  );
}

export default ArchitectTenderConfirmationEmail;
