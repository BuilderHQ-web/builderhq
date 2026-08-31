/**
 * ArchitectSignupOpsEmail — internal heads-up to info@ when an
 * architect or building designer finishes onboarding.
 *
 * The sibling of OwnerSignupOpsEmail and BuilderSignupOpsEmail, and it
 * existed for neither reason: the architect path shipped without one,
 * so a studio could join and nobody would hear. A studio matters more
 * per head than an owner does, because one practice brings the projects
 * of every client it runs a tender for, so this is the signup least
 * affordable to miss.
 */

import {
  BodyText,
  EmailShell,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

interface ArchitectSignupOpsEmailProps {
  architectName: string | null;
  architectEmail: string;
  architectPhone: string | null;
  practiceName: string | null;
  suburb: string | null;
  state: string | null;
  signedUpAt: Date;
}

export function ArchitectSignupOpsEmail({
  architectName,
  architectEmail,
  architectPhone,
  practiceName,
  suburb,
  state,
  signedUpAt,
}: ArchitectSignupOpsEmailProps) {
  const where = [suburb, state].filter(Boolean).join(", ");
  // Melbourne time, spelled out. The sibling notices print a raw UTC
  // ISO string, which is the wrong timezone for everyone who reads
  // this and takes a moment to decode at a glance.
  const when = signedUpAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });
  return (
    <EmailShell
      preview={`New architect: ${practiceName ?? architectName ?? architectEmail}`}
      kicker="New architect signup"
      heading="An architect joined BuilderHQ"
      tone="muted"
    >
      <BodyText>
        A new architect or building designer just finished onboarding.
      </BodyText>

      <MetaCard title="Studio">
        <MetaRow
          label="Practice"
          value={<Strong>{practiceName ?? "—"}</Strong>}
        />
        <MetaRow label="Contact" value={architectName ?? "—"} />
        <MetaRow label="Email" value={architectEmail} />
        {architectPhone ? (
          <MetaRow label="Phone" value={architectPhone} />
        ) : null}
        {where ? <MetaRow label="Based" value={where} /> : null}
        <MetaRow label="Signed up" value={`${when} AEST`} />
      </MetaCard>
    </EmailShell>
  );
}

export default ArchitectSignupOpsEmail;
