/**
 * ParticipantJoinedEmail — to the runner when an invited seat is
 * claimed. The runner shared their client's file; the moment the
 * client walks in is worth a line in the inbox.
 *
 * Tone: a quiet confirmation, not an announcement.
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

interface ParticipantJoinedEmailProps {
  runnerFirstName: string | null;
  /** Who claimed the seat — their name, falling back to the email. */
  participantName: string;
  /** Warm label: "Following" | "Deciding". */
  roleLabel: string;
  projectTitle: string;
  projectUrl: string;
}

export function ParticipantJoinedEmail({
  runnerFirstName,
  participantName,
  roleLabel,
  projectTitle,
  projectUrl,
}: ParticipantJoinedEmailProps) {
  const greet = runnerFirstName ? `Hello ${runnerFirstName},` : "Hello,";
  return (
    <EmailShell
      preview={`${participantName} has joined ${projectTitle}.`}
      kicker="Project access"
      heading="Your invitation was accepted"
      whyReceiving={`You are receiving this because you shared ${projectTitle} on BuilderHQ.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <Strong>{participantName}</Strong> has accepted your invitation to{" "}
        <Strong>{projectTitle}</Strong> and now holds a{" "}
        {roleLabel.toLowerCase()} seat on the round.
      </BodyText>

      <MetaCard title="The seat">
        <MetaRow label="Project" value={projectTitle} />
        <MetaRow label="Joined by" value={participantName} />
        <MetaRow label="Their access" value={roleLabel} />
      </MetaCard>

      <PrimaryButton href={projectUrl}>Open the project</PrimaryButton>

      <Caption>
        You can change their access or remove the seat at any time from the
        project&apos;s sharing panel.
      </Caption>
    </EmailShell>
  );
}

export default ParticipantJoinedEmail;
