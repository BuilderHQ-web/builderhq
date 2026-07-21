import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
// Constants path (not the module index) — this renders inside client
// components and the index pulls the server-only unlocks service.
import { UNLOCK_CAP } from "@/modules/unlocks/constants";

/**
 * The owner's three-beat journey after publishing. Rendered both on the
 * post-publish screen and on the live project page so the owner always
 * knows where they are and what's coming. `current` highlights the
 * active beat; earlier beats read as done, later ones as upcoming.
 *
 * Pure presentational (no client hooks / server-only imports) so it can
 * render inside both the server detail page and the client celebration.
 */
export type JourneyStage = "notified" | "unlocked" | "tendering";

function stepsFor(
  cap: number,
  mode: "open" | "private" | "hybrid",
): {
  key: JourneyStage;
  title: string;
  body: string;
  eta: string;
}[] {
  return [
    {
      key: "notified",
      title: "Builders are notified",
      body:
        mode === "private"
          ? "The builders you invite are notified with a private link to this round."
          : "Verified builders matching your scope and area are notified when your project goes live.",
      eta: "Live now",
    },
    {
      key: "unlocked",
      title: "Builders join your round",
      body: `Up to ${cap} builders take a spot, open your full plans, and can ask questions here. You are notified each time.`,
      eta: "In a few days",
    },
    {
      key: "tendering",
      title: "Compare and award",
      body: "Priced, itemised tenders arrive side by side. Compare, message, and award the builder you trust.",
      eta: "2 to 3 weeks",
    },
  ];
}

export function WhatsNextSteps({
  current,
  cap = UNLOCK_CAP,
  mode = "open",
}: {
  current: JourneyStage;
  /** Round capacity — how many builders can take a spot. */
  cap?: number;
  mode?: "open" | "private" | "hybrid";
}) {
  const steps = stepsFor(cap, mode);
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {steps.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={step.key}
            className={cn(
              "relative rounded-lg border p-4 transition-colors",
              state === "current"
                ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
                : "border-border-subtle bg-surface-1",
            )}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-[11px] font-bold border tabular-nums",
                  state === "done"
                    ? "border-border-accent text-accent-light"
                    : state === "current"
                      ? "border-accent bg-accent text-accent-contrast"
                      : "border-border-subtle text-text-dim",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[8.5px] tracking-[0.16em] uppercase px-1.5 py-0.5 rounded-sm",
                  state === "current"
                    ? "text-[#0a7d73] border border-border-accent font-semibold"
                    : state === "done"
                      ? "text-accent-light/70"
                      : "text-text-dim",
                )}
              >
                {state === "done"
                  ? "Done"
                  : state === "current"
                    ? "You are here"
                    : step.eta}
              </span>
            </div>
            <h4
              className={cn(
                "font-ui font-semibold text-[13px] mb-1",
                state === "upcoming" ? "text-text-muted" : "text-text",
              )}
            >
              {step.title}
            </h4>
            <p className="text-[11.5px] leading-[1.55] text-text-dim">
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
