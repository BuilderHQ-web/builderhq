/**
 * UnlockOpsEmail — internal heads-up to info@ when a builder unlocks
 * a project. Useful early signal of marketplace activity.
 */

import {
  BodyText,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

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
      tone="muted"
    >
      <BodyText>A builder just unlocked a project on the marketplace.</BodyText>

      <MetaCard title="Project">
        <MetaRow label="Title" value={<Strong>{projectTitle}</Strong>} />
        <MetaRow
          label="URL"
          value={<InlineLink href={projectUrl}>{projectUrl}</InlineLink>}
        />
      </MetaCard>

      <MetaCard title="Parties">
        <MetaRow label="Builder" value={<Strong>{builderCompany}</Strong>} />
        <MetaRow label="Builder email" value={builderEmail} />
        <MetaRow label="Owner" value={ownerName ?? "—"} />
        <MetaRow label="Owner email" value={ownerEmail} />
      </MetaCard>

      <MetaCard title="Unlock">
        <MetaRow label="Source" value={source} />
        <MetaRow label="When" value={unlockedAt.toISOString()} />
      </MetaCard>
    </EmailShell>
  );
}

export default UnlockOpsEmail;
