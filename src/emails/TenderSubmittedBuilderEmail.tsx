/**
 * TenderSubmittedBuilderEmail — confirmation to the builder that
 * their tender is in. Pairs with TenderSubmittedEmail (which goes to
 * the owner).
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

interface TenderSubmittedBuilderEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  totalPriceAud: number;
  durationWeeks: number;
  validityDays: number;
  tenderUrl: string;
}

const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

export function TenderSubmittedBuilderEmail({
  builderFirstName,
  projectTitle,
  totalPriceAud,
  durationWeeks,
  validityDays,
  tenderUrl,
}: TenderSubmittedBuilderEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Tender submitted on ${projectTitle}.`}
      kicker="Tender submitted"
      heading="Your tender is in"
      whyReceiving="You're receiving this because you submitted a tender on BuilderHQ. We confirm every submission so you have a written record."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        Your tender on <Strong>{projectTitle}</Strong> is now in front of the
        owner. We&apos;ll email you the moment they shortlist or decide.
      </BodyText>

      <MetaCard title="What you submitted">
        <MetaRow label="Total price" value={formatAud(totalPriceAud)} />
        <MetaRow label="Build duration" value={`${durationWeeks} weeks`} />
        <MetaRow label="Tender valid for" value={`${validityDays} days`} />
      </MetaCard>

      <PrimaryButton href={tenderUrl}>View your tender</PrimaryButton>

      <Caption>
        Need to change something? Withdraw to edit and re-submit any time
        before the owner decides.
      </Caption>
    </EmailShell>
  );
}

export default TenderSubmittedBuilderEmail;
