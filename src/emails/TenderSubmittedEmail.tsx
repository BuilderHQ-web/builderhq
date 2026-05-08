/**
 * TenderSubmittedEmail — to project owner when a builder submits a tender.
 *
 * Owner expects: who submitted, headline number, project context, and a
 * one-click route into the comparison view.
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

interface TenderSubmittedEmailProps {
  ownerFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  totalPriceAud: number;
  durationWeeks: number;
  validityDays: number;
  reviewUrl: string;
}

const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

export function TenderSubmittedEmail({
  ownerFirstName,
  builderCompany,
  projectTitle,
  totalPriceAud,
  durationWeeks,
  validityDays,
  reviewUrl,
}: TenderSubmittedEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`${builderCompany} submitted a tender on ${projectTitle}.`}
      kicker="New tender"
      heading={`${builderCompany} sent you a tender`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {builderCompany}
        </strong>{" "}
        just submitted a tender on{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>
        . Open the comparison view to review the number, scope, and pitch.
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
        <StatRow label="Total price" value={formatAud(totalPriceAud)} />
        <StatRow label="Build duration" value={`${durationWeeks} weeks`} />
        <StatRow label="Tender valid for" value={`${validityDays} days`} />
      </Section>

      <PrimaryButton href={reviewUrl}>Review tender</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        You can shortlist multiple builders before deciding — comparing up to
        three side-by-side gives you the clearest read.
      </Text>
    </EmailShell>
  );
}

export default TenderSubmittedEmail;
