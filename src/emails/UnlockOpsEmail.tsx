/**
 * UnlockOpsEmail — internal heads-up to info@ when a builder unlocks
 * a project. Useful early signal of marketplace activity.
 */

import { BodyText, EmailShell, StatRow, brand } from "./_shell";
import { Section } from "@react-email/components";

interface UnlockOpsEmailProps {
  projectTitle: string;
  projectUrl: string;
  builderCompany: string;
  builderEmail: string;
  ownerName: string | null;
  ownerEmail: string;
  source: string;
  unlockedAt: Date;
}

export function UnlockOpsEmail({
  projectTitle,
  projectUrl,
  builderCompany,
  builderEmail,
  ownerName,
  ownerEmail,
  source,
  unlockedAt,
}: UnlockOpsEmailProps) {
  return (
    <EmailShell
      preview={`Unlock: ${builderCompany} → ${projectTitle}`}
      kicker="Project unlocked"
      heading={`${builderCompany} unlocked a project`}
    >
      <BodyText>A builder just unlocked a project on the marketplace.</BodyText>
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
        <StatRow label="URL" value={projectUrl} />
        <StatRow label="Builder" value={builderCompany} />
        <StatRow label="Builder email" value={builderEmail} />
        <StatRow label="Owner" value={ownerName ?? "—"} />
        <StatRow label="Owner email" value={ownerEmail} />
        <StatRow label="Source" value={source} />
        <StatRow label="When" value={unlockedAt.toISOString()} />
      </Section>
    </EmailShell>
  );
}

export default UnlockOpsEmail;
