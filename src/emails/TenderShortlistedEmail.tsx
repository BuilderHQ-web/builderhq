/**
 * TenderShortlistedEmail — to builder when owner shortlists their
 * tender. Tone: encouraging without overpromising. Shortlisted ≠
 * awarded.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  PrimaryButton,
  Strong,
} from "./_shell";

interface TenderShortlistedEmailProps {
  builderFirstName: string | null;
  ownerName: string | null;
  projectTitle: string;
  tenderUrl: string;
}

export function TenderShortlistedEmail({
  builderFirstName,
  ownerName,
  projectTitle,
  tenderUrl,
}: TenderShortlistedEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  const ownerLabel = ownerName ?? "The owner";
  return (
    <EmailShell
      preview={`You're on the shortlist for ${projectTitle}.`}
      kicker="Shortlisted"
      heading="You're on the shortlist"
      whyReceiving="You're receiving this because the owner of a project you tendered on has updated their shortlist."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Good news — <Strong>{ownerLabel}</Strong> has shortlisted your tender
        on <Strong>{projectTitle}</Strong>. You&apos;re now one of the
        contenders being compared closely.
      </BodyText>

      <PrimaryButton href={tenderUrl}>View your tender</PrimaryButton>

      <Caption>
        We&apos;ll let you know as soon as the owner decides. Your tender stays
        locked unless you withdraw it.
      </Caption>
    </EmailShell>
  );
}

export default TenderShortlistedEmail;
