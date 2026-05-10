/**
 * BuilderSignupOpsEmail — internal heads-up to info@ when a builder
 * finishes onboarding. Includes verification status so ops can
 * eyeball whether anything needs manual review.
 */

import { BodyText, EmailShell, StatRow, brand } from "./_shell";
import { Section } from "@react-email/components";

interface BuilderSignupOpsEmailProps {
  builderName: string | null;
  builderEmail: string;
  builderPhone: string | null;
  companyName: string | null;
  abn: string | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  approvalStatus: string;
  state: string | null;
  signedUpAt: Date;
}

export function BuilderSignupOpsEmail({
  builderName,
  builderEmail,
  builderPhone,
  companyName,
  abn,
  abnVerified,
  anyLicenceVerified,
  approvalStatus,
  state,
  signedUpAt,
}: BuilderSignupOpsEmailProps) {
  return (
    <EmailShell
      preview={`New builder: ${companyName ?? builderName ?? builderEmail}`}
      kicker="New builder signup"
      heading="A builder joined BuilderHQ"
    >
      <BodyText>
        Heads-up — a new builder just finished onboarding. Verification chips below.
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
        <StatRow label="Company" value={companyName ?? "—"} />
        <StatRow label="Name" value={builderName ?? "—"} />
        <StatRow label="Email" value={builderEmail} />
        {builderPhone ? <StatRow label="Phone" value={builderPhone} /> : null}
        <StatRow label="ABN" value={abn ?? "—"} />
        <StatRow label="ABN verified" value={abnVerified ? "✓ ABR active" : "✗ not verified"} />
        <StatRow
          label="Licence verified"
          value={anyLicenceVerified ? "✓ register active" : "✗ none verified"}
        />
        <StatRow label="Approval status" value={approvalStatus} />
        {state ? <StatRow label="State" value={state} /> : null}
        <StatRow label="Signed up" value={signedUpAt.toISOString()} />
      </Section>
    </EmailShell>
  );
}

export default BuilderSignupOpsEmail;
