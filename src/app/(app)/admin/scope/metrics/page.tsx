import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gauge } from "lucide-react";

import { auth } from "@/modules/auth";
import { scopeModelReport } from "@/modules/scope-engine";
import { cn } from "@/lib/utils";

export const metadata = { title: "Model report" };
export const dynamic = "force-dynamic";

/**
 * /admin/scope/metrics — the model's report card.
 *
 * Every ops verdict is a label; this page reads them back. Precision
 * by confidence bucket tells us whether the 0.65 floor sits where it
 * should; removal rates by division tell us where the model
 * over-claims; each run's analysis counters show the deterministic
 * guards working (citation checks, residual defaults, register
 * dedupes). The golden set will sharpen this; nothing waits for it.
 */
export default async function ScopeMetricsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/login?next=/admin/scope/metrics");
  }
  const report = await scopeModelReport();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href="/admin/scope"
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Extraction desk
        </Link>

        <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
          <Gauge className="size-3.5" />
          The model report
        </span>
        <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[40px] leading-[0.95] text-text">
          How the reading is scoring
        </h1>
        <p className="mt-2 text-[13px] text-text-muted max-w-[70ch]">
          Every desk verdict is a label. {report.totals.verdicts} verdicts
          across {report.totals.runs} recent runs, $
          {report.totals.costUsd.toFixed(2)} of model spend. Precision proxy
          is confirmed against removed; edits count as neither.
        </p>

        {/* calibration */}
        <section className="mt-8">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
            Calibration by confidence
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border-subtle bg-[rgba(24,34,44,0.02)] text-left">
                  {["Confidence", "Confirmed", "Edited", "Removed", "Pending", "Precision proxy"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {report.calibration.map((b) => (
                  <tr key={b.bucket}>
                    <td className="px-4 py-2.5 font-ui font-medium text-text">
                      {b.bucket}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[#0a7d73]">
                      {b.confirmed}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-muted">
                      {b.edited}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[#a8433e]">
                      {b.removed}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-dim">
                      {b.pending}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 tabular-nums font-ui font-semibold",
                        b.precisionProxy === null
                          ? "text-text-dim"
                          : b.precisionProxy >= 0.95
                            ? "text-[#0a7d73]"
                            : b.precisionProxy >= 0.85
                              ? "text-[#8a6414]"
                              : "text-[#a8433e]",
                      )}
                    >
                      {b.precisionProxy === null
                        ? "no verdicts yet"
                        : `${Math.round(b.precisionProxy * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11.5px] text-text-dim max-w-[70ch]">
            The 0.65 floor is doing its job when the two lower buckets show
            meaningfully worse precision than the two upper ones. If 0.65 to
            0.8 ever reads clean while 0.5 to 0.65 reads dirty, the floor
            sits right; if both read clean, it can come down.
          </p>
        </section>

        {/* divisions */}
        <section className="mt-8">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
            Where ops overrules the model
          </h2>
          {report.divisions.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-text-dim">
              No verdicts recorded yet.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {report.divisions.slice(0, 12).map((d) => (
                <span
                  key={d.divisionId}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-ui",
                    d.removalRate >= 0.15
                      ? "border-[rgba(168,67,62,0.35)] text-[#a8433e]"
                      : d.removalRate > 0.05
                        ? "border-[rgba(201,148,34,0.35)] text-[#8a6414]"
                        : "border-border-subtle text-text-muted",
                  )}
                >
                  {d.divisionId}
                  <span className="tabular-nums">
                    {Math.round(d.removalRate * 100)}% removed ·{" "}
                    {d.confirmed + d.edited + d.removed} judged
                  </span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* runs */}
        <section className="mt-8">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
            Recent runs and their guards
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-subtle bg-[rgba(24,34,44,0.02)] text-left">
                  {["Project", "Status", "Items", "Gaps", "Cost", "Guards"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {report.runs.map((r) => (
                  <tr key={r.runId}>
                    <td className="px-4 py-2.5 max-w-[240px]">
                      <Link
                        href={`/admin/scope/${r.runId}`}
                        className="text-text hover:text-[#0a7d73] transition-colors truncate block"
                      >
                        {r.projectSlug ?? r.runId.slice(0, 8)}
                      </Link>
                      <span className="text-[10.5px] text-text-dim tabular-nums">
                        {new Date(r.createdAtISO).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.status}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text">
                      {r.items}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text">
                      {r.gaps}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-muted">
                      {r.costUsd !== null ? `$${r.costUsd.toFixed(2)}` : "·"}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-text-dim">
                      {r.analysis
                        ? [
                            r.analysis.citationHardDropped
                              ? `${r.analysis.citationHardDropped} citations dropped`
                              : null,
                            r.analysis.citationSoftFlagged
                              ? `${r.analysis.citationSoftFlagged} flagged to floor`
                              : null,
                            r.analysis.demotedToResidual
                              ? `${r.analysis.demotedToResidual} demoted`
                              : null,
                            r.analysis.residualDefaulted
                              ? `${r.analysis.residualDefaulted} residuals defaulted`
                              : null,
                            r.analysis.registerDeduped
                              ? `${r.analysis.registerDeduped} register duplicates`
                              : null,
                            r.analysis.covered === r.analysis.poolSize
                              ? "full coverage"
                              : `coverage ${r.analysis.covered}/${r.analysis.poolSize}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "before the guards"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
