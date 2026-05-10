/**
 * TenderSubmittedOpsEmail — internal heads-up to info@ when a tender
 * is submitted. Lets ops sanity-check tender quality during launch.
 */

import { BodyText, EmailShell, StatRow, brand } from "./_shell";
import { Section } from "@react-email/components";

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
    >
      <BodyText>A tender just landed on the marketplace.</BodyText>
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
        <StatRow
          label="Total"
          value={totalPriceAud != null ? formatAud(totalPriceAud) : "—"}
        />
        <StatRow
          label="Duration"
          value={durationWeeks != null ? `${durationWeeks} weeks` : "—"}
        />
        <StatRow
          label="Validity"
          value={validityDays != null ? `${validityDays} days` : "—"}
        />
        <StatRow label="When" value={submittedAt.toISOString()} />
      </Section>
    </EmailShell>
  );
}

export default TenderSubmittedOpsEmail;
