"use client";

/**
 * The waiting page's quiet heart: three stages of the read as a
 * vertical timeline, with the motion living in the current stage — a
 * slow arc turning on its node (pure CSS, no timers). The page
 * re-checks in the background, so the stage advances on its own; once
 * the machine is done a small line says a final check is under way,
 * and the moment the pack is ready the whole page becomes it.
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
      <ol className="max-w-[440px]">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className="relative flex gap-4 pb-9 last:pb-0">
              {i < STAGES.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-[29px] bottom-[6px] w-px",
                    done ? "bg-accent/50" : "bg-border-subtle",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 mt-px flex size-[23px] shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-transparent bg-accent text-accent-contrast"
                    : active
                      ? "border-border-subtle bg-[rgba(0,212,200,0.08)]"
                      : "border-border-subtle bg-surface-1",
                )}
              >
                {active ? (
                  // the mark: one slow arc, turning on the live node
                  <span
                    aria-hidden
                    className="absolute -inset-px rounded-full animate-[spin_2.8s_linear_infinite]"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, transparent 250deg, rgba(0,166,155,0.7) 335deg, transparent 360deg)",
                      WebkitMask:
                        "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                    }}
                  />
                ) : null}
                {done ? (
                  <Check className="size-3" strokeWidth={3.25} />
                ) : active ? (
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                ) : null}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-[13.5px] font-ui font-semibold leading-tight",
                    done || active ? "text-text" : "text-text-dim",
                  )}
                >
                  {s.title}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[12px] leading-[1.6]",
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
        <p className="mt-6 text-[12px] text-text-dim">
          Reading done. A final check is under way.
        </p>
      ) : null}
    </div>
  );
}
