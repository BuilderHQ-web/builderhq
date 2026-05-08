/**
 * TenderRejectedEmail — to builder when owner rejects their tender.
 *
 * Keep it brief and respectful. Don't surface a reason — owners aren't
 * required to provide one and we won't pretend to.
 */

import { Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, brand } from "./_shell";

interface TenderRejectedEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  browseUrl: string;
}

export function TenderRejectedEmail({
  builderFirstName,
  projectTitle,
  browseUrl,
}: TenderRejectedEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Update on your tender for ${projectTitle}.`}
      kicker="Tender update"
      heading="Decision made on this one"
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Thanks for tendering on{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>
        . The owner has decided to move forward with another builder this time.
      </BodyText>
      <BodyText>
        We know it stings. Plenty more residential projects come through
        BuilderHQ each week — keep an eye on your matched feed.
      </BodyText>

      <PrimaryButton href={browseUrl}>Browse new projects</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        Your unlock for this project remains valid — you can revisit the brief
        any time.
      </Text>
    </EmailShell>
  );
}

export default TenderRejectedEmail;
