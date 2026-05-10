/**
 * UnlockOwnerEmail — to project owner when a builder unlocks their
 * project. Owner sees who unlocked, plus the verification chips so
 * they know it's a real, vetted builder.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  PrimaryButton,
  Strong,
} from "./_shell";

interface UnlockOwnerEmailProps {
  ownerFirstName: string | null;
  builderCompany: string;
  builderState: string | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  projectTitle: string;
  projectUrl: string;
  builderProfileUrl: string | null;
}

export function UnlockOwnerEmail({
  ownerFirstName,
  builderCompany,
  builderState,
  abnVerified,
  anyLicenceVerified,
  projectTitle,
  projectUrl,
  builderProfileUrl,
}: UnlockOwnerEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`${builderCompany} unlocked ${projectTitle}.`}
      kicker="Project unlocked"
      heading={`${builderCompany} is reviewing your project`}
      whyReceiving="You're receiving this because a builder accessed the private details of a project you own. We tell you every time."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <Strong>{builderCompany}</Strong> just unlocked{" "}
        <Strong>{projectTitle}</Strong> — they now have your address, contact
        details, and the documents you uploaded. A tender may follow.
      </BodyText>

      <MetaCard title="Builder">
        <MetaRow label="Company" value={<Strong>{builderCompany}</Strong>} />
        {builderState ? <MetaRow label="State" value={builderState} /> : null}
        <MetaRow
          label="ABN"
          value={abnVerified ? "Verified active · ABR" : "Pending verification"}
        />
        <MetaRow
          label="Licence"
          value={
            anyLicenceVerified
              ? "Verified active · state register"
              : "Pending verification"
          }
        />
      </MetaCard>

      <PrimaryButton href={projectUrl}>View project</PrimaryButton>

      {builderProfileUrl ? (
        <Caption>
          See their public profile —{" "}
          <InlineLink href={builderProfileUrl}>{builderCompany}</InlineLink>
        </Caption>
      ) : null}
    </EmailShell>
  );
}

export default UnlockOwnerEmail;
