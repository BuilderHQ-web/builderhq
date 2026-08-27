/**
 * MetaLeadOpsEmail — internal notification fired to info@ whenever a
 * person completes a Meta Instant Form (Facebook or Instagram lead ad).
 *
 * These leads are warm and perishable: the person filled the form inside
 * the app without leaving it, so they expect a call rather than a slow
 * email sequence. The whole point of this notification is speed, which
 * is why the phone number and the email sit at the top as tap targets.
 *
 * An Instant Form's questions are chosen by whoever built the campaign
 * and change between campaigns, so the extra answers are rendered from
 * whatever came back rather than from a fixed list. When a field could
 * not be mapped at all the notice says so plainly, because a lead with
 * a missing email is still worth chasing through the other channel.
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

interface MetaLeadOpsEmailProps {
  leadId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  /** Answers to questions we do not have a column for. */
  extras: Record<string, string>;
  campaignName: string | null;
  adName: string | null;
  formLabel: string | null;
  platform: string | null;
  incomplete: boolean;
  createdAt: Date;
}

/** Turn a Meta field name into something a person can read. */
function humanise(name: string): string {
  const spaced = name.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function MetaLeadOpsEmail({
  leadId,
  fullName,
  email,
  phone,
  extras,
  campaignName,
  adName,
  formLabel,
  platform,
  incomplete,
  createdAt,
}: MetaLeadOpsEmailProps) {
  const name = fullName.trim() || "(no name given)";
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });
  const channel = platform === "ig" ? "Instagram" : platform === "fb" ? "Facebook" : "Meta";

  return (
    <EmailShell
      preview={`New lead: ${name}${campaignName ? ` · ${campaignName}` : ""}`}
      kicker="LEAD AD · Instant Form"
      heading="New lead from a Meta campaign"
      whyReceiving="You're receiving this because you're the ops contact for BuilderHQ. Sent automatically whenever somebody completes an Instant Form on one of our Facebook or Instagram campaigns."
    >
      <BodyText>
        <Strong>{name}</Strong> completed the form on {channel}
        {campaignName ? (
          <>
            {" "}
            through <Strong>{campaignName}</Strong>
          </>
        ) : null}
        . They filled it in without leaving the app, so they are expecting to
        hear from us rather than to go looking for us.
      </BodyText>

      <MetaCard>
        <MetaRow label="Name" value={name} />
        <MetaRow
          label="Phone"
          value={
            phone ? (
              <InlineLink href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</InlineLink>
            ) : (
              "—"
            )
          }
        />
        <MetaRow
          label="Email"
          value={email ? <InlineLink href={`mailto:${email}`}>{email}</InlineLink> : "—"}
        />
        {Object.entries(extras).map(([key, value]) => (
          <MetaRow key={key} label={humanise(key)} value={value} />
        ))}
        <MetaRow label="Form" value={formLabel ?? "—"} />
        <MetaRow label="Campaign" value={campaignName ?? "—"} />
        <MetaRow label="Ad" value={adName ?? "—"} />
        <MetaRow label="Submitted" value={`${formattedDate} AEST`} />
        <MetaRow
          label="Lead ID"
          value={
            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{leadId}</span>
          }
        />
      </MetaCard>

      <Divider />

      {incomplete ? (
        <BodyText>
          <Strong>Note:</Strong> at least one expected field was missing from
          this submission. The full set of answers is stored on the lead row,
          so if a question was renamed on the form the answer is not lost, only
          unlabelled here.
        </BodyText>
      ) : null}

      <BodyText>
        <Strong>Next step:</Strong> call while the ad is still fresh in mind.
        Nothing has been sent to this person automatically.
      </BodyText>

      <Caption>
        Every answer this person gave is stored on the lead row, including any
        question this notice could not label. Meta can deliver the same lead
        more than once; repeats are discarded before they reach here.
      </Caption>
    </EmailShell>
  );
}

export default MetaLeadOpsEmail;
