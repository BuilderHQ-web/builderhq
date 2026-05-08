/**
 * TenderWithdrawnEmail — to project owner when a builder withdraws.
 *
 * Heads-up so the owner knows their shortlist changed without having to
 * open the comparison view to find out.
 */

import { BodyText, EmailShell, PrimaryButton, brand } from "./_shell";

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
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Just a heads-up —{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {builderCompany}
        </strong>{" "}
        has withdrawn their tender on{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>
        . Your shortlist is updated automatically.
      </BodyText>

      <PrimaryButton href={reviewUrl}>Open comparison</PrimaryButton>
    </EmailShell>
  );
}

export default TenderWithdrawnEmail;
