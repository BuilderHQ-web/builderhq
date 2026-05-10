/**
 * UnlockBuilderEmail — receipt to the builder confirming they unlocked
 * a project. Doubles as a useful reference doc — the address, owner
 * contact, and project URL are all here so they don't have to log back
 * in to find them.
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

interface UnlockBuilderEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  projectAddress: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  projectUrl: string;
  unlockedViaFba: boolean;
}

export function UnlockBuilderEmail({
  builderFirstName,
  projectTitle,
  projectAddress,
  ownerName,
  ownerEmail,
  ownerPhone,
  projectUrl,
  unlockedViaFba,
}: UnlockBuilderEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Unlocked: ${projectTitle}`}
      kicker={unlockedViaFba ? "Free with FBA" : "Unlocked"}
      heading={projectTitle}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        You&apos;ve unlocked{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>
        . Here&apos;s a quick reference — same details are always available on
        the project page.
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
        {projectAddress ? <StatRow label="Address" value={projectAddress} /> : null}
        <StatRow label="Owner" value={ownerName ?? "—"} />
        <StatRow label="Owner email" value={ownerEmail} />
        {ownerPhone ? <StatRow label="Owner phone" value={ownerPhone} /> : null}
      </Section>

      <PrimaryButton href={projectUrl}>Open project</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        Next step: open the project, review the docs, then submit a tender
        when you&apos;re ready. Owners see the strongest tenders first.
      </Text>
    </EmailShell>
  );
}

export default UnlockBuilderEmail;
