/**
 * OwnerSignupOpsEmail — internal heads-up to info@ when a project
 * owner finishes onboarding. Lets the team eyeball each new account
 * during early launch when volumes are low.
 */

import { BodyText, EmailShell, StatRow, brand } from "./_shell";
import { Section } from "@react-email/components";

interface OwnerSignupOpsEmailProps {
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  entityType: string | null;
  companyName: string | null;
  state: string | null;
  signedUpAt: Date;
}

export function OwnerSignupOpsEmail({
  ownerName,
  ownerEmail,
  ownerPhone,
  entityType,
  companyName,
  state,
  signedUpAt,
}: OwnerSignupOpsEmailProps) {
  return (
    <EmailShell
      preview={`New project owner: ${ownerName ?? ownerEmail}`}
      kicker="New owner signup"
      heading="A project owner joined BuilderHQ"
    >
      <BodyText>Heads-up — a new project owner just finished onboarding.</BodyText>
      <Section
        style={{
          backgroundColor: "rgba(0,212,200,0.05)",
          border: `1px solid ${brand.border}`,
          borderRadius: "6px",
          padding: "16px 18px",
          margin: "0 0 24px 0",
        }}
      >
        <StatRow label="Name" value={ownerName ?? "—"} />
        <StatRow label="Email" value={ownerEmail} />
        {ownerPhone ? <StatRow label="Phone" value={ownerPhone} /> : null}
        {entityType ? <StatRow label="Entity type" value={entityType} /> : null}
        {companyName ? <StatRow label="Company" value={companyName} /> : null}
        {state ? <StatRow label="State" value={state} /> : null}
        <StatRow label="Signed up" value={signedUpAt.toISOString()} />
      </Section>
    </EmailShell>
  );
}

export default OwnerSignupOpsEmail;
