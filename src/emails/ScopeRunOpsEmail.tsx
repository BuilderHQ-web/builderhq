/**
 * ScopeRunOpsEmail — to the ops desk when an extraction run needs a
 * human. Two moods, one letter: the pack is synthesised and waiting
 * for review, or the run failed and a runner is waiting on a promise
 * the platform made them.
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

interface ScopeRunOpsEmailProps {
  kind: "review" | "failed";
  projectTitle: string;
  evidencedCount: number;
  gapCount: number;
  estimatedCostUsd: number | null;
  error: string | null;
  deskUrl: string;
}

export function ScopeRunOpsEmail({
  kind,
  projectTitle,
  evidencedCount,
  gapCount,
  estimatedCostUsd,
  error,
  deskUrl,
}: ScopeRunOpsEmailProps) {
  const review = kind === "review";
  return (
    <EmailShell
      preview={
        review
          ? `Pack ready for review: ${projectTitle}`
          : `Extraction failed: ${projectTitle}`
      }
      kicker="Scope engine"
      heading={
        review ? "A pack is waiting for review" : "An extraction run failed"
      }
      whyReceiving="You are receiving this because you run the BuilderHQ ops desk."
    >
      <BodyText>
        {review ? (
          <>
            The documents on <Strong>{projectTitle}</Strong> have been read
            and synthesised. Nothing reaches the client until every line
            carries a verdict, so the clock is now on the desk.
          </>
        ) : (
          <>
            The extraction run on <Strong>{projectTitle}</Strong> stopped
            with an error. The client has been told their documents are
            being read; they have not been told anything since. Restart the
            run from the desk once the cause is clear.
          </>
        )}
      </BodyText>

      <MetaCard title={review ? "The pack" : "The failure"}>
        <MetaRow label="Project" value={projectTitle} />
        {review ? (
          <>
            <MetaRow label="Documented items" value={String(evidencedCount)} />
            <MetaRow label="Open gaps" value={String(gapCount)} />
            {estimatedCostUsd !== null ? (
              <MetaRow
                label="Model spend"
                value={`$${estimatedCostUsd.toFixed(2)} USD`}
              />
            ) : null}
          </>
        ) : (
          <MetaRow label="Error" value={error ?? "Unknown"} />
        )}
      </MetaCard>

      <PrimaryButton href={deskUrl}>
        {review ? "Review the pack" : "Open the run"}
      </PrimaryButton>

      <Caption>
        {review
          ? "Every verdict you give is recorded and becomes training data for the reader."
          : "Runs are resumable. A restart re-reads only what did not finish."}
      </Caption>
    </EmailShell>
  );
}

export default ScopeRunOpsEmail;
