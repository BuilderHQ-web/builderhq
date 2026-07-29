"use client";

/**
 * The living heart of the waiting page: the analysis, visibly under
 * way. A slow orbiting arc over concentric rings (pure CSS, no
 * timers), and beneath it the four stages of the read with the
 * current one breathing. The page re-checks quietly in the
 * background, so the stage advances on its own and the moment ops
 * approval lands the whole page becomes the pack.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STAGES = [
  {
    key: "opening",
    title: "Opening the set",
    detail: "Each document is identified from its own title block.",
  },
  {
    key: "reading",
    title: "Reading every page",
    detail: "Stated figures only, each tied to its page and revision.",
  },
  {
    key: "assembling",
    title: "Assembling the pack",
    detail: "Every finding cross-checked against the Scope Standard.",
  },
  {
    key: "human",
    title: "Checked by a person",
    detail: "Our review team confirms every line before you see it.",
  },
] as const;

/** run.status → how far along the four stages the read is. */
function stageIndex(runStatus: string): number {
  switch (runStatus) {
    case "pending":
    case "classifying":
      return 0;
    case "extracting":
      return 1;
    case "synthesising":
      return 2;
    default:
      // review and beyond: the machine is done, a person is reading.
      return 3;
  }
}

export function AnalysisTracker({ runStatus }: { runStatus: string }) {
  const router = useRouter();
  const current = stageIndex(runStatus);

  // A quiet refresh keeps the stage honest without the user touching
  // anything. Server components re-render; scroll and focus survive.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div>
      {/* the mark: rings + a slow orbiting arc + a breathing core */}
      <div className="relative mx-auto size-28" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-border-subtle" />
        <span className="absolute inset-[14px] rounded-full border border-border-subtle/70" />
        <span className="absolute inset-[28px] rounded-full border border-border-subtle/40" />
        <span
          className="absolute inset-0 rounded-full animate-[spin_7s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, rgba(0,166,155,0.85) 340deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
          }}
        />
        <span
          className="absolute inset-[14px] rounded-full animate-[spin_11s_linear_infinite_reverse]"
          style={{
            background:
              "conic-gradient(from 180deg, transparent 0deg, transparent 310deg, rgba(0,166,155,0.4) 350deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
          }}
        />
        <span className="absolute inset-0 m-auto size-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_14px_rgba(0,212,200,0.55)]" />
      </div>

      {/* the four stages */}
      <ol className="mt-8 mx-auto max-w-[420px] text-left">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className="relative flex gap-3.5 pb-5 last:pb-0">
              {i < STAGES.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[9px] top-6 bottom-0 w-px",
                    done ? "bg-accent/50" : "bg-border-subtle",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-transparent bg-accent text-accent-contrast"
                    : active
                      ? "border-accent bg-[rgba(0,212,200,0.08)]"
                      : "border-border-subtle bg-surface-1",
                )}
              >
                {done ? (
                  <Check className="size-2.5" strokeWidth={3.5} />
                ) : active ? (
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                ) : null}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[13px] font-ui font-semibold leading-tight",
                    done || active ? "text-text" : "text-text-dim",
                  )}
                >
                  {s.title}
                  {active ? (
                    <span className="ml-2 inline-flex items-baseline gap-[3px] text-accent-light">
                      <Dot delay="0s" />
                      <Dot delay="0.2s" />
                      <Dot delay="0.4s" />
                    </span>
                  ) : null}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11.5px] leading-[1.55]",
                    active ? "text-text-muted" : "text-text-dim",
                  )}
                >
                  {s.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-[3px] rounded-full bg-current animate-pulse"
      style={{ animationDelay: delay }}
    />
  );
}
