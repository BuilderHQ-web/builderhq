/**
 * UnlockBuilderEmail — receipt to the builder confirming they unlocked
 * a project. Doubles as a useful reference doc — the address, owner
 * contact, and project URL are all here so they don't have to log
 * back in to find them.
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

interface UnlockBuilderEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  projectAddress: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  projectUrl: string;
  unlockedViaFba: boolean;
}

export function UnlockBuilderEmail({
  builderFirstName,
  projectTitle,
  projectAddress,
  ownerName,
  ownerEmail,
  ownerPhone,
  projectUrl,
  unlockedViaFba,
}: UnlockBuilderEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Unlocked: ${projectTitle}`}
      kicker={unlockedViaFba ? "Free with FBA · Unlocked" : "Unlocked"}
      heading={projectTitle}
      whyReceiving="You're receiving this because you unlocked a project on BuilderHQ. We send a receipt every time so you have these details handy."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        You&apos;ve unlocked <Strong>{projectTitle}</Strong>. Here&apos;s a
        quick reference for your records — the same details are always live on
        the project page.
      </BodyText>

      <MetaCard title="Project">
        {projectAddress ? (
          <MetaRow label="Address" value={projectAddress} />
        ) : null}
        <MetaRow label="Owner" value={<Strong>{ownerName ?? "—"}</Strong>} />
        <MetaRow label="Email" value={ownerEmail} />
        {ownerPhone ? <MetaRow label="Phone" value={ownerPhone} /> : null}
      </MetaCard>

      <PrimaryButton href={projectUrl}>Open project</PrimaryButton>

      <Caption>
        Next step — open the project, review the documents, then submit a
        tender when you&apos;re ready. Owners see complete tenders first.
      </Caption>
    </EmailShell>
  );
}

export default UnlockBuilderEmail;
