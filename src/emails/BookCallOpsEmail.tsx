/**
 * BookCallOpsEmail — internal-only notification fired when someone
 * submits the /book-a-call form (the "Book a free call" Google Ads
 * funnel).
 *
 * Sister to EstimateRequestOpsEmail. The qualifier details (project
 * type, location, timeline) are captured by OUR form and surfaced here;
 * the actual time slot is booked on Cal.com, which sends its own
 * confirmation + drops the event on your calendar. So this email is the
 * lead record + a heads-up to be ready for the call — and a prompt to
 * reach out manually if they filled the form but didn't pick a slot.
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

interface BookCallOpsEmailProps {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  location: string | null;
  timeline: string | null;
  source: string | null;
  createdAt: Date;
}

export function BookCallOpsEmail({
  leadId,
  firstName,
  lastName,
  email,
  phone,
  projectType,
  location,
  timeline,
  source,
  createdAt,
}: BookCallOpsEmailProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "(no name)";
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview={`Call request: ${fullName} · ${email} · be ready to match them with builders`}
      kicker="ACTION NEEDED · Call request"
      heading="New call request"
      whyReceiving="You're receiving this because you're listed as the ops contact for BuilderHQ. Sent automatically whenever someone submits the 'Book a call' form."
    >
      <BodyText>
        <Strong>{fullName}</Strong> just requested a free intro call to get
        matched with builders. If they picked a time it&apos;s already on your{" "}
        <Strong>Cal.com calendar</Strong> — if they filled the form but
        didn&apos;t book a slot, reach out within{" "}
        <Strong>12 hours</Strong> to lock one in.
      </BodyText>

      <MetaCard>
        <MetaRow label="Name" value={fullName} />
        <MetaRow
          label="Email"
          value={<InlineLink href={`mailto:${email}`}>{email}</InlineLink>}
        />
        <MetaRow
          label="Phone"
          value={
            phone
              ? <InlineLink href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</InlineLink>
              : "—"
          }
        />
        <MetaRow label="Project type" value={projectType ?? "Not specified"} />
        <MetaRow label="Location" value={location ?? "—"} />
        <MetaRow label="Timeline" value={timeline ?? "—"} />
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

      <BodyText>
        <Strong>Next step:</Strong> before the call, line up 2–3 builders who
        fit their project type, location and timeline so you can offer real
        matches live. The whole pitch is that we do the legwork for them.
      </BodyText>

      <Caption>
        If this lead looks suspicious (obvious bot, throwaway domain, weird
        source), the row can be soft-deleted from the admin leads dashboard
        without contacting them.
      </Caption>
    </EmailShell>
  );
}

export default BookCallOpsEmail;
