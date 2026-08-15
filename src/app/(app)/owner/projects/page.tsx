import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen, Lock } from "lucide-react";

import { auth } from "@/modules/auth";
import { listMine, type Project } from "@/modules/projects";
import {
  scopePhaseForProjects,
  type ProjectScopePhase,
} from "@/modules/scope-engine";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Reveal } from "@/components/app/reveal";

export const metadata = { title: "My projects" };

const TYPE_LABEL: Record<Project["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/owner/projects");

  const projects = await listMine(session.user.id!);
  const phases = await scopePhaseForProjects(
    projects.filter((p) => p.status === "draft").map((p) => p.id),
  );

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="My projects"
        description="Drafts and published work in your account."
        actions={
          <Link
            href="/owner/projects/new"
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <Plus className="size-4" />
            New project
          </Link>
        }
      />

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="size-4" />}
            title="No projects yet"
            description="Upload your first residential project — drawings, scope, timeline. Suitable Australian builders unlock and tender."
            action={
              <Link
                href="/owner/projects/new"
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                <Plus className="size-4" />
                Upload your first project
              </Link>
            }
          />
        ) : (
          <Reveal immediate delay={0.04}>
            <div className="rounded-md border border-border-subtle overflow-hidden bg-surface-2">
              <div className="hidden md:grid grid-cols-[1.6fr_1fr_120px_140px_120px] gap-4 px-5 py-3 bg-[rgba(24,34,44,0.03)] border-b border-border-subtle text-[9.5px] tracking-[0.16em] uppercase text-text-dim">
                <span>Project</span>
                <span>Location</span>
                <span>Type</span>
                <span>Status</span>
                <span className="text-right">Updated</span>
              </div>
              {projects.map((p, i, arr) => (
                <Link
                  key={p.id}
                  href={
                    p.status === "draft"
                      ? phases.has(p.id)
                        ? `/owner/projects/${p.slug}/scope`
                        : `/owner/projects/${p.slug}/edit`
                      : `/owner/projects/${p.slug}`
                  }
                  className={cn(
                    "group grid grid-cols-[1fr_auto] md:grid-cols-[1.6fr_1fr_120px_140px_120px] gap-2 md:gap-4 px-4 sm:px-5 py-4 items-center",
                    "transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.2,0.65,0.3,0.9)]",
                    "hover:bg-[rgba(0,212,200,0.045)]",
                    "active:scale-[0.997] active:duration-[100ms]",
                    i === arr.length - 1 ? "" : "border-b border-border-subtle/60",
                  )}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="size-1 shrink-0 rounded-full bg-transparent group-hover:bg-accent group-hover:shadow-[0_0_8px_rgba(0,212,200,0.6)] transition-all duration-[140ms]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[14px] font-semibold text-text truncate">
                          {p.title}
                        </span>
                        {p.isSample ? (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-sm border border-border-subtle text-[8.5px] tracking-[0.14em] uppercase text-text-dim font-semibold">
                            Example
                          </span>
                        ) : null}
                        {/* Who can tender, visible from the shelf. A
                            private round is a different kind of thing,
                            not a detail to discover two pages deep. */}
                        {p.tenderMode === "private" ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-[rgba(42,92,174,0.35)] bg-[rgba(42,92,174,0.06)] text-[8.5px] tracking-[0.14em] uppercase text-[#2a5cae] font-semibold">
                            <Lock className="size-2.5" />
                            Private
                          </span>
                        ) : (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-sm border border-border-subtle text-[8.5px] tracking-[0.14em] uppercase text-text-dim font-semibold">
                            Open
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-dim truncate md:hidden">
                        {p.suburb ? `${p.suburb}, ${p.state}` : "Address pending"}
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block text-[12.5px] text-text-muted truncate">
                    {p.suburb ? `${p.suburb}, ${p.state}` : "—"}
                  </div>
                  <div className="hidden md:block text-[12px] text-text-muted">
                    {TYPE_LABEL[p.type]}
                  </div>
                  <StatusBadge status={p.status} phase={phases.get(p.id) ?? null} />
                  <div className="hidden md:block text-[11px] text-text-dim text-right tabular-nums">
                    {formatRelative(p.updatedAt)}
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </>
  );
}

function StatusBadge({
  status,
  phase,
}: {
  status: Project["status"];
  phase: ProjectScopePhase | null;
}) {
  const label =
    status === "draft" && phase === "analysing"
      ? "Analysing"
      : status === "draft" && phase === "pack_ready"
        ? "Pack ready"
        : status;
  const cls =
    phase === "analysing"
      ? "border-[rgba(26,95,212,0.35)] text-[#2a5cae] bg-[rgba(26,95,212,0.06)]"
      : phase === "pack_ready"
        ? "border-[rgba(201,148,34,0.4)] text-[#8a6414] bg-[rgba(201,148,34,0.07)]"
        : status === "draft"
          ? "border-border-subtle text-text-dim bg-[rgba(24,34,44,0.025)]"
          : status === "published" || status === "tendering"
            ? "border-border-accent text-accent-light bg-accent-muted/40"
            : "border-border-subtle text-text-dim bg-[rgba(24,34,44,0.025)]";
  return (
    <span
      className={cn(
        "justify-self-start inline-flex items-center gap-1.5 px-2 py-1 border rounded-sm text-[9.5px] tracking-[0.16em] uppercase",
        cls,
      )}
    >
      {phase === "analysing" ? (
        <span aria-hidden className="size-1 rounded-full bg-[#2a5cae] animate-pulse" />
      ) : null}
      {label}
    </span>
  );
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
