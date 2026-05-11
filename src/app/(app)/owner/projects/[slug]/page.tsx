import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Pencil,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  ArrowUpRight,
  Home,
  Building,
  Wrench,
  Layers,
  MessageSquare,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { getBySlugForOwner, type Project } from "@/modules/projects";
import { listForProject } from "@/modules/documents";
import { countTendersForProject } from "@/modules/tenders";
import { listForUserOnProject } from "@/modules/messaging";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/app/reveal";
import {
  ProjectMessagingPanel,
  totalUnread,
} from "@/components/app/messaging/project-thread";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: slug };
}

const TYPE_META: Record<Project["type"], { label: string; icon: React.ReactNode }> = {
  single_dwelling: { label: "Single dwelling", icon: <Home className="size-4" /> },
  multi_dwelling: { label: "Multi-dwelling", icon: <Building className="size-4" /> },
  renovation: { label: "Renovation", icon: <Wrench className="size-4" /> },
  extension: { label: "Extension", icon: <Layers className="size-4" /> },
};

const BUDGET_LABEL: Record<NonNullable<Project["budgetBand"]>, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k – $1M",
  "1m_1_5m": "$1M – $1.5M",
  "1_5m_2m": "$1.5M – $2M",
  "2m_3m": "$2M – $3M",
  "3m_5m": "$3M – $5M",
  over_5m: "Over $5M",
};

const RENO_LABEL: Record<NonNullable<Project["renovationScope"]>, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  kitchen_and_bathroom: "Kitchen + bathroom",
  full_internal: "Full internal",
  full_internal_and_external: "Internal + external",
  structural: "Structural",
};

const EXT_LABEL: Record<NonNullable<Project["extensionType"]>, string> = {
  ground_floor: "Ground floor",
  first_floor: "First floor",
  ground_and_first: "Ground + first",
  rear: "Rear",
  side: "Side",
};

const LAND_LABEL: Record<NonNullable<Project["landSizeBand"]>, string> = {
  under_200: "Under 200 m²",
  "200_400": "200 – 400 m²",
  "400_600": "400 – 600 m²",
  "600_800": "600 – 800 m²",
  "800_1000": "800 – 1000 m²",
  over_1000: "1000 m²+",
};
const BUILD_LBL: Record<NonNullable<Project["buildSizeBand"]>, string> = {
  under_100: "Under 100 m²",
  "100_150": "100 – 150 m²",
  "150_200": "150 – 200 m²",
  "200_250": "200 – 250 m²",
  "250_300": "250 – 300 m²",
  "300_400": "300 – 400 m²",
  over_400: "400 m²+",
};
const EXT_SIZE_LBL: Record<NonNullable<Project["extensionSizeBand"]>, string> = {
  under_20: "Under 20 m²",
  "20_40": "20 – 40 m²",
  "40_60": "40 – 60 m²",
  "60_80": "60 – 80 m²",
  "80_100": "80 – 100 m²",
  over_100: "100 m²+",
};
const AGE_LBL: Record<NonNullable<Project["existingAgeBand"]>, string> = {
  under_10: "Under 10 yrs",
  "10_25": "10 – 25 yrs",
  "25_50": "25 – 50 yrs",
  "50_75": "50 – 75 yrs",
  over_75: "Over 75 yrs",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}`);

  const r = await getBySlugForOwner(session.user.id!, slug);
  if (!r.ok) {
    if (r.error.code === "not_found" || r.error.code === "forbidden") notFound();
    throw new Error(r.error.message);
  }
  const project = r.value;

  // Drafts always go to the wizard.
  if (project.status === "draft") {
    redirect(`/owner/projects/${slug}/edit`);
  }

  const docs = await listForProject(session.user.id!, project.id);
  const tenderCount = await countTendersForProject(project.id);
  // One conversation per builder who's unlocked the project. The
  // inline panel below the grid lets the owner chat with each builder
  // without bouncing to /messages.
  const conversations = await listForUserOnProject(
    session.user.id!,
    project.id,
  );
  const messagingUnread = totalUnread(conversations);

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10">
      <div className="mx-auto max-w-[920px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              {TYPE_META[project.type].icon}
              {TYPE_META[project.type].label}
              <span className="text-text-dim/60">·</span>
              <span className="px-1.5 py-0.5 border border-border-accent rounded-sm text-[8.5px] tracking-[0.16em] uppercase text-accent">
                {project.status}
              </span>
            </span>
            <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[44px] sm:text-[52px] leading-[0.92] text-text">
              {project.title}
            </h1>
            {project.suburb ? (
              <p className="mt-3 text-[14px] text-text-muted">
                {project.suburb}, {project.state} {project.postcode}
              </p>
            ) : null}
          </div>
          <Link
            href={`/owner/projects/${project.slug}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "gap-2")}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left — details (staggered entrance) */}
          <div className="space-y-5">
            <Reveal immediate delay={0.04}>
            <Card title="The build" icon={TYPE_META[project.type].icon}>
              <KvGrid>
                {project.type === "multi_dwelling" ? (
                  <Kv label="Dwellings" value={project.dwellingCount} />
                ) : null}
                <Kv label="Bedrooms" value={project.bedrooms} />
                <Kv label="Bathrooms" value={project.bathrooms} />
                {project.type !== "multi_dwelling" ? (
                  <Kv label="Floors" value={project.floors} />
                ) : null}
                <Kv
                  label="Land size"
                  value={project.landSizeBand ? LAND_LABEL[project.landSizeBand] : null}
                />
                <Kv
                  label="Build size"
                  value={project.buildSizeBand ? BUILD_LBL[project.buildSizeBand] : null}
                />
                {project.type === "renovation" ? (
                  <>
                    <Kv
                      label="Scope"
                      value={
                        project.renovationScope ? RENO_LABEL[project.renovationScope] : null
                      }
                    />
                    <Kv
                      label="Existing age"
                      value={
                        project.existingAgeBand ? AGE_LBL[project.existingAgeBand] : null
                      }
                    />
                  </>
                ) : null}
                {project.type === "extension" ? (
                  <>
                    <Kv
                      label="Type"
                      value={
                        project.extensionType ? EXT_LABEL[project.extensionType] : null
                      }
                    />
                    <Kv
                      label="Size"
                      value={
                        project.extensionSizeBand ? EXT_SIZE_LBL[project.extensionSizeBand] : null
                      }
                    />
                  </>
                ) : null}
              </KvGrid>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.10}>
              <Card title="Budget & timeline" icon={<DollarSign className="size-4" />}>
                <KvGrid>
                  <Kv
                    label="Budget"
                    value={project.budgetBand ? BUDGET_LABEL[project.budgetBand] : null}
                  />
                  <Kv label="Target start" value={project.targetStartMonth} />
                  <Kv label="Target completion" value={project.targetCompletionMonth} />
                </KvGrid>
              </Card>
            </Reveal>

            {project.description ? (
              <Reveal immediate delay={0.16}>
                <Card title="Brief" icon={<FileText className="size-4" />}>
                  <p className="text-[13.5px] leading-[1.7] text-text-muted whitespace-pre-line">
                    {project.description}
                  </p>
                </Card>
              </Reveal>
            ) : null}
          </div>

          {/* Right — meta + docs (staggered alongside the left column) */}
          <div className="space-y-5">
            <Reveal immediate delay={0.06}>
              <Card title="Address" icon={<MapPin className="size-4" />}>
              <p className="text-[13.5px] leading-[1.6] text-text-muted">
                {project.addressLine1 ?? "—"}
                <br />
                {project.suburb} {project.state} {project.postcode}
              </p>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.12}>
            <Card title={`Documents · ${docs.length}`} icon={<FileText className="size-4" />}>
              {docs.length === 0 ? (
                <p className="text-[12.5px] text-text-dim">No documents.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {docs.slice(0, 8).map((d) => (
                    <li key={d.id} className="text-[12.5px] text-text-muted truncate">
                      <span className="text-text-dim mr-1">📄</span>
                      {d.filename}
                    </li>
                  ))}
                  {docs.length > 8 ? (
                    <li className="text-[11px] text-text-dim">
                      …and {docs.length - 8} more
                    </li>
                  ) : null}
                </ul>
              )}
              <Link
                href={`/owner/projects/${project.slug}/edit`}
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-light hover:text-accent transition-colors"
              >
                Manage documents
                <ArrowUpRight className="size-3" />
              </Link>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.18}>
            <Card title={`Tenders · ${tenderCount}`} icon={<FileText className="size-4" />}>
              {tenderCount === 0 ? (
                <p className="text-[12.5px] text-text-dim">
                  No tenders yet. Builders who unlock this project can submit
                  tenders, which appear side-by-side here for comparison.
                </p>
              ) : (
                <p className="text-[12.5px] text-text-muted">
                  {tenderCount} tender{tenderCount === 1 ? "" : "s"} received.
                  Compare side-by-side and decide.
                </p>
              )}
              <Link
                href={`/owner/projects/${project.slug}/tenders`}
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-light hover:text-accent transition-colors"
              >
                {tenderCount > 0 ? "Compare tenders" : "View tender stream"}
                <ArrowUpRight className="size-3" />
              </Link>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.24}>
            <Card title="Lifecycle" icon={<Calendar className="size-4" />}>
              <KvGrid>
                <Kv
                  label="Published"
                  value={
                    project.publishedAt
                      ? project.publishedAt.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"
                  }
                />
                <Kv
                  label="Created"
                  value={project.createdAt.toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              </KvGrid>
            </Card>
            </Reveal>
          </div>
        </div>

        {/* Inline messaging — one conversation per builder who's
              unlocked this project. The panel surfaces an empty state
              until the first unlock; afterwards each unlocked builder
              appears in the picker. */}
        <section id="messaging" className="mt-8 scroll-mt-24">
          <Reveal immediate delay={0.30}>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
                  <MessageSquare className="size-3" />
                  Project messaging
                  {messagingUnread > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums">
                      {messagingUnread}
                    </span>
                  ) : null}
                </span>
                <h2 className="mt-1.5 font-ui font-semibold text-[16px] tracking-[-0.005em] text-text">
                  {conversations.length === 0
                    ? "Conversations appear when a builder unlocks"
                    : `Talk to ${conversations.length} builder${conversations.length === 1 ? "" : "s"}`}
                </h2>
              </div>
            </div>
            <ProjectMessagingPanel
              projectId={project.id}
              scope="owner"
              meId={session.user.id!}
              initialConversations={conversations}
              inboxHref="/owner/messages"
            />
          </Reveal>
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-1/40 overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border-subtle/60 flex items-center gap-2.5">
        <span className="size-7 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center">
          {icon}
        </span>
        <h3 className="font-ui font-semibold text-[13px] text-text">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function KvGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-3">{children}</dl>;
}

function Kv({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </dt>
      <dd className="text-[13.5px] text-text font-medium">
        {value === null || value === undefined || value === "" ? "—" : value}
      </dd>
    </div>
  );
}
