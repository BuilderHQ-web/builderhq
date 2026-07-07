/**
 * Next Actions — the dashboard's "do this next" rail.
 *
 * Sits between AT A GLANCE (numbers) and DECISIONS WAITING (work).
 * Where the at-a-glance row tells the owner *what* is happening, this
 * section tells them *what to do next* — surfaced as small action
 * tiles that share PulseTile's visual language (gradient + corner
 * glow + hairline sparkle) so the dashboard reads as one composition.
 *
 * Architecture — designed for growth.
 *
 *   1. We fetch a shared `ActionContext` once (user, drafts, profile),
 *      then pass it to a list of pure `collect…` functions.
 *   2. Each collector returns zero, one, or many `Action`s. Adding a
 *      new action type is a new collector + a render branch — no
 *      restructuring of the page.
 *   3. Actions are sorted by `priority` (low number = top). Within a
 *      tier the original collector order is preserved.
 *
 * Tone system — three "voices" map to three tile palettes:
 *
 *   · amber  → urgent. Money or time at stake. Optional pulse dot.
 *   · teal   → active. Productive next step (publish, upload, finish).
 *   · muted  → optional. House-keeping. Doesn't beg for the eye.
 *
 * Renders nothing when there are no actions — keeps the dashboard
 * quiet for owners who are caught up.
 */

import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import {
  ArrowRight,
  FileText,
  Hourglass,
  KeyRound,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";

import { db } from "@/lib/db";
import {
  checkPublishability,
  humanProjectTypeLabel,
  projects,
} from "@/modules/projects";
import { getOwnerProfile } from "@/modules/profiles";
import { users } from "@/modules/users";
import { cn } from "@/lib/utils";
import { SectionKicker } from "@/components/app/section-kicker";

// ── Public surface ──────────────────────────────────────────────────

interface NextActionsProps {
  userId: string;
  /** Total projects owned by user (drafts + published). Used to gate
   *  the "Upload your first project" prompt. */
  totalProjects: number;
  /** Tenders in submitted/shortlisted status awaiting an owner call. */
  tendersAwaitingDecision: number;
  /** Slug of the first project with a decision waiting, so the urgent
   *  card can deep-link straight into a tender review screen. Null
   *  when there are no decisions pending. */
  firstWaitingProjectSlug: string | null;
}

export async function NextActions(props: NextActionsProps) {
  const ctx = await buildContext(props);
  const actions = await collect(ctx);
  if (actions.length === 0) return null;

  return (
    <section>
      <SectionKicker>Next actions</SectionKicker>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((a) => (
          <ActionTile key={a.key} action={a} />
        ))}
      </div>
    </section>
  );
}

// ── Types ───────────────────────────────────────────────────────────

type Tone = "amber" | "teal" | "muted";

interface Action {
  key: string;
  /** Lower runs first. 10 = urgent, 20 = active, 30 = optional. */
  priority: number;
  tone: Tone;
  /** Adds an animated pulse dot near the icon — for live/urgent
   *  signals that should catch the eye. */
  pulse?: boolean;
  href: string;
  kicker: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
}

interface ActionContext {
  userId: string;
  hasPassword: boolean;
  signupSource: string | null;
  drafts: Array<{
    id: string;
    slug: string;
    title: string;
    type: import("@/modules/projects").ProjectRow["type"];
  }>;
  profile: Awaited<ReturnType<typeof getOwnerProfile>>;
  totalProjects: number;
  tendersAwaitingDecision: number;
  firstWaitingProjectSlug: string | null;
}

/** ~5 second buffer between createdAt and updatedAt — anything below
 *  this is "never touched by the user". */
const UNTOUCHED_BUFFER_MS = 5_000;

// ── Context build ───────────────────────────────────────────────────

async function buildContext(props: NextActionsProps): Promise<ActionContext> {
  const { userId, totalProjects, tendersAwaitingDecision, firstWaitingProjectSlug } =
    props;

  const [userRows, drafts, profile] = await Promise.all([
    db
      .select({
        passwordHash: users.passwordHash,
        signupSource: users.signupSource,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        type: projects.type,
      })
      .from(projects)
      .where(
        and(
          eq(projects.ownerId, userId),
          eq(projects.status, "draft"),
          isNull(projects.deletedAt),
          isNull(projects.publishedAt),
        ),
      ),
    getOwnerProfile(userId),
  ]);

  const user = userRows[0];

  return {
    userId,
    hasPassword: Boolean(user?.passwordHash),
    signupSource: user?.signupSource ?? null,
    drafts,
    profile,
    totalProjects,
    tendersAwaitingDecision,
    firstWaitingProjectSlug,
  };
}

// ── Collection ──────────────────────────────────────────────────────

async function collect(ctx: ActionContext): Promise<Action[]> {
  // Each collector is independent — they read only ctx and return new
  // actions. Add new collectors here without touching the others.
  const buckets = await Promise.all([
    collectTendersWaiting(ctx),
    collectFinishDrafts(ctx),
    collectUploadFirstProject(ctx),
    collectAddPassword(ctx),
    collectPolishProfile(ctx),
  ]);

  return buckets
    .flat()
    .sort((a, b) => a.priority - b.priority);
}

/** Tenders submitted/shortlisted that the owner hasn't acted on. */
function collectTendersWaiting(ctx: ActionContext): Action[] {
  if (ctx.tendersAwaitingDecision === 0) return [];
  const n = ctx.tendersAwaitingDecision;
  // If there's a pending decision and we have a project to deep-link
  // into, do — otherwise fall back to the global tenders page.
  const href = ctx.firstWaitingProjectSlug
    ? `/owner/projects/${ctx.firstWaitingProjectSlug}/tenders`
    : "/owner/tenders";
  return [
    {
      key: "tenders_waiting",
      priority: 10,
      tone: "amber",
      pulse: true,
      href,
      kicker: "Tenders waiting",
      title: n === 1 ? "Pick a winner" : "Make your call",
      sub:
        n === 1
          ? "One builder is waiting for your decision."
          : `${n} builders are waiting for your decision.`,
      icon: (
        <Hourglass
          size={15}
          strokeWidth={1.8}
          className="text-[#ffd887]"
        />
      ),
    },
  ];
}

/** Drafts the owner started but hasn't published — one card each, so
 *  multi-draft owners can act on the specific one that's blocking. */
async function collectFinishDrafts(ctx: ActionContext): Promise<Action[]> {
  if (ctx.drafts.length === 0) return [];
  const out: Action[] = [];
  for (const draft of ctx.drafts) {
    const report = await checkPublishability(ctx.userId, draft.id);
    if (!report.ok || report.value.canPublish) continue;
    const missingCount = report.value.reasons.length;
    const primaryMissing = shortenReason(report.value.reasons[0] ?? null);
    const typeLabel = humanProjectTypeLabel(draft.type);
    out.push({
      key: `finish_draft:${draft.id}`,
      priority: 20,
      tone: "teal",
      href: `/owner/projects/${draft.slug}/edit?welcome=finish`,
      kicker: "Finish your draft",
      title: draft.title,
      sub: primaryMissing
        ? `${capitalise(typeLabel)} · ${primaryMissing}${
            missingCount > 1 ? ` and ${missingCount - 1} more` : ""
          }`
        : `${capitalise(typeLabel)} · finish to publish`,
      icon: (
        <FileText size={15} strokeWidth={1.8} className="text-accent-light" />
      ),
    });
  }
  return out;
}

/** First-run nudge: nothing in the account yet — start the wizard. */
function collectUploadFirstProject(ctx: ActionContext): Action[] {
  if (ctx.totalProjects > 0) return [];
  return [
    {
      key: "upload_first_project",
      priority: 20,
      tone: "teal",
      href: "/owner/projects/new",
      kicker: "Upload your first project",
      title: "Open the wizard",
      sub: "Plans, address, and scope — usually takes under five minutes.",
      icon: <Plus size={15} strokeWidth={1.8} className="text-accent-light" />,
    },
  ];
}

/** Magic-link-only users have no password. Surface a low-key nudge so
 *  they can sign in from another device without waiting on email. */
function collectAddPassword(ctx: ActionContext): Action[] {
  if (ctx.hasPassword) return [];
  return [
    {
      key: "add_password",
      priority: 30,
      tone: "muted",
      href: "/settings#password",
      kicker: "Add a password",
      title: "Skip the magic-link wait",
      sub: "Set one in seconds — sign in instantly from any device.",
      icon: <KeyRound size={15} strokeWidth={1.8} className="text-text" />,
    },
  ];
}

/** Owners who came in via the ads funnel got an auto-bootstrapped
 *  profile (homeowner / suburb / email contact). Prompt them to
 *  refine it — but only while it's still untouched. */
function collectPolishProfile(ctx: ActionContext): Action[] {
  if (ctx.signupSource !== "ads_funnel") return [];
  if (!ctx.profile) return [];
  const untouched =
    Math.abs(
      ctx.profile.updatedAt.getTime() - ctx.profile.createdAt.getTime(),
    ) < UNTOUCHED_BUFFER_MS;
  if (!untouched) return [];
  return [
    {
      key: "polish_profile",
      priority: 30,
      tone: "muted",
      href: "/settings#account",
      kicker: "Polish your profile",
      title: "Tell us about you",
      sub: "Confirm your role, default area, and contact preference.",
      icon: <Settings size={15} strokeWidth={1.8} className="text-text" />,
    },
  ];
}

// ── Render ──────────────────────────────────────────────────────────

function ActionTile({ action }: { action: Action }) {
  const styles: Record<
    Tone,
    { bg: string; ring: string; glow: string; kickerColor: string }
  > = {
    amber: {
      bg: "linear-gradient(180deg,rgba(251,184,64,0.07),rgba(250,248,243,0.6))",
      ring: "border-warning/35 hover:border-warning/55",
      glow: "rgba(251,184,64,0.22)",
      kickerColor: "text-warning",
    },
    teal: {
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(250,248,243,0.6))",
      ring: "border-border-accent/40 hover:border-accent/60",
      glow: "rgba(0,212,200,0.18)",
      kickerColor: "text-accent-light",
    },
    muted: {
      bg: "linear-gradient(180deg,rgba(24,34,44,0.03),rgba(250,248,243,0.6))",
      ring: "border-border-subtle hover:border-border-accent/40",
      glow: "rgba(120,180,255,0.10)",
      kickerColor: "text-text-muted",
    },
  };
  const t = styles[action.tone];

  return (
    <Link
      href={action.href}
      className={cn(
        "group relative rounded-md border p-4 sm:p-5 overflow-hidden transform-gpu",
        "shadow-[0_10px_28px_-18px_rgba(15,23,32,0.19)]",
        "transition-colors",
        t.ring,
      )}
      style={{ background: t.bg }}
    >
      {/* Corner glow — matches PulseTile language. */}
      <span
        aria-hidden
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-50 pointer-events-none group-hover:opacity-80 transition-opacity"
        style={{
          background: `radial-gradient(circle, ${t.glow}, transparent 70%)`,
        }}
      />
      {/* Hairline sparkle at top — premium signal. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
      />

      <div className="relative flex items-start gap-3">
        <span className="relative size-9 rounded-lg border border-border-subtle bg-[rgba(24,34,44,0.035)] flex items-center justify-center shrink-0">
          {action.icon}
          {action.pulse ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex size-2"
            >
              <span className="absolute inline-flex size-full rounded-full bg-warning opacity-70 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-warning shadow-[0_0_8px_rgba(251,184,64,0.7)]" />
            </span>
          ) : null}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[10px] tracking-[0.18em] uppercase font-ui font-semibold inline-flex items-center gap-1.5",
              t.kickerColor,
            )}
          >
            <Sparkles size={10} strokeWidth={2} />
            {action.kicker}
          </p>
          <p className="mt-1 text-text font-ui font-semibold text-[15px] tracking-[-0.005em] truncate">
            {action.title}
          </p>
          <p className="mt-1 text-text-muted text-[12.5px] leading-[1.5] font-body line-clamp-1">
            {action.sub}
          </p>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={1.8}
          className="relative mt-1 text-text-faint group-hover:text-accent-light group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </Link>
  );
}

// ── helpers ─────────────────────────────────────────────────────────

/** Strip trailing punctuation from a publishability reason so it
 *  reads as a short chip. e.g. "Complete the project address." →
 *  "Complete the project address". */
function shortenReason(reason: string | null): string | null {
  if (!reason) return null;
  return reason.replace(/[.!?]+\s*$/, "");
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
