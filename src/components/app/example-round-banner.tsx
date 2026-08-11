"use client";

/**
 * The example round's masthead — a quiet bar above the evaluation
 * that says what this project is, replays the walkthrough, and can
 * remove the example when its work is done. Removal asks twice.
 */

import { useState, useTransition } from "react";
import { BookOpenCheck, Loader2, RotateCcw, Trash2 } from "lucide-react";

import { OPEN_EVENT } from "./example-walkthrough";

export function ExampleRoundBanner({
  removeAction,
}: {
  removeAction: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemove] = useTransition();

  return (
    <div className="mb-5 rounded-lg border border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.06),rgba(250,248,243,0.5)_65%)] px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <p className="inline-flex items-center gap-2 min-w-0 flex-1 text-[12.5px] text-text-muted">
        <BookOpenCheck className="size-4 shrink-0 text-accent-light" />
        <span className="min-w-0">
          <span className="font-ui font-semibold text-text">
            The example round.
          </span>{" "}
          Look anywhere, open anything. Nothing here can be changed, and
          nothing you do here reaches a real builder.
        </span>
      </p>
      <span className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border-strong text-[12px] font-ui text-text hover:bg-surface-1 transition-colors"
        >
          <RotateCcw className="size-3.5" />
          Replay the walkthrough
        </button>
        <button
          type="button"
          disabled={removing}
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              setTimeout(() => setConfirming(false), 4000);
              return;
            }
            startRemove(async () => {
              await removeAction();
            });
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border-subtle text-[12px] font-ui text-text-muted hover:text-[#a8433e] hover:border-[rgba(194,85,80,0.45)] transition-colors disabled:opacity-60"
        >
          {removing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          {confirming ? "Click again to remove" : "Remove the example"}
        </button>
      </span>
    </div>
  );
}
