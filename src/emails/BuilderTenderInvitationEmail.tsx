/**
 * BuilderTenderInvitationEmail — to a builder hand-picked by a
 * project runner (architect or owner) for a tender
 * round. Two audiences share the template:
 *
 *   on-platform  — an approved BuilderHQ builder; the link signs them
 *                  straight into the project.
 *   off-platform — a builder the runner already works with who has no
 *                  account yet; the link carries them through a short
 *                  builder signup and lands them inside the project.
 *
 * Tone: formal letter of invitation. This is the runner extending
 * professional courtesy, not the platform marketing itself. Invited
 * builders never pay, and the email says so plainly.
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

interface BuilderTenderInvitationEmailProps {
  /** Invitee's first name, when the runner supplied one. */
  contactFirstName: string | null;
  /** Who extended the invitation: practice or person. */
  inviterName: string;
  projectTitle: string;
  /** "Fitzroy North, VIC" — suburb-level only, never the address. */
  projectLocation: string | null;
  inviteUrl: string;
  /** True when the invitee already holds a BuilderHQ builder account. */
  onPlatform: boolean;
}

export function BuilderTenderInvitationEmail({
  contactFirstName,
  inviterName,
  projectTitle,
  projectLocation,
  inviteUrl,
  onPlatform,
}: BuilderTenderInvitationEmailProps) {
  const greet = contactFirstName ? `Hello ${contactFirstName},` : "Hello,";
  return (
    <EmailShell
      preview={`${inviterName} has invited you to tender on ${projectTitle}.`}
      kicker="Invitation to tender"
      heading="You are invited to tender"
      whyReceiving={`You are receiving this because ${inviterName} invited you to price a project through BuilderHQ. If you were not expecting this invitation, no action is needed.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <Strong>{inviterName}</Strong> has invited you to submit a tender for{" "}
        <Strong>{projectTitle}</Strong>
        {projectLocation ? ` in ${projectLocation}` : ""}. The invitation is
        personal to you, and there is no cost to take part: invited builders
        tender at no charge.
      </BodyText>

      <MetaCard title="Invitation details">
        <MetaRow label="Project" value={projectTitle} />
        {projectLocation ? (
          <MetaRow label="Location" value={projectLocation} />
        ) : null}
        <MetaRow label="Invited by" value={inviterName} />
        <MetaRow label="Cost to tender" value="None. Invited builders tender free." />
      </MetaCard>

      <BodyText>
        {onPlatform
          ? "Your link below opens the full project on BuilderHQ: drawings, specifications and requirements, ready to price."
          : "Your link below opens the project on BuilderHQ. Creating your builder account takes a few minutes, then the drawings, specifications and requirements are ready to price."}
      </BodyText>

      <PrimaryButton href={inviteUrl}>
        {onPlatform ? "View the project" : "Accept the invitation"}
      </PrimaryButton>

      <Caption>
        This link is unique to your invitation. Every tender on BuilderHQ is
        submitted against the same structured scope, so your price is compared
        fairly and on its merits.
      </Caption>
    </EmailShell>
  );
}

export default BuilderTenderInvitationEmail;
