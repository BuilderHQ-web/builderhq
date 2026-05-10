/**
 * TenderWithdrawnEmail — to project owner when a builder withdraws.
 *
 * Heads-up so the owner knows their shortlist changed without having
 * to open the comparison view to find out.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  PrimaryButton,
  Strong,
} from "./_shell";

interface TenderWithdrawnEmailProps {
  ownerFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  reviewUrl: string;
}

export function TenderWithdrawnEmail({
  ownerFirstName,
  builderCompany,
  projectTitle,
  reviewUrl,
}: TenderWithdrawnEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`${builderCompany} withdrew their tender on ${projectTitle}.`}
      kicker="Tender withdrawn"
      heading={`${builderCompany} pulled their tender`}
      tone="warning"
      whyReceiving="You're receiving this because a builder changed the status of a tender on a project you own."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Just a heads-up — <Strong>{builderCompany}</Strong> has withdrawn their
        tender on <Strong>{projectTitle}</Strong>. Your shortlist is updated
        automatically and the slot is open again.
      </BodyText>

      <PrimaryButton href={reviewUrl}>Open comparison</PrimaryButton>

      <Caption>
        Builders sometimes withdraw to amend their numbers before resubmitting.
        If they do, you&apos;ll get a fresh tender notification.
      </Caption>
    </EmailShell>
  );
}

export default TenderWithdrawnEmail;
