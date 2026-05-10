/**
 * TenderSubmittedBuilderEmail — confirmation to the builder that
 * their tender is in. Owner now sees it. Pairs with TenderSubmittedEmail
 * (which goes to the owner).
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

interface TenderSubmittedBuilderEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  totalPriceAud: number;
  durationWeeks: number;
  validityDays: number;
  tenderUrl: string;
}

const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

export function TenderSubmittedBuilderEmail({
  builderFirstName,
  projectTitle,
  totalPriceAud,
  durationWeeks,
  validityDays,
  tenderUrl,
}: TenderSubmittedBuilderEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Tender submitted on ${projectTitle}.`}
      kicker="Tender submitted"
      heading="Your tender is in"
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Your tender on{" "}
        <strong style={{ color: brand.text, fontWeight: 600 }}>
          {projectTitle}
        </strong>{" "}
        is now in front of the owner. We&apos;ll email you the moment they
        shortlist or decide.
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

      <PrimaryButton href={tenderUrl}>View your tender</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        Need to change something? Withdraw to edit and re-submit any time
        before the owner decides.
      </Text>
    </EmailShell>
  );
}

export default TenderSubmittedBuilderEmail;
