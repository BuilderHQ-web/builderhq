/**
 * ScopeReadyEmail — to the runner when ops approves their tender
 * pack. The one email of the preparation phase: your documents have
 * been read, here is what comes next.
 *
 * WHAT THE NUMBERS MEAN, AND WHY THEY CHANGED. This letter used to
 * report the raw gap count as "items needing your answer". Approval
 * resolves every gap that is the builders' ordinary work to
 * builder-priced before the letter is sent, so that number was never
 * the number of things the runner had to do: one pack said 105 when
 * the true figure was 21. Worse, a number that size reads as a defect
 * report on the architect, and a gap is the opposite of that. It is a
 * question the pack asks so it never becomes a variation.
 *
 * So the letter now reports the scope, what the builders carry, and
 * what is genuinely waiting on the runner.
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
  /** Every line a builder prices: documented plus gap. */
  scopeItems: number;
  /** Gaps the builders carry and price without the runner. */
  builderCarried: number;
  /** Gaps genuinely waiting on the runner. */
  decisions: number;
  /** Of those decisions, the ones that are an allowance to set. */
  allowances: number;
  reviewUrl: string;
}

const plural = (n: number, one: string, many: string) =>
  n === 1 ? one : many;

export function ScopeReadyEmail({
  runnerFirstName,
  projectTitle,
  scopeItems,
  builderCarried,
  decisions,
  allowances,
  reviewUrl,
}: ScopeReadyEmailProps) {
  const greet = runnerFirstName ? `Hello ${runnerFirstName},` : "Hello,";

  const scopeLine = `Your scope of works runs to ${scopeItems} ${plural(scopeItems, "item", "items")}, and every builder prices the same list.`;

  const carriedLine =
    builderCarried > 0
      ? ` ${builderCarried} of ${plural(builderCarried, "them is a gap your builders carry and price themselves", "them are gaps your builders carry and price themselves")}, so nothing there is waiting on you.`
      : "";

  const decisionLine =
    decisions > 0
      ? ` ${decisions} ${plural(decisions, "needs", "need")} a decision from you${
          allowances > 0
            ? `, and ${allowances} of those ${plural(allowances, "is an allowance", "are allowances")} to set`
            : ""
        }.`
      : " Nothing is left waiting on your answer.";

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
      </BodyText>
      <BodyText>
        {scopeLine}
        {carriedLine}
        {decisionLine}
      </BodyText>

      <MetaCard title="The pack">
        <MetaRow label="Project" value={projectTitle} />
        <MetaRow label="Scope of works items" value={String(scopeItems)} />
        {builderCarried > 0 ? (
          <MetaRow
            label="Gaps carried by your builders"
            value={String(builderCarried)}
          />
        ) : null}
        <MetaRow
          label="Decisions for you"
          value={decisions > 0 ? String(decisions) : "None"}
        />
      </MetaCard>

      <BodyText>
        {decisions > 0
          ? `Once those ${decisions} ${plural(decisions, "is", "are")} answered, the round goes live to builders with a scope they can price like for like.`
          : "The round can go live to builders whenever you are ready, with a scope they can price like for like."}
      </BodyText>

      <PrimaryButton href={reviewUrl}>Review the tender pack</PrimaryButton>

      <Caption>
        A decision is one of three things: set an allowance, exclude it from
        this contract, or supply the missing document. Allowances you set are
        locked for every builder, so quotes stay comparable, and you can change
        any answer before the round goes live.
      </Caption>
    </EmailShell>
  );
}

export default ScopeReadyEmail;
