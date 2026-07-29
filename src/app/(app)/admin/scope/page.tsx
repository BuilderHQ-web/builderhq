/**
 * /admin/scope — the extraction desk.
 *
 * Every scope run across the platform, newest first, with a starter
 * for projects that have documents but no live run. The review
 * surface lives one click in.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitCompareArrows, ScanSearch } from "lucide-react";

import { auth } from "@/modules/auth";
import { listRuns } from "@/modules/scope-engine";
import { SCOPE_STANDARD_VERSION } from "@/modules/scope";
import { cn } from "@/lib/utils";
import { StartRunPicker } from "./start-run";

export const metadata = { title: "Scope engine" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  review: "bg-[rgba(0,212,200,0.1)] text-accent-light",
  approved: "bg-[rgba(217,164,65,0.09)] text-[#8a6414]",
  failed: "bg-[rgba(194,85,80,0.1)] text-[#b2483f]",
};

export default async function ScopeRunsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/login?next=/admin/scope");

  const runs = await listRuns(50);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 sm:mb-7 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
              <ScanSearch className="size-3.5" />
              Scope engine
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[44px] leading-[0.95] text-text">
              Extraction runs
            </h1>
            <p className="mt-2 text-[13px] text-text-muted max-w-[62ch]">
              Documents in, scope out, ops in between. Every run reads a
              project&apos;s documents against the Scope Standard v
              {SCOPE_STANDARD_VERSION}; nothing reaches an owner until a
              human has reviewed every line.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/scope/addenda"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border-subtle text-[12px] font-ui text-text-muted hover:border-border-strong hover:text-text transition-colors"
            >
              <GitCompareArrows className="size-3.5" />
              Addenda
            </Link>
            <StartRunPicker />
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-subtle px-6 py-12 text-center">
            <p className="text-[13.5px] text-text-muted">
              No runs yet. Start one on any project with PDF documents.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/scope/${r.id}`}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-lg border border-border-subtle bg-surface-1 card-elev hover:border-border-strong transition-colors group"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui font-medium text-[13.5px] text-text">
                      {r.projectTitle}
                    </span>
                    <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
                      {r.documentCount} document{r.documentCount === 1 ? "" : "s"}
                      {r.itemCount > 0 ? ` · ${r.itemCount} items` : ""}
                      {r.status === "approved" && !r.effectiveAt
                        ? " · awaiting the runner"
                        : ""}
                      {" · standard v"}
                      {r.scopeVersion}
                      {" · "}
                      {r.createdAt.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </span>
                  {r.effectiveAt ? (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold bg-[rgba(0,212,200,0.14)] text-accent-deep"
                      title="This is the pack builders are pricing right now"
                    >
                      Live
                      {r.addendumNumber
                        ? ` · A${String(r.addendumNumber).padStart(2, "0")}`
                        : ""}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold",
                      STATUS_TONE[r.status] ??
                        "bg-[rgba(24,34,44,0.06)] text-text-muted",
                    )}
                  >
                    {r.status}
                  </span>
                  <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
