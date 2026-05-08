/**
 * TenderAwardedEmail — to builder when owner awards them the project.
 *
 * The big moment. Surfaces owner contact details so the builder can
 * reach out directly to start contract conversations off-platform.
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

interface TenderAwardedEmailProps {
  builderFirstName: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  projectTitle: string;
  tenderUrl: string;
}

export function TenderAwardedEmail({
  builderFirstName,
  ownerName,
  ownerEmail,
  ownerPhone,
  projectTitle,
  tenderUrl,
}: TenderAwardedEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Congratulations — you've been awarded ${projectTitle}.`}
      kicker="Awarded"
      heading="Congratulations — you won this one"
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        You've been awarded{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>
        . The owner has chosen your tender — well done.
      </BodyText>

      <Text
        style={{
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: brand.accent,
          margin: "0 0 8px 0",
          fontWeight: 600,
        }}
      >
        Owner contact
      </Text>
      <Section
        style={{
          backgroundColor: "rgba(0,212,200,0.05)",
          border: `1px solid ${brand.border}`,
          borderRadius: "6px",
          padding: "16px 18px",
          margin: "0 0 24px 0",
        }}
      >
        {ownerName ? <StatRow label="Name" value={ownerName} /> : null}
        <StatRow label="Email" value={ownerEmail} />
        {ownerPhone ? <StatRow label="Phone" value={ownerPhone} /> : null}
      </Section>

      <BodyText>
        Reach out directly to confirm scope, timing, and contract. The project
        page in BuilderHQ keeps a record of the awarded tender for your files.
      </BodyText>

      <PrimaryButton href={tenderUrl}>Open project</PrimaryButton>
    </EmailShell>
  );
}

export default TenderAwardedEmail;
