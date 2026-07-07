/**
 * PartnerInterestOpsEmail — internal notification fired to info@ whenever
 * an architect or finance broker registers interest in a Preferred Partner
 * network via the landing "Join the network" CTA.
 *
 * The signal for the team: a practitioner wants to be listed + introduced.
 * Canonical fields sit on the lead row (name, email, phone, practice);
 * network / state / website ride in the `meta` jsonb and are surfaced here.
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
import type { PartnerNetwork } from "./PartnerInterestConfirmationEmail";

const NETWORK_LABEL: Record<PartnerNetwork, string> = {
  architect: "Preferred Architect Network",
  finance: "Preferred Finance Partner network",
};

interface PartnerInterestOpsEmailProps {
  leadId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  firmName: string;
  network: PartnerNetwork;
  state: string;
  website: string | null;
  source: string | null;
  createdAt: Date;
}

export function PartnerInterestOpsEmail({
  leadId,
  firstName,
  lastName,
  email,
  phone,
  firmName,
  network,
  state,
  website,
  source,
  createdAt,
}: PartnerInterestOpsEmailProps) {
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "(no name)";
  const label = NETWORK_LABEL[network];
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview={`Partner interest: ${fullName} · ${firmName} · ${label}`}
      kicker={`${network === "architect" ? "ARCHITECT" : "FINANCE"} PARTNER · Interest`}
      heading="New partner-network registration"
      whyReceiving="You're receiving this because you're the ops contact for BuilderHQ. Sent automatically whenever an architect or finance broker registers interest via the landing Join the network CTA."
    >
      <BodyText>
        <Strong>{fullName}</Strong> from <Strong>{firmName}</Strong> registered
        interest in the <Strong>{label}</Strong>.
      </BodyText>

      <MetaCard>
        <MetaRow label="Name" value={fullName} />
        <MetaRow label="Firm" value={firmName} />
        <MetaRow label="Network" value={label} />
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
        <MetaRow label="State" value={state} />
        <MetaRow
          label="Website"
          value={
            website ? (
              <InlineLink href={website}>{website}</InlineLink>
            ) : (
              "—"
            )
          }
        />
        <MetaRow label="Source" value={source ?? "landing_partner_form"} />
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
        <Strong>Next step:</Strong> review the practice, then reply to add them
        to the {label} directory or reach out for anything missing.
      </BodyText>

      <Caption>
        The applicant has received a holding confirmation only. Nothing else has
        gone out. The lead row is in the admin leads dashboard and is
        soft-deletable if it is spam or a duplicate.
      </Caption>
    </EmailShell>
  );
}

export default PartnerInterestOpsEmail;
