/**
 * GuideLeadOpsEmail — internal notification to info@builderhq.com.au
 * each time someone downloads the guide.
 *
 * Tight. One screen. Everything we need to follow up if we want to,
 * plus enough context to spot bot floods or weird patterns. Plain
 * tone — this is for us, not a sales lead receipt.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
} from "./_shell";

interface GuideLeadOpsEmailProps {
  leadId: string;
  firstName: string;
  email: string;
  phone: string | null;
  source: string | null;
  createdAt: Date;
}

export function GuideLeadOpsEmail({
  leadId,
  firstName,
  email,
  phone,
  source,
  createdAt,
}: GuideLeadOpsEmailProps) {
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview={`New guide download: ${firstName} · ${email}`}
      kicker="Lead capture"
      heading="New guide download"
      whyReceiving="You're receiving this because you're listed as the ops contact for BuilderHQ. Sent automatically whenever someone downloads a guide PDF."
    >
      <BodyText>
        Someone just grabbed the <strong>Melbourne Build Brief</strong>.
      </BodyText>

      <MetaCard>
        <MetaRow label="Name" value={firstName} />
        <MetaRow
          label="Email"
          value={
            <InlineLink href={`mailto:${email}`}>{email}</InlineLink>
          }
        />
        <MetaRow
          label="Phone"
          value={
            phone
              ? <InlineLink href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</InlineLink>
              : "—"
          }
        />
        <MetaRow label="Source" value={source ?? "direct"} />
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

      <Caption>
        The user-facing email with the PDF link is on its way to them.
        No further action needed — but if you spot something off
        (obvious bot, throwaway domain, weird source), the lead row
        can be soft-deleted from the admin leads dashboard.
      </Caption>
    </EmailShell>
  );
}

export default GuideLeadOpsEmail;
