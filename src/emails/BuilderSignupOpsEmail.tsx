/**
 * BuilderSignupOpsEmail — internal heads-up to info@ when a builder
 * finishes onboarding. Includes verification status so ops can
 * eyeball whether anything needs manual review.
 */

import {
  BodyText,
  EmailShell,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

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
      tone="muted"
    >
      <BodyText>
        Heads-up — a new builder just finished onboarding. Verification chips
        below; flag for manual review if anything looks off.
      </BodyText>

      <MetaCard title="Account">
        <MetaRow label="Company" value={<Strong>{companyName ?? "—"}</Strong>} />
        <MetaRow label="Name" value={builderName ?? "—"} />
        <MetaRow label="Email" value={builderEmail} />
        {builderPhone ? <MetaRow label="Phone" value={builderPhone} /> : null}
        <MetaRow label="ABN" value={abn ?? "—"} />
        {state ? <MetaRow label="State" value={state} /> : null}
      </MetaCard>

      <MetaCard title="Verification">
        <MetaRow
          label="ABN"
          value={abnVerified ? "Verified active · ABR" : "Not verified"}
        />
        <MetaRow
          label="Licence"
          value={
            anyLicenceVerified
              ? "Verified active · state register"
              : "Pending / not verified"
          }
        />
        <MetaRow label="Approval" value={approvalStatus} />
        <MetaRow label="Signed up" value={signedUpAt.toISOString()} />
      </MetaCard>
    </EmailShell>
  );
}

export default BuilderSignupOpsEmail;
