/**
 * ParticipantInviteEmail — to the person a project runner shares their
 * project with. Designed around the flagship case: an architect
 * bringing their client into the tender file. The seat is read-only
 * ("Following") or carries decision powers ("Deciding"); the email
 * says which in plain words.
 *
 * Tone: the runner extending access to something that is already the
 * invitee's — their own project. Institutional, warm, no selling.
 * The link is personal, email-bound and expires; the email states all
 * three plainly so nobody forwards it expecting it to work.
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

interface ParticipantInviteEmailProps {
  /** Invitee's first name, when the runner supplied one. */
  recipientFirstName: string | null;
  /** Who shared the project: practice or person. */
  inviterName: string;
  projectTitle: string;
  /** "Fitzroy North, VIC" — suburb-level only, never the address. */
  projectLocation: string | null;
  /** The seat's powers, already in warm words: "Following" | "Deciding". */
  roleLabel: string;
  roleLine: string;
  claimUrl: string;
  /** "12 August 2026" — when the link lapses. */
  expiresOn: string;
}

export function ParticipantInviteEmail({
  recipientFirstName,
  inviterName,
  projectTitle,
  projectLocation,
  roleLabel,
  roleLine,
  claimUrl,
  expiresOn,
}: ParticipantInviteEmailProps) {
  const greet = recipientFirstName ? `Hello ${recipientFirstName},` : "Hello,";
  return (
    <EmailShell
      preview={`${inviterName} has shared ${projectTitle} with you on BuilderHQ.`}
      kicker="Project access"
      heading="A project has been shared with you"
      whyReceiving={`You are receiving this because ${inviterName} shared a project with this email address on BuilderHQ. If you were not expecting this, no action is needed and the link will simply expire.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <Strong>{inviterName}</Strong> has shared{" "}
        <Strong>{projectTitle}</Strong>
        {projectLocation ? ` in ${projectLocation}` : ""} with you on
        BuilderHQ, the platform where the project&apos;s tender round runs.
        {" "}
        {roleLine}
      </BodyText>

      <MetaCard title="Access details">
        <MetaRow label="Project" value={projectTitle} />
        {projectLocation ? (
          <MetaRow label="Location" value={projectLocation} />
        ) : null}
        <MetaRow label="Shared by" value={inviterName} />
        <MetaRow label="Your access" value={roleLabel} />
        <MetaRow label="Link valid until" value={expiresOn} />
      </MetaCard>

      <BodyText>
        Use the button below to open the project. If you do not have a
        BuilderHQ account yet, creating one takes a minute; use this email
        address, as the invitation is bound to it.
      </BodyText>

      <PrimaryButton href={claimUrl}>Open the project</PrimaryButton>

      <Caption>
        This link is personal to you and works only for an account signed in
        with the address it was sent to. It can be used once and lapses on{" "}
        {expiresOn}. If it has expired, ask {inviterName} to send a fresh one.
      </Caption>
    </EmailShell>
  );
}

export default ParticipantInviteEmail;
