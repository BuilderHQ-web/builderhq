/**
 * TenderSubmittedEmail — to project owner when a builder submits a
 * tender. The owner's "you got mail" moment.
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

interface TenderSubmittedEmailProps {
  ownerFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  totalPriceAud: number;
  durationWeeks: number;
  validityDays: number;
  reviewUrl: string;
}

const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

export function TenderSubmittedEmail({
  ownerFirstName,
  builderCompany,
  projectTitle,
  totalPriceAud,
  durationWeeks,
  validityDays,
  reviewUrl,
}: TenderSubmittedEmailProps) {
  const greet = ownerFirstName ? `Hi ${ownerFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`${builderCompany} sent a tender on ${projectTitle}.`}
      kicker="New tender"
      heading={`${builderCompany} sent you a tender`}
      whyReceiving="You're receiving this because a builder submitted a tender on a project you own. Tender alerts are part of running an active project."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        <Strong>{builderCompany}</Strong> just submitted a tender on{" "}
        <Strong>{projectTitle}</Strong>. Open the comparison view to read the
        number, scope, and pitch — side by side with any other tenders you
        receive.
      </BodyText>

      <MetaCard title="At a glance">
        <MetaRow label="Total price" value={formatAud(totalPriceAud)} />
        <MetaRow label="Build duration" value={`${durationWeeks} weeks`} />
        <MetaRow label="Tender valid for" value={`${validityDays} days`} />
      </MetaCard>

      <PrimaryButton href={reviewUrl}>Review tender</PrimaryButton>

      <Caption>
        You can shortlist multiple builders before deciding — comparing up to
        three side-by-side gives you the clearest read on value and fit.
      </Caption>
    </EmailShell>
  );
}

export default TenderSubmittedEmail;
