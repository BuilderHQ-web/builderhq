/**
 * UnlockOwnerEmail — to project owner when a builder unlocks their
 * project. Owner sees who unlocked plus the verification chips so
 * they know it's a real, vetted builder.
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

interface UnlockOwnerEmailProps {
  ownerFirstName: string | null;
  builderCompany: string;
  builderState: string | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  projectTitle: string;
  projectUrl: string;
  builderProfileUrl: string | null;
}

export function UnlockOwnerEmail({
  ownerFirstName,
  builderCompany,
  builderState,
  abnVerified,
  anyLicenceVerified,
  projectTitle,
  projectUrl,
  builderProfileUrl,
}: UnlockOwnerEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`${builderCompany} unlocked ${projectTitle}.`}
      kicker="Project unlocked"
      heading={`${builderCompany} is reviewing your project`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {builderCompany}
        </strong>{" "}
        just unlocked your project — they now have your address, contact
        details, and the documents you uploaded. A tender may follow.
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
        <StatRow label="Builder" value={builderCompany} />
        {builderState ? <StatRow label="State" value={builderState} /> : null}
        <StatRow
          label="ABN"
          value={abnVerified ? "✓ Verified active (ABR)" : "Pending"}
        />
        <StatRow
          label="Licence"
          value={
            anyLicenceVerified ? "✓ Verified active (state register)" : "Pending"
          }
        />
      </Section>

      <PrimaryButton href={projectUrl}>View project</PrimaryButton>

      {builderProfileUrl ? (
        <Text
          style={{
            fontSize: "13px",
            lineHeight: "22px",
            color: brand.muted,
            margin: "16px 0 0 0",
          }}
        >
          See their public profile:{" "}
          <a href={builderProfileUrl} style={{ color: brand.accent }}>
            {builderCompany}
          </a>
        </Text>
      ) : null}
    </EmailShell>
  );
}

export default UnlockOwnerEmail;
