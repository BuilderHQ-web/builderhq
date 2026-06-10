/**
 * OwnerAdvisoryOpsEmail — internal notification to info@builderhq.com.au
 * each time someone requests Owner Advisory via /owneradvisory.
 *
 * This is a warm, high-intent lead (Melbourne build or major reno, about
 * to tender). The email gives the team everything to follow up fast +
 * a one-tap reply. Plain ops tone — copy will be refined.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  MiniLabel,
  PrimaryButton,
  Strong,
} from "./_shell";

interface OwnerAdvisoryOpsEmailProps {
  leadId: string;
  firstName: string;
  email: string;
  phone: string | null;
  projectType: string;
  suburb: string;
  stage: string;
  source: string | null;
  createdAt: Date;
}

export function OwnerAdvisoryOpsEmail({
  leadId,
  firstName,
  email,
  phone,
  projectType,
  suburb,
  stage,
  source,
  createdAt,
}: OwnerAdvisoryOpsEmailProps) {
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  const replyHref = `mailto:${email}?subject=${encodeURIComponent(
    `Your Owner Advisory request, ${firstName}`,
  )}`;

  return (
    <EmailShell
      preview={`Owner Advisory request: ${firstName} · ${projectType} · ${suburb}`}
      kicker="Owner Advisory"
      heading="New advisory request"
      whyReceiving="You're receiving this because you're listed as the ops contact for BuilderHQ. Sent automatically whenever someone requests Owner Advisory."
    >
      <BodyText>
        A Melbourne homeowner just requested <Strong>Owner Advisory</Strong>.
        They&apos;re <Strong>{stage.toLowerCase()}</Strong> on a{" "}
        <Strong>{projectType.toLowerCase()}</Strong> in{" "}
        <Strong>{suburb}</Strong>.
      </BodyText>

      <MetaCard title="The lead">
        <MetaRow label="Name" value={firstName} />
        <MetaRow
          label="Email"
          value={<InlineLink href={`mailto:${email}`}>{email}</InlineLink>}
        />
        {phone ? (
          <MetaRow
            label="Mobile"
            value={
              <InlineLink href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
                {phone}
              </InlineLink>
            }
          />
        ) : null}
        <MetaRow label="Building" value={projectType} />
        <MetaRow label="Suburb" value={suburb} />
        <MetaRow label="Stage" value={stage} />
        <MetaRow label="Source" value={source ?? "direct"} />
        <MetaRow label="Submitted" value={`${formattedDate} AEST`} />
        <MetaRow
          label="Lead ID"
          value={
            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>
              {leadId}
            </span>
          }
        />
      </MetaCard>

      <MiniLabel>Next step</MiniLabel>
      <BodyText>
        Reach out within one business day. Open with a short intro, confirm
        what they&apos;re building, and offer to walk through their builders
        and quotes. Keep it human — they came here worried about getting the
        biggest decision of their life wrong.
      </BodyText>

      <PrimaryButton href={replyHref}>Reply to {firstName}</PrimaryButton>

      <Caption>
        {firstName} has already received a confirmation email setting the
        &ldquo;within one business day&rdquo; expectation. If anything looks
        off (obvious bot, throwaway domain), the lead row can be soft-deleted
        from the admin leads dashboard.
      </Caption>
    </EmailShell>
  );
}

export default OwnerAdvisoryOpsEmail;
