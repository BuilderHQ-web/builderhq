/**
 * Next Actions — surfaces pending tasks for the user in a compact
 * banner row near the top of the dashboard.
 *
 * Source signals:
 *   · Drafts owned by the user (status=draft, publishedAt=null) →
 *     "Finish [project title]" with a count of what's missing
 *     (street address / extension size / architectural plan).
 *   · users.signupSource = 'ads_funnel' AND profile updatedAt is
 *     within ~5s of createdAt → "Polish your profile" prompt to
 *     refine the auto-filled entity type + contact preference.
 *
 * Renders nothing when there are no actions — the user has a clean
 * dashboard.
 */

import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import {
  ArrowRight,
  FileText,
  Settings,
  Sparkles,
  Upload,
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

interface DraftAction {
  kind: "finish_draft";
  projectId: string;
  projectSlug: string;
  title: string;
  typeLabel: string;
  missing: string[];
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
    <section className="px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles size={14} strokeWidth={1.8} className="text-accent-light" />
            <h2 className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
              Next actions
            </h2>
            <span className="text-[10.5px] text-text-dim font-ui tabular-nums">
              {actions.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((a, i) => (
            <ActionCard key={i} action={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Collection ──────────────────────────────────────────────────────

async function collectActions(userId: string): Promise<Action[]> {
  const [user] = await db
    .select({
      signupSource: users.signupSource,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Parallel: drafts + profile
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

  // One "Finish [project]" task per draft. We resolve the missing
  // bits via checkPublishability so we can render a count of
  // outstanding items per card.
  for (const draft of drafts) {
    const report = await checkPublishability(userId, draft.id);
    if (!report.ok || report.value.canPublish) continue;
    out.push({
      kind: "finish_draft",
      projectId: draft.id,
      projectSlug: draft.slug,
      title: draft.title,
      typeLabel: humanProjectTypeLabel(draft.type),
      missing: report.value.reasons,
    });
  }

  // Polish-profile prompt for funnel users whose profile is in its
  // auto-filled default state.
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

// ── Card component ─────────────────────────────────────────────────

function ActionCard({ action }: { action: Action }) {
  if (action.kind === "finish_draft") {
    const missingCount = action.missing.length;
    return (
      <Link
        href={`/owner/projects/${action.projectSlug}/edit?welcome=finish`}
        className={cn(
          "group flex items-start gap-3 rounded-xl border border-border bg-surface-1/40 hover:border-border-accent hover:bg-surface-1/70",
          "transition-colors p-4 sm:p-5",
        )}
      >
        <span className="inline-flex items-center justify-center size-9 rounded-lg border border-border-accent bg-accent-muted shrink-0">
          <FileText
            size={16}
            strokeWidth={1.8}
            className="text-accent-light"
          />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold">
            Finish your draft
          </p>
          <p className="mt-1 text-text font-ui font-semibold text-[14px] tracking-[-0.005em] truncate">
            {action.title}
          </p>
          <p className="mt-0.5 text-text-muted text-[12px] font-body">
            {action.typeLabel.charAt(0).toUpperCase() +
              action.typeLabel.slice(1)}{" "}
            · {missingCount} item{missingCount === 1 ? "" : "s"} left to
            publish
          </p>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={1.8}
          className="mt-1 text-text-faint group-hover:text-accent-light group-hover:translate-x-0.5 transition-all"
        />
      </Link>
    );
  }

  // polish_profile
  return (
    <Link
      href="/settings#account"
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border bg-surface-1/40 hover:border-border-accent hover:bg-surface-1/70",
        "transition-colors p-4 sm:p-5",
      )}
    >
      <span className="inline-flex items-center justify-center size-9 rounded-lg border border-border-subtle bg-surface-0/60 shrink-0">
        <Settings size={16} strokeWidth={1.8} className="text-text-muted" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold">
          Polish your profile
        </p>
        <p className="mt-1 text-text font-ui font-semibold text-[14px] tracking-[-0.005em]">
          Tell us about you
        </p>
        <p className="mt-0.5 text-text-muted text-[12px] font-body">
          Confirm your role, default area, and contact preference.
        </p>
      </div>
      <ArrowRight
        size={14}
        strokeWidth={1.8}
        className="mt-1 text-text-faint group-hover:text-accent-light group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}

// ── Quiet unused-import shim ────────────────────────────────────────
// Kept for future "upload your first project" empty-state action.
void Upload;
