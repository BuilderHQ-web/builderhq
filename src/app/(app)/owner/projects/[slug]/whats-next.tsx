import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The owner's three-beat journey after publishing. Rendered both on the
 * post-publish celebration screen and on the live project page so the
 * owner always knows where they are and what's coming — no "what now?"
 * dead air. `current` highlights the active beat; earlier beats read as
 * done, later ones as upcoming.
 *
 * Pure presentational (no client hooks / server-only imports) so it can
 * render inside both the server detail page and the client celebration.
 */
export type JourneyStage = "notified" | "unlocked" | "tendering";

const STEPS: {
  key: JourneyStage;
  title: string;
  body: string;
  eta: string;
}[] = [
  {
    key: "notified",
    title: "Builders are notified",
    body: "Verified builders matching your scope and area get an alert the moment you publish.",
    eta: "Live now",
  },
  {
    key: "unlocked",
    title: "They unlock & message you",
    body: "Up to 3 builders open your full plans and can ask questions right here — you're notified each time.",
    eta: "In a few days",
  },
  {
    key: "tendering",
    title: "Compare tenders & award",
    body: "Priced, itemised tenders land side-by-side. Compare, message, and award the builder you trust.",
    eta: "2–3 weeks",
  },
];

export function WhatsNextSteps({ current }: { current: JourneyStage }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={step.key}
            className={cn(
              "relative rounded-md border p-4 transition-colors",
              state === "current"
                ? "border-border-accent bg-accent-muted/40"
                : "border-border-subtle bg-surface-1/30",
            )}
            style={
              state === "current"
                ? {
                    boxShadow:
                      "0 0 0 1px rgba(0,212,200,0.16), 0 16px 44px -24px rgba(0,212,200,0.55)",
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between mb-2.5">
              <span
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-[11px] font-bold border tabular-nums",
                  state === "done"
                    ? "border-border-accent text-accent-light"
                    : state === "current"
                      ? "border-accent text-accent-contrast"
                      : "border-border-subtle text-text-dim",
                )}
                style={
                  state === "current"
                    ? { background: "var(--color-accent)" }
                    : undefined
                }
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[8.5px] tracking-[0.16em] uppercase px-1.5 py-0.5 rounded-sm",
                  state === "current"
                    ? "text-accent border border-border-accent"
                    : state === "done"
                      ? "text-accent-light/70"
                      : "text-text-dim",
                )}
              >
                {state === "done"
                  ? "Done"
                  : state === "current"
                    ? "You're here"
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
