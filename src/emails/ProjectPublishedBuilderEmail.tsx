/**
 * ProjectPublishedBuilderEmail — sent to every builder when a project
 * goes live. This is the only "marketing class" email — it respects
 * the user's marketing_emails_enabled flag and carries an unsubscribe
 * link in the fineprint per AU Spam Act 2003 requirements.
 *
 * Subject + headline are kept neutral; the body shows the suburb +
 * type + budget band (no exact address, no owner identity — that
 * unlocks for a fee).
 */

import { Section, Text } from "@react-email/components";
import { BodyText, EmailShell, PrimaryButton, StatRow, brand } from "./_shell";

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
      fineprint={
        <>
          You&apos;re receiving this because you&apos;re a builder on BuilderHQ.{" "}
          <a href={unsubscribeUrl} style={{ color: brand.accent }}>
            Unsubscribe
          </a>{" "}
          from new-project alerts. Tender outcome and account emails will keep
          coming — those are operational.
        </>
      }
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        A new project just went live on the marketplace
        {isInServiceArea ? " — and it sits inside your service area" : ""}.
      </BodyText>

      <Section
        style={{
          backgroundColor: "rgba(0,212,200,0.05)",
          border: `1px solid ${brand.border}`,
          borderRadius: "6px",
          padding: "16px 18px",
          margin: "0 0 24px 0",
        }}
      >
        <StatRow label="Type" value={projectType} />
        <StatRow label="Location" value={location} />
        {budgetBand ? <StatRow label="Budget" value={budgetBand} /> : null}
      </Section>

      <PrimaryButton href={projectUrl}>View project</PrimaryButton>

      <Text
        style={{
          fontSize: "12px",
          lineHeight: "20px",
          color: brand.dim,
          margin: "24px 0 0 0",
        }}
      >
        Address, owner contact, and downloadable documents are private until
        you unlock — free with your Founding Builder Access.
      </Text>
    </EmailShell>
  );
}

export default ProjectPublishedBuilderEmail;
