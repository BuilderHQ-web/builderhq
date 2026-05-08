import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheet, ArrowUpRight, Folders } from "lucide-react";

import { auth } from "@/modules/auth";
import { listMine, type Project } from "@/modules/projects";
import { countTendersForProject } from "@/modules/tenders";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tenders" };

const TYPE_LABEL: Record<Project["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

export default async function OwnerTendersIndex() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/owner/tenders");
  const userId = session.user.id!;

  const projects = await listMine(userId);
  const visible = projects.filter(
    (p) => p.status === "published" || p.status === "tendering",
  );

  // One tender-count per visible project, in parallel.
  const counts = await Promise.all(
    visible.map((p) => countTendersForProject(p.id)),
  );

  const rows = visible.map((p, i) => ({ project: p, count: counts[i] ?? 0 }));
  const totalReceived = counts.reduce((s, n) => s + (n ?? 0), 0);

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <FileSpreadsheet className="size-3.5" />
              Tenders
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[36px] sm:text-[44px] leading-[0.95] text-text">
              Compare in minutes
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {totalReceived} tender{totalReceived === 1 ? "" : "s"} received
              across {rows.length} project{rows.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-16 text-center">
            <Folders className="mx-auto size-6 text-text-dim mb-3" />
            <h3 className="text-[15px] font-semibold text-text">
              No published projects yet
            </h3>
            <p className="mt-1 text-[12.5px] text-text-dim mx-auto max-w-[44ch]">
              Tenders show up here once you publish a project and matched
              builders submit on it.
            </p>
            <Link
              href="/owner/projects/new"
              className={cn(
                "mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-full",
                "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
              )}
            >
              Upload a project
            </Link>
          </div>
        ) : (
          <div className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden">
            {rows.map(({ project: p, count }, i, arr) => (
              <Link
                key={p.id}
                href={
                  count > 0
                    ? `/owner/projects/${p.slug}/tenders`
                    : `/owner/projects/${p.slug}`
                }
                className={cn(
                  "grid grid-cols-1 sm:grid-cols-[1.6fr_1fr_120px_auto] gap-2 sm:gap-4 items-center px-5 py-4 transition-colors hover:bg-[rgba(0,212,200,0.025)]",
                  i === arr.length - 1 ? "" : "border-b border-border-subtle/60",
                )}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-text truncate">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-text-dim truncate">
                    {TYPE_LABEL[p.type]}
                    {p.suburb ? ` · ${p.suburb}, ${p.state}` : ""}
                  </div>
                </div>
                <div className="hidden sm:block text-[12px] text-text-muted">
                  Status: {p.status}
                </div>
                <div className="text-[13px] text-text font-display tabular-nums">
                  {count} tender{count === 1 ? "" : "s"}
                </div>
                <ArrowUpRight className="size-3.5 text-text-faint justify-self-end" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
