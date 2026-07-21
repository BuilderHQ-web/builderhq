import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Compass } from "lucide-react";

import { auth } from "@/modules/auth";
import { listTendersForBuilder } from "@/modules/tenders";
import { listByIds } from "@/modules/projects";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "My tenders" };

const STATUS_META: Record<
  | "draft"
  | "submitted"
  | "shortlisted"
  | "awarded"
  | "rejected"
  | "withdrawn",
  { label: string; cls: string }
> = {
  draft: {
    label: "Draft",
    cls: "border-border-subtle bg-[rgba(24,34,44,0.025)] text-text-dim",
  },
  submitted: {
    label: "Submitted",
    cls: "border-border-accent bg-accent-muted/40 text-accent-light",
  },
  shortlisted: {
    label: "Shortlisted",
    cls: "border-border-accent bg-accent-muted/60 text-accent-light",
  },
  awarded: {
    label: "Awarded",
    cls: "border-[rgba(10,125,115,0.55)] bg-[rgba(10,125,115,0.10)] text-accent-light",
  },
  rejected: {
    label: "Rejected",
    cls: "border-[rgba(255,120,120,0.40)] bg-[rgba(255,120,120,0.06)] text-[rgba(255,160,160,0.95)]",
  },
  withdrawn: {
    label: "Withdrawn",
    cls: "border-border-subtle bg-[rgba(24,34,44,0.025)] text-text-dim",
  },
};

export default async function MyTendersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/tenders");
  const userId = session.user.id!;

  const tenders = await listTendersForBuilder(userId);
  const projects = await listByIds(tenders.map((t) => t.projectId));
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const buckets = {
    draft: tenders.filter((t) => t.status === "draft"),
    active: tenders.filter(
      (t) =>
        t.status === "submitted" ||
        t.status === "shortlisted" ||
        t.status === "awarded",
    ),
    closed: tenders.filter(
      (t) => t.status === "rejected" || t.status === "withdrawn",
    ),
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-7">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
              <FileText className="size-3.5" />
              My tenders
            </span>
            <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[44px] leading-[0.95] text-text">
              The tender book
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              Every tender you have started, {tenders.length} in all.
            </p>
          </div>
          <Link
            href="/builder/browse"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-border-strong text-text text-[12px] tracking-[0.04em] hover:bg-surface-1 transition-colors self-start"
          >
            <Compass className="size-3.5" />
            Browse projects
          </Link>
        </div>

        {tenders.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No tenders yet"
            description="Take a spot on a project and submit your first tender. It saves as you work, locks on submission, and is compared like for like with the others."
            primary={{ label: "Browse projects", href: "/builder/browse" }}
          />
        ) : (
          <div className="space-y-8">
            {buckets.draft.length > 0 ? (
              <Bucket title="Drafts" subtitle="In progress">
                {buckets.draft.map((t) => (
                  <Row
                    key={t.id}
                    tender={t}
                    project={projectsById.get(t.projectId)}
                  />
                ))}
              </Bucket>
            ) : null}
            {buckets.active.length > 0 ? (
              <Bucket title="Active" subtitle="Submitted, shortlisted, awarded">
                {buckets.active.map((t) => (
                  <Row
                    key={t.id}
                    tender={t}
                    project={projectsById.get(t.projectId)}
                  />
                ))}
              </Bucket>
            ) : null}
            {buckets.closed.length > 0 ? (
              <Bucket title="Closed" subtitle="Rejected or withdrawn">
                {buckets.closed.map((t) => (
                  <Row
                    key={t.id}
                    tender={t}
                    project={projectsById.get(t.projectId)}
                  />
                ))}
              </Bucket>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Bucket({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline gap-3 flex-wrap">
        <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
          {title}
        </h2>
        <span className="text-[11.5px] text-text-dim">{subtitle}</span>
      </header>
      <div className="rounded-md border border-border-subtle overflow-hidden bg-surface-1 card-elev">
        {children}
      </div>
    </section>
  );
}

function Row({
  tender,
  project,
}: {
  tender: {
    id: string;
    projectId: string;
    status:
      | "draft"
      | "submitted"
      | "shortlisted"
      | "awarded"
      | "rejected"
      | "withdrawn";
    totalPriceAud: number | null;
    durationWeeks: number | null;
    updatedAt: Date;
    submittedAt: Date | null;
  };
  project: { slug: string; title: string; suburb: string | null; state: string | null } | undefined;
}) {
  const meta = STATUS_META[tender.status];
  const slug = project?.slug;
  return (
    <Link
      href={slug ? `/builder/projects/${slug}/tender` : "/builder/tenders"}
      className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_1fr_auto] gap-x-3 gap-y-1 sm:gap-4 px-4 sm:px-5 py-4 items-center transition-colors hover:bg-[rgba(0,212,200,0.025)] border-b border-border-subtle/60 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-text truncate">
          {project?.title ?? "Project"}
        </div>
        <div className="text-[11px] text-text-dim truncate">
          {project?.suburb
            ? `${project.suburb}, ${project.state}`
            : "Location pending"}
        </div>
      </div>
      <span
        className={cn(
          "justify-self-end sm:hidden inline-flex items-center px-2 py-1 border rounded-sm text-[9.5px] tracking-[0.16em] uppercase shrink-0",
          meta.cls,
        )}
      >
        {meta.label}
      </span>
      <div className="text-[13px] text-text font-mono tabular-nums">
        {tender.totalPriceAud != null
          ? new Intl.NumberFormat("en-AU", {
              style: "currency",
              currency: "AUD",
              maximumFractionDigits: 0,
            }).format(tender.totalPriceAud)
          : "—"}
      </div>
      <div className="text-[12px] text-text-muted tabular-nums">
        {tender.durationWeeks ? `${tender.durationWeeks} weeks` : "—"}
      </div>
      <span
        className={cn(
          "hidden sm:inline-flex justify-self-end items-center px-2 py-1 border rounded-sm text-[9.5px] tracking-[0.16em] uppercase",
          meta.cls,
        )}
      >
        {meta.label}
      </span>
    </Link>
  );
}
