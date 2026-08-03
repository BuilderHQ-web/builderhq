/**
 * ScopeReadyEmail — to the runner when ops approves their tender
 * pack. The one email of the preparation phase: your documents have
 * been read, here is what comes next.
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

interface ScopeReadyEmailProps {
  runnerFirstName: string | null;
  projectTitle: string;
  evidencedCount: number;
  gapCount: number;
  reviewUrl: string;
}

export function ScopeReadyEmail({
  runnerFirstName,
  projectTitle,
  evidencedCount,
  gapCount,
  reviewUrl,
}: ScopeReadyEmailProps) {
  const greet = runnerFirstName ? `Hello ${runnerFirstName},` : "Hello,";
  return (
    <EmailShell
      preview={`The tender pack for ${projectTitle} is ready to review.`}
      kicker="Tender pack"
      heading="Your tender pack is ready"
      whyReceiving={`You are receiving this because you submitted ${projectTitle} for preparation on BuilderHQ.`}
    >
      <BodyText>{greet}</BodyText>
      <BodyText>
        We have read every document on <Strong>{projectTitle}</Strong> against
        the BuilderHQ Scope Standard and a reviewer has checked every line.
        {gapCount > 0
          ? ` The documents cover ${evidencedCount} scope items, and ${gapCount} item${gapCount === 1 ? "" : "s"} still need${gapCount === 1 ? "s" : ""} your answer: set an allowance, exclude it from this contract, or add the missing document.`
          : ` The documents cover ${evidencedCount} scope items with nothing left unanswered.`}
      </BodyText>

      <MetaCard title="The pack">
        <MetaRow label="Project" value={projectTitle} />
        <MetaRow label="Documented items" value={String(evidencedCount)} />
        <MetaRow label="Items needing your answer" value={String(gapCount)} />
      </MetaCard>

      <BodyText>
        Once every item has an answer, the round goes live to builders with a
        scope they can price like for like.
      </BodyText>

      <PrimaryButton href={reviewUrl}>Review the tender pack</PrimaryButton>

      <Caption>
        Allowances you set are locked for every builder, so quotes stay
        comparable. You can change answers any time before the round goes
        live.
      </Caption>
    </EmailShell>
  );
}

export default ScopeReadyEmail;
