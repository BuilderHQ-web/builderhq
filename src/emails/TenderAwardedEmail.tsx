/**
 * TenderAwardedEmail — to builder when owner awards them the project.
 *
 * The big moment. Surfaces owner contact details so the builder can
 * reach out directly to start contract conversations off-platform.
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

interface TenderAwardedEmailProps {
  builderFirstName: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  projectTitle: string;
  tenderUrl: string;
}

export function TenderAwardedEmail({
  builderFirstName,
  ownerName,
  ownerEmail,
  ownerPhone,
  projectTitle,
  tenderUrl,
}: TenderAwardedEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Awarded: ${projectTitle}.`}
      kicker="Awarded"
      heading="Congratulations — you won this one"
      whyReceiving="You're receiving this because you've been awarded a project you tendered on. This is a contractual notification we always deliver."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        You&apos;ve been awarded <Strong>{projectTitle}</Strong>. The owner
        chose your tender — well done.
      </BodyText>

      <MetaCard title="Owner contact">
        {ownerName ? <MetaRow label="Name" value={<Strong>{ownerName}</Strong>} /> : null}
        <MetaRow label="Email" value={ownerEmail} />
        {ownerPhone ? <MetaRow label="Phone" value={ownerPhone} /> : null}
      </MetaCard>

      <BodyText>
        Reach out directly to confirm scope, timing, and contract. The project
        page in BuilderHQ keeps a record of the awarded tender for your files.
      </BodyText>

      <PrimaryButton href={tenderUrl}>Open project</PrimaryButton>

      <Caption>
        BuilderHQ takes no commission on awarded projects — once you&apos;re
        chosen, the relationship is between you and the owner.
      </Caption>
    </EmailShell>
  );
}

export default TenderAwardedEmail;
