/**
 * ScopeRunOpsEmail — to the ops desk when an extraction run needs a
 * human, or is about to. Three moods, one letter: a run has started
 * (the heartbeat — if the review email never follows it, something is
 * stuck), the pack is synthesised and waiting for review, or the run
 * failed and a runner is waiting on a promise the platform made them.
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
  kind: "started" | "review" | "failed" | "stalled";
  projectTitle: string;
  evidencedCount: number;
  gapCount: number;
  estimatedCostUsd: number | null;
  error: string | null;
  deskUrl: string;
  /** An earlier run already read this project. */
  isReread?: boolean;
  /** Documents this run ingested. */
  documentCount?: number;
  /** Filenames present now and absent from the previous read. */
  addedDocuments?: string[];
}

/** Named documents, capped so a bulk upload cannot make an unreadable letter. */
const NAME_CAP = 5;

export function ScopeRunOpsEmail({
  kind,
  projectTitle,
  evidencedCount,
  gapCount,
  estimatedCostUsd,
  error,
  deskUrl,
  isReread = false,
  documentCount,
  addedDocuments = [],
}: ScopeRunOpsEmailProps) {
  const review = kind === "review";
  const started = kind === "started";
  const stalled = kind === "stalled";
  const addedLabel =
    addedDocuments.length === 0
      ? null
      : addedDocuments.length <= NAME_CAP
        ? addedDocuments.join(", ")
        : `${addedDocuments.slice(0, NAME_CAP).join(", ")}, and ${
            addedDocuments.length - NAME_CAP
          } more`;
  return (
    <EmailShell
      preview={
        started
          ? `${isReread ? "Re-read" : "Analysis"} started: ${projectTitle}`
          : review
            ? `${isReread ? "Re-read" : "Pack"} ready for review: ${projectTitle}`
            : stalled
              ? `Run stalled: ${projectTitle}`
              : `Extraction failed: ${projectTitle}`
      }
      kicker="Scope engine"
      heading={
        started
          ? isReread
            ? "A re-read has started"
            : "An analysis run has started"
          : review
            ? isReread
              ? "A re-read is waiting for review"
              : "A pack is waiting for review"
            : stalled
              ? "A run has been processing for too long"
              : "An extraction run failed"
      }
      whyReceiving="You are receiving this because you run the BuilderHQ ops desk."
    >
      <BodyText>
        {started ? (
          isReread ? (
            <>
              The owner of <Strong>{projectTitle}</Strong> added documents
              and asked for a fresh read. This replaces the previous pack.
              A second email follows when it is ready for review; if it
              has not arrived within the hour, the run is stuck and the
              desk should look.
            </>
          ) : (
            <>
              The documents on <Strong>{projectTitle}</Strong> have gone in
              for analysis. A second email follows when the pack is ready
              for review; if it has not arrived within the hour, the run is
              stuck and the desk should look.
            </>
          )
        ) : review ? (
          <>
            The documents on <Strong>{projectTitle}</Strong> have been read
            and synthesised.{" "}
            {isReread
              ? "This is a re-read, so it supersedes the pack you reviewed before and the desk pass starts again. "
              : ""}
            Nothing reaches the client until every line carries a verdict,
            so the clock is now on the desk.
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

      <MetaCard
        title={
          started
            ? isReread
              ? "The re-read"
              : "The run"
            : review
              ? isReread
                ? "The re-read"
                : "The pack"
              : "The failure"
        }
      >
        <MetaRow label="Project" value={projectTitle} />
        {started ? (
          <>
            <MetaRow label="Documents in" value={String(documentCount ?? 0)} />
            {addedLabel ? (
              <MetaRow label="Added since the last read" value={addedLabel} />
            ) : null}
          </>
        ) : review ? (
          <>
            <MetaRow label="Documented items" value={String(evidencedCount)} />
            <MetaRow label="Open gaps" value={String(gapCount)} />
            {addedLabel ? (
              <MetaRow label="Added since the last read" value={addedLabel} />
            ) : null}
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
        {started ? "Watch the run" : review ? "Review the pack" : "Open the run"}
      </PrimaryButton>

      <Caption>
        {started
          ? "No action needed yet. This email exists so a silent failure cannot hide."
          : review
            ? "Every verdict you give is recorded and becomes training data for the reader."
            : "Runs are resumable. A restart re-reads only what did not finish."}
      </Caption>
    </EmailShell>
  );
}

export default ScopeRunOpsEmail;
