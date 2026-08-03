/**
 * /admin/scope/addenda — the scope-change register.
 *
 * Ops never issues an addendum; only a project runner can. This is a
 * WATCH surface, and it exists because a re-issued pack is the single
 * highest-consequence event on a live round: every builder's priced
 * scope moved underneath them. Ops needs to see what changed, on whose
 * round, and how many builders were told, without opening each
 * project.
 *
 * The diff shown is the one stored at issue time, so this record reads
 * the same forever, even after later runs supersede the rows it was
 * computed from.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GitCompareArrows, Megaphone } from "lucide-react";

import { auth } from "@/modules/auth";
import { listAddendaForOps } from "@/modules/scope-engine";
import { summariseDiff } from "@/modules/tenders/schedule";
import { cn } from "@/lib/utils";

export const metadata = { title: "Scope addenda" };
export const dynamic = "force-dynamic";

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ScopeAddendaPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/login?next=/admin/scope/addenda");
  }

  const addenda = await listAddendaForOps(50);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href="/admin/scope"
          className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Extraction runs
        </Link>

        <div className="mb-6 sm:mb-7">
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
            <GitCompareArrows className="size-3.5" />
            Scope engine
          </span>
          <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[44px] leading-[0.95] text-text">
            Addenda issued
          </h1>
          <p className="mt-2 text-[13px] text-text-muted max-w-[64ch]">
            Every formal re-issue of a live round&apos;s tender pack. A runner
            issues these, never ops; this is the record of what moved and who
            was told. The diff is the one stored at issue time.
          </p>
        </div>

        {addenda.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-subtle px-6 py-12 text-center">
            <p className="text-[13.5px] text-text-muted">
              No addenda yet. One appears here the first time a runner
              re-issues a pack on a round that is already live.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {addenda.map((a) => {
              const moved =
                a.diff.added.length +
                a.diff.removed.length +
                a.diff.changed.length;
              return (
                <li
                  key={a.id}
                  className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden"
                >
                  <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle/60">
                    <div className="min-w-0">
                      <p className="font-ui font-semibold text-[13.5px] text-text truncate">
                        Addendum {String(a.number).padStart(2, "0")} ·{" "}
                        {a.projectTitle}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-text-dim">
                        {summariseDiff(a.diff)} · issued{" "}
                        {fmtDateTime(a.issuedAt)}
                        {a.issuedByName ? ` by ${a.issuedByName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(24,34,44,0.05)] px-2.5 py-1 text-[10.5px] font-ui text-text-muted">
                        <Megaphone className="size-3" />
                        {a.notifiedCount} builder
                        {a.notifiedCount === 1 ? "" : "s"} told
                      </span>
                      <Link
                        href={`/admin/scope/${a.runId}`}
                        className="rounded-full border border-border-subtle px-3 py-1 text-[11px] font-ui text-text-muted hover:border-border-strong hover:text-text transition-colors"
                      >
                        The pack
                      </Link>
                    </div>
                  </div>

                  {moved === 0 ? (
                    <p className="px-4 sm:px-5 py-3 text-[12px] text-text-dim">
                      Nothing priceable moved. The re-read changed only
                      evidence, not the schedule builders answer.
                    </p>
                  ) : (
                    <div className="px-4 sm:px-5 py-3 grid gap-4 sm:grid-cols-3">
                      <DiffColumn
                        title="Added"
                        tone="add"
                        lines={a.diff.added.map(
                          (l) => `${l.label} · ${l.divisionLabel}`,
                        )}
                      />
                      <DiffColumn
                        title="Revised"
                        tone="change"
                        lines={a.diff.changed.map(
                          (l) => `${l.label} · ${l.divisionLabel}`,
                        )}
                      />
                      <DiffColumn
                        title="Removed"
                        tone="remove"
                        lines={a.diff.removed.map(
                          (l) => `${l.label} · ${l.divisionLabel}`,
                        )}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  add: "text-[#0a7d73]",
  change: "text-[#8a6414]",
  remove: "text-[#a8433e]",
};

function DiffColumn({
  title,
  tone,
  lines,
}: {
  title: string;
  tone: "add" | "change" | "remove";
  lines: string[];
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "text-[10px] tracking-[0.16em] uppercase font-ui font-semibold",
          TONE[tone],
        )}
      >
        {title} · {lines.length}
      </p>
      {lines.length === 0 ? (
        <p className="mt-1.5 text-[11.5px] text-text-dim">None</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {lines.slice(0, 12).map((l) => (
            <li
              key={l}
              className="text-[11.5px] leading-[1.5] text-text-muted truncate"
              title={l}
            >
              {l}
            </li>
          ))}
          {lines.length > 12 ? (
            <li className="text-[11.5px] text-text-dim">
              and {lines.length - 12} more
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
