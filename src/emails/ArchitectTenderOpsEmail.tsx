/**
 * ArchitectTenderOpsEmail — internal notification fired when a Melbourne
 * architect confirms onboarding via /architect-tender.
 *
 * This is the operational signal that Aryan needs to act within 24
 * hours: spin up dashboard access for the architect, prepare the
 * project profile from public PlanningAlerts materials, and start
 * builder outreach against the project address.
 *
 * Lead data ride pattern is identical to EstimateRequestOpsEmail:
 * canonical fields on the lead row, campaign-specific extras (surname,
 * practice, project address, ref) pulled from the `meta` jsonb.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

interface ArchitectTenderOpsEmailProps {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  practiceName: string;
  projectAddress: string;
  source: string | null;
  ref: string | null;
  createdAt: Date;
}

export function ArchitectTenderOpsEmail({
  leadId,
  firstName,
  lastName,
  email,
  phone,
  practiceName,
  projectAddress,
  source,
  ref,
  createdAt,
}: ArchitectTenderOpsEmailProps) {
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "(no name)";
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview={`Architect onboarding: ${fullName} · ${practiceName} · ${projectAddress}`}
      kicker="ARCHITECT TENDER · Confirmed"
      heading="New architect onboarded for tender"
      whyReceiving="You're receiving this because you're the ops contact for BuilderHQ. Sent automatically whenever an architect confirms onboarding via /architect-tender — the Moonee Valley + Merri-bek cold-outreach campaign."
    >
      <BodyText>
        <Strong>{fullName}</Strong> from <Strong>{practiceName}</Strong> has
        confirmed onboarding for the project at{" "}
        <Strong>{projectAddress}</Strong>. They&apos;re expecting dashboard
        access and next steps within 24 hours.
      </BodyText>

      <MetaCard>
        <MetaRow label="Architect" value={fullName} />
        <MetaRow label="Practice" value={practiceName} />
        <MetaRow
          label="Email"
          value={<InlineLink href={`mailto:${email}`}>{email}</InlineLink>}
        />
        <MetaRow
          label="Phone"
          value={
            phone ? (
              <InlineLink href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
                {phone}
              </InlineLink>
            ) : (
              "—"
            )
          }
        />
        <MetaRow label="Project address" value={projectAddress} />
        <MetaRow label="Council / ref" value={ref ?? "—"} />
        <MetaRow label="Source" value={source ?? "architect_outreach"} />
        <MetaRow label="Submitted" value={formattedDate + " AEST"} />
        <MetaRow
          label="Lead ID"
          value={
            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>
              {leadId}
            </span>
          }
        />
      </MetaCard>

      <Divider />

      <BodyText>
        <Strong>Next step:</Strong> reply to the architect personally within
        24 hours with their dashboard credentials and the project profile
        drafted from the publicly available planning application materials.
        Builder outreach kicks off once they sign off on the brief.
      </BodyText>

      <Caption>
        If anything about this submission looks off — wrong council area,
        already onboarded, duplicate of another lead — the row is
        soft-deletable from the admin leads dashboard. The architect has
        only received a holding email; nothing client-facing has gone out
        yet.
      </Caption>
    </EmailShell>
  );
}

export default ArchitectTenderOpsEmail;
