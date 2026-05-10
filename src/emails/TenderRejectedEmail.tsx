/**
 * TenderRejectedEmail — to builder when owner moves forward with
 * someone else. Short, kind, no detail. Keeps the door open for the
 * next project.
 */

import {
  BodyText,
  Caption,
  EmailShell,
  PrimaryButton,
  Strong,
} from "./_shell";

interface TenderRejectedEmailProps {
  builderFirstName: string | null;
  projectTitle: string;
  browseUrl: string;
}

export function TenderRejectedEmail({
  builderFirstName,
  projectTitle,
  browseUrl,
}: TenderRejectedEmailProps) {
  const greet = builderFirstName ? `Hi ${builderFirstName},` : "Hi,";
  return (
    <EmailShell
      preview={`Decision made on ${projectTitle}.`}
      kicker="Decision made"
      heading="Thanks for tendering"
      tone="muted"
      whyReceiving="You're receiving this because you tendered on a project that's now been decided."
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        The owner of <Strong>{projectTitle}</Strong> has moved forward with
        another builder. Thanks for putting your tender in — we know how much
        work goes into a good one.
      </BodyText>

      <PrimaryButton href={browseUrl}>Browse projects</PrimaryButton>

      <Caption>
        New residential projects go live on the marketplace every week. Keep an
        eye on your dashboard for the next match in your service area.
      </Caption>
    </EmailShell>
  );
}

export default TenderRejectedEmail;
