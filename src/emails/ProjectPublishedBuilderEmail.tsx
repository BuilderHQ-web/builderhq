/**
 * ProjectPublishedBuilderEmail — sent to every builder when a project
 * goes live. The only "marketing class" email — respects each user's
 * marketing_emails_enabled flag and carries an unsubscribe link in
 * both the visible footer and the List-Unsubscribe header (set by the
 * email send wrapper) per AU Spam Act 2003 + RFC 8058.
 *
 * Subject + headline are kept neutral; the body shows the suburb +
 * type + budget band — never the exact address or owner identity
 * (those unlock for a fee).
 */

import {
  BodyText,
  Caption,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  PrimaryButton,
} from "./_shell";

interface ProjectPublishedBuilderEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  isInServiceArea: boolean;
  projectUrl: string;
  unsubscribeUrl: string;
}

export function ProjectPublishedBuilderEmail({
  builderFirstName,
  projectTitle,
  projectType,
  suburb,
  state,
  budgetBand,
  isInServiceArea,
  projectUrl,
  unsubscribeUrl,
}: ProjectPublishedBuilderEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  const location = [suburb, state].filter(Boolean).join(", ") || "—";
  return (
    <EmailShell
      preview={`New ${projectType.toLowerCase()} in ${location}`}
      kicker={isInServiceArea ? "In your service area" : "New project"}
      heading={projectTitle}
      whyReceiving={
        <>
          You&apos;re receiving this because you&apos;re a builder on
          BuilderHQ. Tender outcome and account emails are operational
          and always come through.{" "}
          <InlineLink href={unsubscribeUrl}>
            Unsubscribe from new-project alerts
          </InlineLink>
          .
        </>
      }
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        A new project just went live on the platform
        {isInServiceArea ? " — and it sits inside your service area" : ""}.
      </BodyText>

      <MetaCard>
        <MetaRow label="Type" value={projectType} />
        <MetaRow label="Location" value={location} />
        {budgetBand ? <MetaRow label="Budget" value={budgetBand} /> : null}
      </MetaCard>

      <PrimaryButton href={projectUrl}>View project</PrimaryButton>

      <Caption>
        Address, owner contact, and downloadable documents are private until
        you unlock — free with your Founding Builder Access.
      </Caption>
    </EmailShell>
  );
}

export default ProjectPublishedBuilderEmail;
