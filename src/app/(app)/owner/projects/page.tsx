import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";

import { auth } from "@/modules/auth";
import { listMine, type Project } from "@/modules/projects";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/app/page-header";

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

      <div className="px-6 lg:px-10 py-8 lg:py-10">
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
          <div className="rounded-md border border-border-subtle overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.6fr_1fr_120px_140px_120px] gap-4 px-5 py-3 bg-[rgba(255,255,255,0.018)] border-b border-border-subtle text-[9.5px] tracking-[0.16em] uppercase text-text-dim">
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
                    ? `/owner/projects/${p.slug}/edit`
                    : `/owner/projects/${p.slug}`
                }
                className={cn(
                  "grid grid-cols-1 md:grid-cols-[1.6fr_1fr_120px_140px_120px] gap-2 md:gap-4 px-5 py-4 items-center transition-colors hover:bg-[rgba(0,212,200,0.025)]",
                  i === arr.length - 1 ? "" : "border-b border-border-subtle",
                )}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-text truncate">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-text-dim truncate md:hidden">
                    {p.suburb ? `${p.suburb}, ${p.state}` : "Address pending"}
                  </div>
                </div>
                <div className="hidden md:block text-[12.5px] text-text-muted truncate">
                  {p.suburb ? `${p.suburb}, ${p.state}` : "—"}
                </div>
                <div className="hidden md:block text-[12px] text-text-muted">
                  {TYPE_LABEL[p.type]}
                </div>
                <StatusBadge status={p.status} />
                <div className="hidden md:block text-[11px] text-text-dim text-right tabular-nums">
                  {formatRelative(p.updatedAt)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const cls =
    status === "draft"
      ? "border-border-subtle text-text-dim bg-[rgba(255,255,255,0.012)]"
      : status === "published" || status === "tendering"
      ? "border-border-accent text-accent-light bg-accent-muted/40"
      : "border-border-subtle text-text-dim bg-[rgba(255,255,255,0.012)]";
  return (
    <span
      className={cn(
        "justify-self-start inline-flex items-center px-2 py-1 border rounded-sm text-[9.5px] tracking-[0.16em] uppercase",
        cls,
      )}
    >
      {status}
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
