/**
 * ProjectPublishedOpsEmail — internal heads-up to info@ when a project
 * is published. One per project; useful for sanity-checking the early
 * marketplace before we taper this off.
 */

import { BodyText, EmailShell, StatRow, brand } from "./_shell";
import { Section } from "@react-email/components";

interface ProjectPublishedOpsEmailProps {
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  ownerName: string | null;
  ownerEmail: string;
  documentCount: number;
  projectUrl: string;
}

export function ProjectPublishedOpsEmail({
  projectTitle,
  projectType,
  suburb,
  state,
  budgetBand,
  ownerName,
  ownerEmail,
  documentCount,
  projectUrl,
}: ProjectPublishedOpsEmailProps) {
  const location = [suburb, state].filter(Boolean).join(", ") || "—";
  return (
    <EmailShell
      preview={`Project live: ${projectTitle}`}
      kicker="Project published"
      heading={projectTitle}
    >
      <BodyText>A project just went live on the marketplace.</BodyText>
      <Section
        style={{
          backgroundColor: "rgba(0,212,200,0.05)",
          border: `1px solid ${brand.border}`,
          borderRadius: "6px",
          padding: "16px 18px",
          margin: "0 0 24px 0",
        }}
      >
        <StatRow label="Type" value={projectType} />
        <StatRow label="Location" value={location} />
        {budgetBand ? <StatRow label="Budget" value={budgetBand} /> : null}
        <StatRow label="Owner" value={ownerName ?? "—"} />
        <StatRow label="Owner email" value={ownerEmail} />
        <StatRow label="Documents" value={String(documentCount)} />
        <StatRow label="URL" value={projectUrl} />
      </Section>
    </EmailShell>
  );
}

export default ProjectPublishedOpsEmail;
