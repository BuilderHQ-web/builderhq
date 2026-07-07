import { Sparkles, Lock } from "lucide-react";

import type { FbaStatus } from "@/modules/credits";
import { cn } from "@/lib/utils";

/**
 * Compact FBA-quota indicator shown next to the section tabs on
 * /builder/browse, /builder/saved, /builder/unlocked. Three states:
 *
 *   active + credits left  → "X of Y free this cycle" (teal, glowing)
 *   active + exhausted     → "Refreshes in N days" (warm)
 *   no active grant        → "Pay-per-unlock" (subdued)
 */
export function FbaQuotaPill({ status }: { status: FbaStatus }) {
  if (!status.active) {
    return (
      <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border-subtle bg-[rgba(24,34,44,0.025)] text-[11px] tracking-[0.04em] text-text-dim">
        <Lock className="size-3" />
        Pay-per-unlock
      </span>
    );
  }

  const exhausted = status.remainingThisCycle <= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full border text-[11px] tracking-[0.04em] transition-colors",
        exhausted
          ? "border-warning/30 bg-warning/[0.06] text-warning"
          : "border-border-accent bg-[linear-gradient(135deg,rgba(0,212,200,0.10),rgba(26,95,212,0.10))] text-accent-light",
      )}
      style={
        exhausted
          ? undefined
          : { boxShadow: "0 0 12px rgba(0,212,200,0.20)" }
      }
    >
      <Sparkles className="size-3" />
      {exhausted ? (
        <>
          <span className="font-semibold">All used</span>
          <span className="text-text-dim">·</span>
          <span>refreshes in {status.daysToRefresh}d</span>
        </>
      ) : (
        <>
          <span className="font-semibold tabular-nums">
            {status.remainingThisCycle} of {status.monthlyQuota}
          </span>
          <span className="text-text-muted">free this cycle</span>
        </>
      )}
    </span>
  );
}
