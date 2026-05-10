/**
 * ProjectPublishedOwnerEmail — confirmation to the owner that their
 * project is live on the marketplace. Builders are seeing it now and
 * tenders should start arriving.
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

interface ProjectPublishedOwnerEmailProps {
  ownerFirstName: string | null;
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  manageUrl: string;
}

export function ProjectPublishedOwnerEmail({
  ownerFirstName,
  projectTitle,
  projectType,
  suburb,
  state,
  budgetBand,
  manageUrl,
}: ProjectPublishedOwnerEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  const location = [suburb, state].filter(Boolean).join(", ") || "—";
  return (
    <EmailShell
      preview={`${projectTitle} is live on the BuilderHQ marketplace.`}
      kicker="Project live"
      heading={`${projectTitle} is live`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Your project is now visible to verified builders across BuilderHQ.
        We&apos;ll email you the moment a builder unlocks it or submits a
        tender.
      </BodyText>

      <Section
        style={{
          backgroundColor: "rgba(0,212,200,0.05)",
          border: `1px solid ${brand.border}`,
          borderRadius: "6px",
          padding: "16px 18px",
          margin: "0 0 24px 0",
        }}
      >
        <StatRow label="Project" value={projectTitle} />
        <StatRow label="Type" value={projectType} />
        <StatRow label="Location" value={location} />
        {budgetBand ? <StatRow label="Budget" value={budgetBand} /> : null}
      </Section>

      <PrimaryButton href={manageUrl}>Manage project</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        Tip: a clear brief and complete document set typically nets 3× more
        tenders. You can edit any field and re-publish at any time.
      </Text>
    </EmailShell>
  );
}

export default ProjectPublishedOwnerEmail;
