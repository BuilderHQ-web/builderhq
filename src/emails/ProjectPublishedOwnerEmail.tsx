/**
 * ProjectPublishedOwnerEmail — confirmation to the owner that their
 * project is live on the marketplace.
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

interface ProjectPublishedOwnerEmailProps {
  ownerFirstName: string | null;
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  manageUrl: string;
}

export function ProjectPublishedOwnerEmail({
  ownerFirstName,
  projectTitle,
  projectType,
  suburb,
  state,
  budgetBand,
  manageUrl,
}: ProjectPublishedOwnerEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  const location = [suburb, state].filter(Boolean).join(", ") || "—";
  return (
    <EmailShell
      preview={`${projectTitle} is live on the BuilderHQ marketplace.`}
      kicker="Project live"
      heading={`${projectTitle} is live`}
      whyReceiving="You're receiving this because you publish projects on BuilderHQ. We email you a confirmation each time one goes live."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Your project is now in front of every verified builder on BuilderHQ.
        We&apos;ll email you the moment a builder unlocks it or submits a
        tender — nothing else for you to do right now.
      </BodyText>

      <MetaCard>
        <MetaRow label="Project" value={<Strong>{projectTitle}</Strong>} />
        <MetaRow label="Type" value={projectType} />
        <MetaRow label="Location" value={location} />
        {budgetBand ? <MetaRow label="Budget" value={budgetBand} /> : null}
      </MetaCard>

      <PrimaryButton href={manageUrl}>Manage project</PrimaryButton>

      <Caption>
        Tip — clear briefs and complete document sets typically pull 3× more
        tenders. You can edit any field and re-publish at any time from the
        manage page.
      </Caption>
    </EmailShell>
  );
}

export default ProjectPublishedOwnerEmail;
