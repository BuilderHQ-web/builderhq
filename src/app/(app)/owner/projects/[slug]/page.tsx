import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  Building,
  Calendar,
  Check,
  DollarSign,
  Eye,
  FileText,
  Home,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Users,
  Wrench,
} from "lucide-react";

import { auth } from "@/modules/auth";
import {
  getBySlugForViewer,
  PARTICIPANT_ROLE_LABEL,
  type Project,
} from "@/modules/projects";
import { listActiveForProjectUnchecked } from "@/modules/documents";
import { countTendersForProject } from "@/modules/tenders";
import { listForUserOnProject } from "@/modules/messaging";
import { listUnlocksForProject, UNLOCK_CAP } from "@/modules/unlocks";
import { listBuilderInvites, listTenderStatesForProject } from "@/modules/tenders";
import {
  getProjectSchedule,
  listOpenConflictsForProject,
} from "@/modules/scope-engine";
import { packSummary } from "@/modules/tenders/schedule";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/app/reveal";
import { ProjectMessagingPanel } from "@/components/app/messaging/project-thread";
import { ProjectActivity } from "./activity";
import { ParticipantsPanel } from "./participants-panel";
import { projectsBase } from "@/lib/dashboard-route";

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

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
};

const BUDGET_LABEL: Record<NonNullable<Project["budgetBand"]>, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k to $1m",
  "1m_1_5m": "$1m to $1.5m",
  "1_5m_2m": "$1.5m to $2m",
  "2m_3m": "$2m to $3m",
  "3m_5m": "$3m to $5m",
  over_5m: "Over $5m",
};

const RENO_LABEL: Record<NonNullable<Project["renovationScope"]>, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  kitchen_and_bathroom: "Kitchen and bathroom",
  full_internal: "Full internal",
  full_internal_and_external: "Internal and external",
  structural: "Structural",
};

const EXT_LABEL: Record<NonNullable<Project["extensionType"]>, string> = {
  ground_floor: "Ground floor",
  first_floor: "First floor",
  ground_and_first: "Ground and first",
  rear: "Rear",
  side: "Side",
};

const LAND_LABEL: Record<NonNullable<Project["landSizeBand"]>, string> = {
  under_200: "Under 200 m²",
  "200_400": "200 to 400 m²",
  "400_600": "400 to 600 m²",
  "600_800": "600 to 800 m²",
  "800_1000": "800 to 1,000 m²",
  over_1000: "Over 1,000 m²",
};
const BUILD_LBL: Record<NonNullable<Project["buildSizeBand"]>, string> = {
  under_100: "Under 100 m²",
  "100_150": "100 to 150 m²",
  "150_200": "150 to 200 m²",
  "200_250": "200 to 250 m²",
  "250_300": "250 to 300 m²",
  "300_400": "300 to 400 m²",
  over_400: "Over 400 m²",
};
const EXT_SIZE_LBL: Record<NonNullable<Project["extensionSizeBand"]>, string> = {
  under_50: "Under 50 m²",
  "50_100": "50 to 100 m²",
  "100_150": "100 to 150 m²",
  "150_200": "150 to 200 m²",
  "200_250": "200 to 250 m²",
  "250_300": "250 to 300 m²",
  over_300: "Over 300 m²",
};
const AGE_LBL: Record<NonNullable<Project["existingAgeBand"]>, string> = {
  under_10: "Under 10 years",
  "10_25": "10 to 25 years",
  "25_50": "25 to 50 years",
  "50_75": "50 to 75 years",
  over_75: "Over 75 years",
};

/** "2026-11" (the stored month format) → "November 2026". */
function formatMonth(s: string | null | undefined): string | null {
  if (!s) return null;
  const [y, m] = s.split("-");
  if (!y || !m) return s;
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}`);

  const base = projectsBase(session.user.role);

  const r = await getBySlugForViewer(session.user.id!, slug);
  if (!r.ok) {
    if (r.error.code === "not_found" || r.error.code === "forbidden") notFound();
    throw new Error(r.error.message);
  }
  const { project, access, sharedBy } = r.value;
  const isRunner = access.kind === "runner";
  // Messaging follows the decision: the runner and Deciding seats hold
  // their own threads with the round's builders; Following seats stay
  // out of the threads by decree.
  const canMessage =
    isRunner || (access.kind === "participant" && access.role === "decider");
  const sharedByName = sharedBy
    ? (sharedBy.practiceName ?? sharedBy.name ?? "the project runner")
    : null;

  // Drafts go to the wizard for the runner — unless the project is in
  // preparation under the scope gate, in which case the tender pack
  // page is the draft's home. A participant's seat shows whatever
  // exists either way.
  if (project.status === "draft" && isRunner) {
    redirect(
      project.publishRequestedAt
        ? `${base}/projects/${slug}/scope`
        : `${base}/projects/${slug}/edit`,
    );
  }

  // Independent reads — fan out in parallel. `builders` is the unlock
  // list (≤ UNLOCK_CAP), which drives the "who's interested" panel and
  // the messaging panel's builder chips. Conversations are the
  // VIEWER'S own threads — the runner's pre-exist from unlocks, a
  // Deciding seat's are opened from the panel.
  const [docs, tenderCount, conversations, builders, invitesR, tenderStates, schedule, conflicts] =
    await Promise.all([
      listActiveForProjectUnchecked(project.id),
      countTendersForProject(project.id),
      canMessage
        ? listForUserOnProject(session.user.id!, project.id)
        : Promise.resolve([]),
      listUnlocksForProject(project.id),
      isRunner
        ? listBuilderInvites(session.user.id!, project.id)
        : Promise.resolve(null),
      isRunner ? listTenderStatesForProject(project.id) : Promise.resolve(new Map<string, string>()),
      getProjectSchedule(project.id),
      listOpenConflictsForProject(project.id),
    ]);
  const invites = invitesR && invitesR.ok ? invitesR.value : [];
  const pack = schedule ? packSummary(schedule) : null;

  // Builders the viewer has no thread with yet — the panel's start
  // affordance. Empty for runners in practice (unlock auto-creates
  // their threads); the working set for Deciding seats.
  const startableBuilders = canMessage
    ? builders
        .filter((b) => !conversations.some((c) => c.other.id === b.builderId))
        .map((b) => ({
          builderId: b.builderId,
          label: b.companyName ?? b.name ?? "Builder",
          initials: b.initials,
        }))
    : [];
  // Inline the unread tally here — totalUnread() lives in a "use client"
  // module, so calling it from this server component throws an RSC
  // boundary error. The math is a trivial reduce.
  const messagingUnread = conversations.reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[1060px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-2 flex-wrap">
              {TYPE_META[project.type].icon}
              {TYPE_META[project.type].label}
              <span className="text-text-dim/60">·</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-sm border text-[8.5px] tracking-[0.16em] uppercase font-semibold",
                  project.status === "archived"
                    ? "border-border-subtle text-text-dim"
                    : "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-[#0a7d73]",
                )}
              >
                {STATUS_LABEL[project.status]}
              </span>
              {project.tenderMode === "private" ? (
                <span className="px-1.5 py-0.5 rounded-sm border border-[rgba(42,92,174,0.35)] bg-[rgba(42,92,174,0.06)] text-[8.5px] tracking-[0.16em] uppercase text-[#2a5cae] font-semibold inline-flex items-center gap-1">
                  <Lock className="size-2.5" />
                  Private round
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-sm border border-border-subtle text-[8.5px] tracking-[0.16em] uppercase text-text-dim font-semibold">
                  Open round
                </span>
              )}
            </span>
            <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[32px] sm:text-[52px] leading-[0.92] text-text break-words">
              {project.title}
            </h1>
            {project.suburb ? (
              <p className="mt-3 text-[13px] sm:text-[14px] text-text-muted break-words">
                {project.suburb}, {project.state} {project.postcode}
              </p>
            ) : null}
          </div>
          {isRunner ? (
            <Link
              href={`${base}/projects/${project.slug}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "gap-2 shrink-0")}
            >
              <Pencil className="size-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-subtle bg-surface-1 text-[11px] text-text-muted">
              <Eye className="size-3.5 text-accent-light" />
              <span>
                Shared by <span className="text-text font-medium">{sharedByName}</span>
                <span className="text-text-dim"> · {PARTICIPANT_ROLE_LABEL[access.role]}</span>
              </span>
            </span>
          )}
        </div>

        {/* Activity — the owner's "what's happening / who's interested /
            what now" panel. Sits first, right under the header, so a live
            project page is never silent: it reassures while waiting, shows
            who's unlocked (with links to their public profile), and points
            to the tender comparison once tenders arrive. */}
        <Reveal immediate>
          <ProjectActivity
            basePath={base}
            slug={project.slug}
            state={project.state}
            unlockCount={builders.length}
            tenderCount={tenderCount}
            cap={project.tenderSpots ?? UNLOCK_CAP}
            builders={builders}
            tenderMode={project.tenderMode}
            canMessage={canMessage}
          />
        </Reveal>

        {/* The round board — who was asked, and where each of them is.
            Four honest states a runner actually wants: invited (the
            email is out), joined (they opened the project), started
            (a tender is in draft), submitted. With the door to invite
            another, closed at five. */}
        {isRunner && (invites.length > 0 || project.tenderMode === "private") ? (
          <Reveal immediate delay={0.02}>
            <div className="mt-5 rounded-md border border-border-subtle bg-surface-1 card-elev px-5 py-4.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                  <Users className="size-3.5 text-accent-light" />
                  Your invited builders
                  <span className="text-text-dim/70 normal-case tracking-normal">
                    · {invites.filter((i) => i.status === "invited" || i.status === "joined").length} of 5
                  </span>
                </p>
                {invites.filter((i) => i.status === "invited" || i.status === "joined").length < 5 ? (
                  <Link
                    href={`${base}/projects/${project.slug}/edit`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-ui font-medium text-accent-light hover:text-accent-deep transition-colors"
                  >
                    <Plus className="size-3.5" />
                    Invite another builder
                  </Link>
                ) : (
                  <span className="text-[11px] text-text-dim">
                    All five invitations used
                  </span>
                )}
              </div>
              {invites.length === 0 ? (
                <p className="mt-3 text-[12.5px] leading-[1.65] text-text-muted">
                  Nobody has been invited yet. On a private round, invited
                  builders are the round: until you invite one, no builder
                  can see this project.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border-subtle/60">
                  {invites.map((inv) => {
                    const tState = inv.builderUserId
                      ? tenderStates.get(inv.builderUserId)
                      : undefined;
                    const stage =
                      inv.status === "declined" || inv.status === "revoked"
                        ? inv.status
                        : tState === "submitted" || tState === "shortlisted" || tState === "awarded"
                          ? "submitted"
                          : tState === "draft"
                            ? "started"
                            : inv.status === "joined"
                              ? "joined"
                              : "invited";
                    const STAGE: Record<string, { label: string; cls: string }> = {
                      invited: { label: "Invited · not opened yet", cls: "text-[#8a6414]" },
                      joined: { label: "Joined · reading the pack", cls: "text-[#2a5cae]" },
                      started: { label: "Tender in progress", cls: "text-[#2a5cae]" },
                      submitted: { label: "Tender submitted", cls: "text-[#0a7d73]" },
                      declined: { label: "Declined", cls: "text-text-dim" },
                      revoked: { label: "Revoked", cls: "text-text-dim" },
                    };
                    const st = STAGE[stage]!;
                    return (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                      >
                        <span className="min-w-0 flex items-center gap-2">
                          <span className="min-w-0 truncate text-[13px] font-ui font-medium text-text">
                            {inv.builderName ?? inv.company ?? inv.contactName ?? inv.email}
                          </span>
                          {inv.verificationPending ? (
                            <span className="shrink-0 rounded-full bg-[rgba(201,148,34,0.12)] text-[#8a6414] px-2 py-px text-[9px] tracking-[0.08em] uppercase font-ui font-semibold">
                              Verification pending
                            </span>
                          ) : null}
                        </span>
                        <span className={cn("shrink-0 inline-flex items-center gap-1.5 text-[11px] font-ui font-medium", st.cls)}>
                          {stage === "submitted" ? <Check className="size-3" /> : null}
                          {st.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Reveal>
        ) : null}

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 sm:gap-5 lg:gap-x-8">
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
              <Card title="Budget and timeline" icon={<DollarSign className="size-4" />}>
                <KvGrid>
                  <Kv
                    label="Budget"
                    value={project.budgetBand ? BUDGET_LABEL[project.budgetBand] : null}
                  />
                  <Kv label="Target start" value={formatMonth(project.targetStartMonth)} />
                  <Kv
                    label="Target completion"
                    value={formatMonth(project.targetCompletionMonth)}
                  />
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

            {/* The scope of works — the thing the whole round prices.
                It used to vanish from the owner's view the moment the
                review ended; the record read stays one click away for
                the life of the project. */}
            {pack ? (
              <Reveal immediate delay={0.10}>
                <Card
                  title="Scope of works"
                  icon={<BookOpenCheck className="size-4" />}
                >
                  <p className="text-[12.5px] leading-[1.65] text-text-muted">
                    <span className="text-text font-ui font-semibold">
                      {pack.tenderable} lines
                    </span>{" "}
                    across {pack.divisions.length} divisions, built from your
                    documents. Every builder prices this same list, so their
                    tenders compare line by line.
                  </p>
                  <Link
                    href={`${base}/projects/${project.slug}/scope`}
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-light hover:text-accent-deep transition-colors"
                  >
                    Read the pack as builders see it
                    <ArrowUpRight className="size-3" />
                  </Link>
                </Card>
              </Reveal>
            ) : null}

            {/* Where the documents disagree. Ops reads every conflict;
                the ones left standing belong to the people the pack
                is for. Hiding a known disagreement from the person
                signing the contract is not an option. */}
            {conflicts.length > 0 ? (
              <Reveal immediate delay={0.11}>
                <Card
                  title={`Where the documents disagree · ${conflicts.length}`}
                  icon={<AlertTriangle className="size-4" />}
                >
                  <p className="text-[12px] leading-[1.6] text-text-muted">
                    Your documents give different answers on{" "}
                    {conflicts.length === 1 ? "one point" : "these points"}.
                    Builders see the same notes and price with them in view,
                    so nobody resolves a disagreement silently.
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {conflicts.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-md border border-[rgba(217,164,65,0.35)] bg-[rgba(217,164,65,0.06)] px-3 py-2.5 text-[12px] leading-[1.6] text-text-muted"
                      >
                        {c.summary}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ) : null}

            <Reveal immediate delay={0.12}>
            <Card title={`Documents · ${docs.length}`} icon={<FileText className="size-4" />}>
              {docs.length === 0 ? (
                <p className="text-[12.5px] text-text-dim">No documents.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {docs.slice(0, 8).map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 text-[12.5px] text-text-muted min-w-0"
                    >
                      <FileText className="size-3.5 text-text-dim shrink-0" />
                      <span className="truncate">{d.filename}</span>
                    </li>
                  ))}
                  {docs.length > 8 ? (
                    <li className="text-[11px] text-text-dim">
                      and {docs.length - 8} more
                    </li>
                  ) : null}
                </ul>
              )}
              {isRunner ? (
                <Link
                  href={`${base}/projects/${project.slug}/edit`}
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-light hover:text-accent-deep transition-colors"
                >
                  Manage documents
                  <ArrowUpRight className="size-3" />
                </Link>
              ) : null}
            </Card>
            </Reveal>

            <Reveal immediate delay={0.18}>
            <Card title={`Tenders · ${tenderCount}`} icon={<FileText className="size-4" />}>
              {tenderCount === 0 ? (
                <p className="text-[12.5px] text-text-dim">
                  No tenders yet. As builders on your round submit, their
                  tenders appear here side by side.
                </p>
              ) : (
                <p className="text-[12.5px] text-text-muted">
                  {tenderCount} tender{tenderCount === 1 ? "" : "s"} received.
                  Compare them side by side and decide.
                </p>
              )}
              <Link
                href={`${base}/projects/${project.slug}/tenders`}
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-light hover:text-accent-deep transition-colors"
              >
                {tenderCount > 0 ? "Compare tenders" : "View tenders"}
                <ArrowUpRight className="size-3" />
              </Link>
            </Card>
            </Reveal>

            {/* Sharing — the runner hands seats to the people who
                should watch (or help decide) without running the
                round. Flagship case: the architect's client. */}
            {isRunner ? (
              <Reveal immediate delay={0.21}>
                <ParticipantsPanel
                  projectId={project.id}
                  audience={session.user.role === "architect" ? "architect" : "owner"}
                />
              </Reveal>
            ) : null}

            <Reveal immediate delay={0.24}>
            <Card title="Dates" icon={<Calendar className="size-4" />}>
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

        {/* Inline messaging — the viewer's own threads with the
              round's builders. Runner + Deciding seats; a Following
              seat stays out of the threads by decree. */}
        {canMessage ? (
        <section id="messaging" className="mt-8 scroll-mt-24">
          <Reveal immediate delay={0.30}>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-2">
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
                    ? "Message builders as they join your round"
                    : `Talk to ${conversations.length} builder${conversations.length === 1 ? "" : "s"}`}
                </h2>
              </div>
            </div>
            <ProjectMessagingPanel
              projectId={project.id}
              scope="owner"
              meId={session.user.id!}
              initialConversations={conversations}
              inboxHref={`${base}/messages`}
              startable={startableBuilders}
            />
          </Reveal>
        </section>
        ) : null}
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
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 sm:px-6 py-3 border-b border-border-subtle/60 flex items-center gap-2">
        <span className="text-accent-light [&_svg]:size-3">{icon}</span>
        <h3 className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold">
          {title}
        </h3>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function KvGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-8 gap-y-3.5">{children}</dl>;
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
