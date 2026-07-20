import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { listMine, type Project } from "@/modules/projects";
import { countTendersForProject } from "@/modules/tenders";

export const metadata = { title: "Tenders" };
export const dynamic = "force-dynamic";

/** All of the studio's tenders, newest first. */
export default async function ArchitectProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/architect/projects");
  const role = session.user.role ?? null;
  if (role !== "architect") redirect(dashboardForRole(role));

  const projects = await listMine(session.user.id);
  const counts = await Promise.all(
    projects.map((p) =>
      ["published", "tendering", "awarded"].includes(p.status)
        ? countTendersForProject(p.id)
        : Promise.resolve(0),
    ),
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mx-auto max-w-[980px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display uppercase tracking-[-0.018em] text-[clamp(1.7rem,2.5vw+1rem,2.6rem)] leading-[0.95]">
              Tenders
            </h1>
            <p className="mt-2 text-[13.5px] text-text-muted">
              Every project your studio runs, at every stage.
            </p>
          </div>
          <Link
            href="/architect/projects/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-4.5 py-2.5 text-[13px] font-ui font-semibold text-accent-contrast hover:brightness-105 transition"
          >
            <Plus className="size-4" />
            New tender
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border-subtle px-6 py-14 text-center">
            <p className="font-ui font-medium text-[14px] text-text">
              No tenders yet.
            </p>
            <p className="mt-1.5 text-[13px] text-text-muted max-w-[44ch] mx-auto">
              Upload a client&apos;s project and choose how it goes to market:
              open to the network, private to your builders, or both.
            </p>
            <Link
              href="/architect/projects/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-ui font-semibold text-accent-contrast hover:brightness-105 transition"
            >
              Start your first tender
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border-subtle divide-y divide-border-subtle bg-bg-raised">
            {projects.map((p, i) => (
              <Row key={p.id} project={p} quotes={counts[i] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
};

const MODE_LABEL: Record<Project["tenderMode"], string> = {
  open: "Open",
  private: "Private",
  hybrid: "Hybrid",
};

function Row({ project: p, quotes }: { project: Project; quotes: number }) {
  const live = p.status === "published" || p.status === "tendering";
  return (
    <Link
      href={`/architect/projects/${p.slug}`}
      className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-bg-elev transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-ui font-medium text-[13.5px] text-text">
          {p.title}
        </p>
        <p className="mt-0.5 text-[12px] text-text-dim">
          {[p.suburb, p.state].filter(Boolean).join(", ") || "Address to come"}
          {" · "}
          {MODE_LABEL[p.tenderMode]} round
          {live ? ` · ${quotes} ${quotes === 1 ? "quote" : "quotes"}` : ""}
        </p>
      </div>
      <span
        className={
          "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold " +
          (live
            ? "bg-[rgba(0,212,200,0.1)] text-accent-light"
            : p.status === "awarded"
              ? "bg-[rgba(224,178,92,0.12)] text-[#8a6a2f]"
              : "bg-[rgba(24,34,44,0.06)] text-text-muted")
        }
      >
        {STATUS_LABEL[p.status]}
      </span>
      <ArrowRight className="size-4 text-text-faint shrink-0" />
    </Link>
  );
}
