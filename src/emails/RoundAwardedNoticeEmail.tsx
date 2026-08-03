/**
 * RoundAwardedNoticeEmail — to the owner side of a round (the runner
 * and every joined seat, minus whoever clicked) when a tender is
 * awarded. The award is the round's verdict; nobody at the table
 * should learn it second-hand.
 *
 * Tone: the formal minute of a decision. States who decided and who
 * won, points at the evaluation for the full record, sells nothing.
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

interface RoundAwardedNoticeEmailProps {
  recipientFirstName: string | null;
  /** Who made the award — practice or person. */
  actorName: string;
  builderCompany: string;
  projectTitle: string;
  reviewUrl: string;
}

export function RoundAwardedNoticeEmail({
  recipientFirstName,
  actorName,
  builderCompany,
  projectTitle,
  reviewUrl,
}: RoundAwardedNoticeEmailProps) {
  const greet = recipientFirstName ? `Hello ${recipientFirstName},` : "Hello,";
  return (
    <EmailShell
      preview={`${projectTitle} has been awarded to ${builderCompany}.`}
      kicker="The decision"
      heading="The round has been awarded"
      whyReceiving={`You are receiving this because you have a seat on ${projectTitle} on BuilderHQ.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <Strong>{actorName}</Strong> has awarded the tender round for{" "}
        <Strong>{projectTitle}</Strong> to <Strong>{builderCompany}</Strong>.
        The full evaluation, every tender and the decision record remain
        available on the round.
      </BodyText>

      <MetaCard title="The decision">
        <MetaRow label="Project" value={projectTitle} />
        <MetaRow label="Awarded to" value={builderCompany} />
        <MetaRow label="Decided by" value={actorName} />
      </MetaCard>

      <PrimaryButton href={reviewUrl}>Open the round</PrimaryButton>

      <Caption>
        This notice goes to everyone with a seat on the round. If you
        believe this decision was made in error, contact the project
        runner directly.
      </Caption>
    </EmailShell>
  );
}

export default RoundAwardedNoticeEmail;
