/**
 * ProjectPublishedOpsEmail — internal heads-up to info@ when a project
 * is published. One per project; useful for sanity-checking the early
 * marketplace before we taper this off.
 */

import {
  BodyText,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

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
      tone="muted"
    >
      <BodyText>A project just went live on the marketplace.</BodyText>

      <MetaCard title="Project">
        <MetaRow label="Title" value={<Strong>{projectTitle}</Strong>} />
        <MetaRow label="Type" value={projectType} />
        <MetaRow label="Location" value={location} />
        {budgetBand ? <MetaRow label="Budget" value={budgetBand} /> : null}
        <MetaRow label="Documents" value={String(documentCount)} />
        <MetaRow
          label="URL"
          value={<InlineLink href={projectUrl}>{projectUrl}</InlineLink>}
        />
      </MetaCard>

      <MetaCard title="Owner">
        <MetaRow label="Name" value={ownerName ?? "—"} />
        <MetaRow label="Email" value={ownerEmail} />
      </MetaCard>
    </EmailShell>
  );
}

export default ProjectPublishedOpsEmail;
