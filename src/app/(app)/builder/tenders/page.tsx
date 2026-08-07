import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Compass } from "lucide-react";

import { auth } from "@/modules/auth";
import { listTendersForBuilder } from "@/modules/tenders";
import { listByIds, type MarketplacePreview } from "@/modules/projects";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/app/empty-state";
import { CoverArt } from "@/components/builder/project-cover";

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
    cls: "border-[rgba(194,85,80,0.4)] bg-[rgba(194,85,80,0.06)] text-[#a8433e]",
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
      <header className="mb-3 flex items-center gap-3.5">
        <h2 className="font-display uppercase tracking-[-0.012em] text-[17px] leading-none text-text shrink-0">
          {title}
        </h2>
        <span className="text-[11.5px] text-text-dim shrink-0">{subtitle}</span>
        <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
      </header>
      <div className="flex flex-col gap-2">{children}</div>
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
  project: MarketplacePreview | undefined;
}) {
  const meta = STATUS_META[tender.status];
  const slug = project?.slug;
  const dateLabel = tender.submittedAt ? "Lodged" : "Updated";
  const dateValue = (tender.submittedAt ?? tender.updatedAt).toLocaleDateString(
    "en-AU",
    { day: "numeric", month: "short", timeZone: "Australia/Melbourne" },
  );
  return (
    <Link
      href={slug ? `/builder/projects/${slug}/tender` : "/builder/tenders"}
      className={cn(
        "group relative flex items-stretch rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden",
        "transition-[border-color,box-shadow,transform] duration-200",
        "hover:border-border-strong hover:card-elev-lg hover:-translate-y-px",
      )}
    >
      {/* the project's drawn cover, at ledger scale */}
      {project ? (
        <div className="relative hidden sm:block w-[124px] shrink-0 border-r border-border-subtle/60 overflow-hidden">
          <CoverArt
            facts={project}
            sizes="124px"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(90px,auto))_auto] gap-x-5 gap-y-3 px-4 sm:px-5 py-4 items-center">
        <div className="min-w-0">
          <div className="text-[14px] font-ui font-semibold text-text truncate">
            {project?.title ?? "Project"}
          </div>
          <div className="mt-0.5 text-[11.5px] text-text-dim truncate">
            {project?.suburb
              ? `${project.suburb}, ${project.state}`
              : "Location pending"}
          </div>
        </div>
        <span
          className={cn(
            "justify-self-end lg:order-last inline-flex items-center px-2 py-1 border rounded-sm text-[9.5px] tracking-[0.16em] uppercase shrink-0",
            meta.cls,
          )}
        >
          {meta.label}
        </span>
        <RowKv label="Price">
          {tender.totalPriceAud != null
            ? new Intl.NumberFormat("en-AU", {
                style: "currency",
                currency: "AUD",
                maximumFractionDigits: 0,
              }).format(tender.totalPriceAud)
            : "—"}
        </RowKv>
        <RowKv label="Duration">
          {tender.durationWeeks ? `${tender.durationWeeks} weeks` : "—"}
        </RowKv>
        <RowKv label={dateLabel}>{dateValue}</RowKv>
      </div>
    </Link>
  );
}

/** Labelled figure on a tender row — the subheading over the value. */
function RowKv({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] tracking-[0.16em] uppercase text-text-dim">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-ui font-medium text-text tabular-nums truncate">
        {children}
      </div>
    </div>
  );
}
