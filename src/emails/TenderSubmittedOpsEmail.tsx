/**
 * TenderSubmittedOpsEmail — internal heads-up to info@ when a tender
 * is submitted. Lets ops sanity-check tender quality during launch.
 */

import {
  BodyText,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

interface TenderSubmittedOpsEmailProps {
  projectTitle: string;
  projectUrl: string;
  builderCompany: string;
  builderEmail: string;
  ownerName: string | null;
  ownerEmail: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  submittedAt: Date;
}

const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

export function TenderSubmittedOpsEmail({
  projectTitle,
  projectUrl,
  builderCompany,
  builderEmail,
  ownerName,
  ownerEmail,
  totalPriceAud,
  durationWeeks,
  validityDays,
  submittedAt,
}: TenderSubmittedOpsEmailProps) {
  return (
    <EmailShell
      preview={`Tender: ${builderCompany} → ${projectTitle}`}
      kicker="Tender submitted"
      heading={`${builderCompany} → ${projectTitle}`}
      tone="muted"
    >
      <BodyText>A tender just landed on the marketplace.</BodyText>

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

      <MetaCard title="Tender">
        <MetaRow
          label="Total"
          value={totalPriceAud != null ? formatAud(totalPriceAud) : "—"}
        />
        <MetaRow
          label="Duration"
          value={durationWeeks != null ? `${durationWeeks} weeks` : "—"}
        />
        <MetaRow
          label="Validity"
          value={validityDays != null ? `${validityDays} days` : "—"}
        />
        <MetaRow label="When" value={submittedAt.toISOString()} />
      </MetaCard>
    </EmailShell>
  );
}

export default TenderSubmittedOpsEmail;
