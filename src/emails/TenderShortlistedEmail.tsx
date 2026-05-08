/**
 * TenderShortlistedEmail — to builder when owner shortlists their tender.
 *
 * Tone: encouraging without overpromising. Shortlisted ≠ awarded —
 * make sure the builder knows they're still in the running, not done.
 */

import { Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, brand } from "./_shell";

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
  const ownerLabel = ownerName ? ownerName : "The owner";
  return (
    <EmailShell
      preview={`Your tender on ${projectTitle} has been shortlisted.`}
      kicker="Shortlisted"
      heading="You're in the shortlist"
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Good news —{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {ownerLabel}
        </strong>{" "}
        has shortlisted your tender on{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>
        . You're now one of the contenders being compared closely.
      </BodyText>

      <PrimaryButton href={tenderUrl}>View your tender</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        We'll let you know as soon as the owner makes their decision. Your
        tender stays locked unless you withdraw it.
      </Text>
    </EmailShell>
  );
}

export default TenderShortlistedEmail;
