/**
 * TenderValidityExpiringEmail — to the runner when a priced tender's
 * validity window is closing. A tender is an offer with a clock; the
 * platform's job is to make sure the clock is never a surprise.
 *
 * Tone: a diary note, not an alarm. One fact, one date, one door.
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

interface TenderValidityExpiringEmailProps {
  recipientFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  /** "3 August 2026" — the last day the price holds. */
  holdsUntil: string;
  daysLeft: number;
  reviewUrl: string;
}

export function TenderValidityExpiringEmail({
  recipientFirstName,
  builderCompany,
  projectTitle,
  holdsUntil,
  daysLeft,
  reviewUrl,
}: TenderValidityExpiringEmailProps) {
  const greet = recipientFirstName ? `Hello ${recipientFirstName},` : "Hello,";
  const window =
    daysLeft <= 0
      ? "today"
      : daysLeft === 1
        ? "one more day"
        : `${daysLeft} more days`;
  return (
    <EmailShell
      preview={`${builderCompany}'s price on ${projectTitle} holds ${window}.`}
      kicker="The clock"
      heading="A tender's price window is closing"
      whyReceiving={`You are receiving this because you run the tender round for ${projectTitle} on BuilderHQ.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        The tender from <Strong>{builderCompany}</Strong> on{" "}
        <Strong>{projectTitle}</Strong> holds its price for {window}, until{" "}
        <Strong>{holdsUntil}</Strong>. After that the builder may withdraw or
        reprice it.
      </BodyText>

      <MetaCard title="The window">
        <MetaRow label="Project" value={projectTitle} />
        <MetaRow label="Tender from" value={builderCompany} />
        <MetaRow label="Price holds until" value={holdsUntil} />
      </MetaCard>

      <BodyText>
        If you are close to a decision, the evaluation has every tender side
        by side, ready to compare and award.
      </BodyText>

      <PrimaryButton href={reviewUrl}>Open the evaluation</PrimaryButton>

      <Caption>
        You receive one notice per tender, a few days before its validity
        lapses. Validity windows are set by each builder in their submission.
      </Caption>
    </EmailShell>
  );
}

export default TenderValidityExpiringEmail;
