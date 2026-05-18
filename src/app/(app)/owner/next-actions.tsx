/**
 * Next Actions — surfaces pending tasks for the user as a styled
 * section between "At a glance" and "Decisions waiting".
 *
 * Source signals:
 *   · Drafts owned by the user (status=draft, publishedAt=null) →
 *     "Finish [project title]" card with a count of what's missing
 *     (street address / extension size / architectural plan).
 *   · users.signupSource = 'ads_funnel' AND profile updatedAt is
 *     within ~5s of createdAt → "Polish your profile" prompt to
 *     refine the auto-filled entity type + contact preference.
 *
 * Visual signature mirrors PulseTile (the at-a-glance row) — same
 * gradient tile + corner glow + hairline-accent border treatment —
 * so the dashboard reads as one cohesive composition rather than
 * stacking discrete widgets.
 *
 * Renders nothing when there are no actions (clean dashboard).
 */

import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { ArrowRight, FileText, Settings, Sparkles } from "lucide-react";

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

interface DraftAction {
  kind: "finish_draft";
  projectId: string;
  projectSlug: string;
  title: string;
  typeLabel: string;
  missingCount: number;
  primaryMissing: string | null;
}

interface ProfileAction {
  kind: "polish_profile";
}

type Action = DraftAction | ProfileAction;

/** ~5 second buffer between createdAt and updatedAt — anything below
 *  this is "never touched by the user". */
const UNTOUCHED_BUFFER_MS = 5_000;

export async function NextActions({ userId }: { userId: string }) {
  const actions = await collectActions(userId);
  if (actions.length === 0) return null;

  return (
    <section>
      <SectionKicker>Next actions</SectionKicker>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <ActionTile key={i} action={a} />
        ))}
      </div>
    </section>
  );
}

// ── Collection ──────────────────────────────────────────────────────

async function collectActions(userId: string): Promise<Action[]> {
  const [user] = await db
    .select({ signupSource: users.signupSource })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [drafts, profile] = await Promise.all([
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

  const out: Action[] = [];

  for (const draft of drafts) {
    const report = await checkPublishability(userId, draft.id);
    if (!report.ok || report.value.canPublish) continue;
    out.push({
      kind: "finish_draft",
      projectId: draft.id,
      projectSlug: draft.slug,
      title: draft.title,
      typeLabel: humanProjectTypeLabel(draft.type),
      missingCount: report.value.reasons.length,
      primaryMissing: shortenReason(report.value.reasons[0] ?? null),
    });
  }

  if (
    user?.signupSource === "ads_funnel" &&
    profile &&
    Math.abs(
      profile.updatedAt.getTime() - profile.createdAt.getTime(),
    ) < UNTOUCHED_BUFFER_MS
  ) {
    out.push({ kind: "polish_profile" });
  }

  return out;
}

/** Strip trailing punctuation from a publishability reason so it
 *  reads as a short chip. e.g. "Complete the project address." →
 *  "Complete the project address". */
function shortenReason(reason: string | null): string | null {
  if (!reason) return null;
  return reason.replace(/[.!?]+\s*$/, "");
}

// ── Action tile ─────────────────────────────────────────────────────

function ActionTile({ action }: { action: Action }) {
  if (action.kind === "finish_draft") {
    return (
      <Tile
        href={`/owner/projects/${action.projectSlug}/edit?welcome=finish`}
        kicker="Finish your draft"
        title={action.title}
        sub={
          action.primaryMissing
            ? `${capitalise(action.typeLabel)} · ${action.primaryMissing}${
                action.missingCount > 1
                  ? ` and ${action.missingCount - 1} more`
                  : ""
              }`
            : `${capitalise(action.typeLabel)} · finish to publish`
        }
        icon={
          <FileText
            size={15}
            strokeWidth={1.8}
            className="text-accent-light"
          />
        }
        tone="teal"
      />
    );
  }

  // polish_profile
  return (
    <Tile
      href="/settings#account"
      kicker="Polish your profile"
      title="Tell us about you"
      sub="Confirm your role, default area, and contact preference."
      icon={<Settings size={15} strokeWidth={1.8} className="text-text" />}
      tone="muted"
    />
  );
}

// ── Shared tile primitive ───────────────────────────────────────────

type Tone = "teal" | "muted";

function Tile({
  href,
  kicker,
  title,
  sub,
  icon,
  tone,
}: {
  href: string;
  kicker: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  tone: Tone;
}) {
  const styles: Record<
    Tone,
    { bg: string; ring: string; glow: string; kickerColor: string }
  > = {
    teal: {
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(6,18,30,0.6))",
      ring: "border-border-accent/40 hover:border-accent/60",
      glow: "rgba(0,212,200,0.18)",
      kickerColor: "text-accent-light",
    },
    muted: {
      bg: "linear-gradient(180deg,rgba(255,255,255,0.02),rgba(6,18,30,0.6))",
      ring: "border-border-subtle hover:border-border-accent/40",
      glow: "rgba(120,180,255,0.10)",
      kickerColor: "text-text-muted",
    },
  };
  const t = styles[tone];

  return (
    <Link
      href={href}
      className={cn(
        "group relative rounded-md border p-4 sm:p-5 overflow-hidden transform-gpu",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
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
        <span className="size-9 rounded-lg border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[10px] tracking-[0.18em] uppercase font-ui font-semibold inline-flex items-center gap-1.5",
              t.kickerColor,
            )}
          >
            <Sparkles size={10} strokeWidth={2} />
            {kicker}
          </p>
          <p className="mt-1 text-text font-ui font-semibold text-[15px] tracking-[-0.005em] truncate">
            {title}
          </p>
          <p className="mt-1 text-text-muted text-[12.5px] leading-[1.5] font-body line-clamp-1">
            {sub}
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

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
