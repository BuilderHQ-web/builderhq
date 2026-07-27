/**
 * PartnerIntroOpsEmail — internal notification fired to info@ when a
 * homeowner requests a Preferred Partner introduction (architect,
 * finance broker, or both) via the landing network CTA.
 *
 * The signal for the team: a homeowner wants to be connected. Reply or
 * call them, then make the introduction to the right partner.
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

import {
  introNeedsLabel,
  introNeedsSentence,
} from "@/modules/leads/partner-roles";

/** What the homeowner asked to be introduced to. A list: wanting a
 *  designer AND a broker is the common case. */
export type IntroNeeds = readonly string[];

interface PartnerIntroOpsEmailProps {
  leadId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  needs: IntroNeeds;
  state: string;
  source: string | null;
  createdAt: Date;
}

export function PartnerIntroOpsEmail({
  leadId,
  firstName,
  lastName,
  email,
  phone,
  needs,
  state,
  source,
  createdAt,
}: PartnerIntroOpsEmailProps) {
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "(no name)";
  const formattedDate = createdAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview={`Introduction request: ${fullName} · ${introNeedsLabel(needs)} · ${state}`}
      kicker="HOMEOWNER · Introduction request"
      heading="A homeowner wants an introduction"
      whyReceiving="You're receiving this because you're the ops contact for BuilderHQ. Sent automatically whenever a homeowner requests a Preferred Partner introduction via the landing page."
    >
      <BodyText>
        <Strong>{fullName}</Strong> asked us to introduce{" "}
        <Strong>{introNeedsSentence(needs)}</Strong> in{" "}
        <Strong>{state}</Strong>.
      </BodyText>

      <MetaCard>
        <MetaRow label="Name" value={fullName} />
        <MetaRow label="Looking for" value={introNeedsLabel(needs)} />
        <MetaRow label="State" value={state} />
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
        <MetaRow label="Source" value={source ?? "landing_intro_request"} />
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
        <Strong>Next step:</Strong> reply or call them, then connect them with
        the right Preferred Partner for their build and area.
      </BodyText>

      <Caption>
        The homeowner has received a holding confirmation only. No partner has
        been contacted yet.
      </Caption>
    </EmailShell>
  );
}

export default PartnerIntroOpsEmail;
