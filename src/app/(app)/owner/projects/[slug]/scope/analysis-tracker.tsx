"use client";

/**
 * The waiting page's quiet heart: three stages of the read, the
 * current one breathing, over a single slow arc (pure CSS, no
 * timers). The page re-checks in the background, so the stage
 * advances on its own; once the machine is done a small line says a
 * final check is under way, and the moment the pack is ready the
 * whole page becomes it.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STAGES = [
  {
    key: "opening",
    title: "Opening your documents",
    detail: "Each file is identified.",
  },
  {
    key: "reading",
    title: "Reading every page",
    detail: "Only what your documents say.",
  },
  {
    key: "assembling",
    title: "Building your scope of works",
    detail: "Every finding checked and organised.",
  },
] as const;

/** run.status → progress through the three stages. Returns 3 when
 *  the machine is done and the final check is under way. */
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
      {/* the mark: one thin ring, one slow arc, a soft centre */}
      <div className="relative mx-auto size-20" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-border-subtle" />
        <span
          className="absolute inset-0 rounded-full animate-[spin_9s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(0,166,155,0.7) 350deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
          }}
        />
        <span className="absolute inset-0 m-auto size-2 rounded-full bg-accent/80 animate-pulse" />
      </div>

      {/* the three stages */}
      <ol className="mt-8 mx-auto max-w-[380px] text-left">
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

      {current >= 3 ? (
        <p className="mt-5 text-[11.5px] text-text-dim">
          Reading done. A final check is under way.
        </p>
      ) : null}
    </div>
  );
}
