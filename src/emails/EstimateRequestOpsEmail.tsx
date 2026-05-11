/**
 * EstimateRequestOpsEmail — internal-only notification fired when
 * someone submits the /estimate_request_landing_page form.
 *
 * Distinct from the guide ops email in three ways:
 *   1. The customer hasn't received any auto-email — your team
 *      contacts them manually, so the subject line is action-oriented
 *      ("ACTION NEEDED: contact within 12hr").
 *   2. More fields are captured (last name, project type, company).
 *   3. We call out the 12-hour SLA prominently so anyone scanning the
 *      inbox can prioritise the right outreach window.
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

interface EstimateRequestOpsEmailProps {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  company: string | null;
  source: string | null;
  createdAt: Date;
}

export function EstimateRequestOpsEmail({
  leadId,
  firstName,
  lastName,
  email,
  phone,
  projectType,
  company,
  source,
  createdAt,
}: EstimateRequestOpsEmailProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "(no name)";
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview={`Estimate request: ${fullName} · ${email} · contact within 12hr`}
      kicker="ACTION NEEDED · Estimate request"
      heading="New estimate request"
      whyReceiving="You're receiving this because you're listed as the ops contact for BuilderHQ. Sent automatically whenever someone submits the free-estimate form."
    >
      <BodyText>
        <Strong>{fullName}</Strong> just requested a free preliminary cost
        estimate. <Strong>The customer has not received any automated email</Strong>
        — they&apos;re expecting you to reach out within{" "}
        <Strong>12 hours</Strong> to collect drawings and get the estimate
        underway.
      </BodyText>

      <MetaCard>
        <MetaRow label="Name" value={fullName} />
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
        <MetaRow label="Project type" value={projectType ?? "Not specified"} />
        <MetaRow label="Practice / Company" value={company ?? "—"} />
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
        <Strong>Next step:</Strong> reach out (call or email) within 12 hours,
        introduce the service, and request their drawings — sketch, DA, or
        whatever stage they&apos;re at. Turn the estimate around within the
        same 12-hour window from drawing receipt.
      </BodyText>

      <Caption>
        If this lead looks suspicious (obvious bot, throwaway domain, weird
        source), the row can be soft-deleted from the admin leads dashboard
        without sending the customer anything.
      </Caption>
    </EmailShell>
  );
}

export default EstimateRequestOpsEmail;
