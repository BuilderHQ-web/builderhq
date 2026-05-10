/**
 * OwnerSignupOpsEmail — internal heads-up to info@ when a project
 * owner finishes onboarding. Lets the team eyeball each new account
 * during early launch when volumes are low.
 */

import {
  BodyText,
  EmailShell,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

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
      tone="muted"
    >
      <BodyText>
        Heads-up — a new project owner just finished onboarding.
      </BodyText>

      <MetaCard title="Account">
        <MetaRow label="Name" value={<Strong>{ownerName ?? "—"}</Strong>} />
        <MetaRow label="Email" value={ownerEmail} />
        {ownerPhone ? <MetaRow label="Phone" value={ownerPhone} /> : null}
        {entityType ? <MetaRow label="Entity" value={entityType} /> : null}
        {companyName ? <MetaRow label="Company" value={companyName} /> : null}
        {state ? <MetaRow label="State" value={state} /> : null}
        <MetaRow label="Signed up" value={signedUpAt.toISOString()} />
      </MetaCard>
    </EmailShell>
  );
}

export default OwnerSignupOpsEmail;
