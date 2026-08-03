/**
 * ScopeAddendumEmail — to every builder on a round when the client
 * re-issues the tender pack. In real tendering an addendum is formal
 * mail, numbered and kept; this is that letter.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  MetaCard,
  MetaRow,
  PrimaryButton,
  Strong,
} from "./_shell";

interface ScopeAddendumEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  /** "Addendum 01" */
  addendumLabel: string;
  /** "2 lines added, 1 revised" */
  summary: string;
  /** This builder holds a draft or submitted tender on the round. */
  hasTender: boolean;
  actionUrl: string;
}

export function ScopeAddendumEmail({
  builderFirstName,
  projectTitle,
  addendumLabel,
  summary,
  hasTender,
  actionUrl,
}: ScopeAddendumEmailProps) {
  const greet = builderFirstName ? `Hello ${builderFirstName},` : "Hello,";
  return (
    <EmailShell
      preview={`${addendumLabel} issued for ${projectTitle}: ${summary}.`}
      kicker="Tender addendum"
      heading={`${addendumLabel} has been issued`}
      whyReceiving={`You are receiving this because you are tendering on ${projectTitle} through BuilderHQ.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        The client has re-issued the tender schedule for{" "}
        <Strong>{projectTitle}</Strong>. The documents changed, the pack was
        read again under the BuilderHQ Scope Standard, and the revised
        schedule is now the one every tender on this round answers.
      </BodyText>

      <MetaCard title={addendumLabel}>
        <MetaRow label="Project" value={projectTitle} />
        <MetaRow label="What moved" value={summary} />
      </MetaCard>

      <BodyText>
        {hasTender
          ? "Your tender was priced against the previous schedule. Open it, review the revised lines in module 5, and confirm your price still stands."
          : "If you intend to tender, price against the revised schedule from the start."}
      </BodyText>

      <PrimaryButton href={actionUrl}>
        {hasTender ? "Review your tender" : "View the project"}
      </PrimaryButton>

      <Caption>
        Every change is recorded line by line. Tenders always show which
        version of the schedule they were priced against, so nothing moves
        quietly on a BuilderHQ round.
      </Caption>
    </EmailShell>
  );
}

export default ScopeAddendumEmail;
