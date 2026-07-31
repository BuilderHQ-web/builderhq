/**
 * unlocks · service layer.
 *
 * Owns the builder-side commitments on a project:
 *
 *   unlockProject  — flip a (builder, project) pair to "unlocked".
 *                    During launch (step 4), free for everyone.
 *                    Step 5 wires Stripe + founding-credits to the
 *                    `source` column.
 *   isUnlocked     — boolean check used by the project detail page
 *                    to decide whether to render the locked overlay.
 *   listMyUnlocks  — builder's "unlocked projects" list.
 *
 * Saved-projects (bookmarks) live alongside:
 *   saveProject / unsaveProject / isSaved / listMySaved.
 */

import "server-only";
import { after } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { checkCreditAvailable } from "@/modules/credits";
import {
  getOrCreateConversation,
  postUnlockSystemMessage,
} from "@/modules/messaging";
import { builderProfiles } from "@/modules/profiles/schema";
import { users } from "@/modules/users/schema";
// Public-barrel import — the project row FK target lives here so we
// don't deepen the cross-module-schema lint debt.
import { projects } from "@/modules/projects";

import { UNLOCK_CAP } from "./constants";
import { unlocks, savedProjects, type UnlockRow } from "./schema";

/**
 * Hard gate for unlock-capability. A builder can only spend FBA
 * credits / pay for an unlock once their identity is fully verified
 * (ABN + ≥1 licence) — i.e. their profile is `approved`.
 *
 * Returns a tagged result so the UI can render a tailored CTA:
 *
 *   - `ok: true`                       — proceed with the unlock
 *   - error code 'forbidden' + reason  — show "viewer mode" panel
 *
 * This sits at the very top of unlockProject so it runs before any
 * credit / payment logic. We don't burn an FBA credit on a builder
 * who isn't allowed to unlock anyway.
 */
export async function checkUnlockEligibility(
  builderId: string,
): Promise<Result<{ ok: true }>> {
  const [profile] = await db
    .select({ approvalStatus: builderProfiles.approvalStatus })
    .from(builderProfiles)
    .where(eq(builderProfiles.userId, builderId))
    .limit(1);

  if (!profile) {
    return fail(
      "forbidden",
      "Finish your builder profile before unlocking projects.",
      { reason: "no_profile" },
    );
  }
  if (profile.approvalStatus === "approved") return ok({ ok: true });

  // viewer-mode messaging — what's specifically missing.
  // Lazy import: verification module is server-only.
  const { hasFullVerificationForApproval } = await import(
    "@/modules/verification"
  );
  const v = await hasFullVerificationForApproval(builderId);

  return fail(
    "forbidden",
    v.reasons[0] ??
      "Verify your ABN and at least one builder licence to unlock projects.",
    {
      reason: "viewer_mode",
      abnVerified: v.abnVerified,
      anyLicenceVerified: v.anyLicenceVerified,
      reasons: v.reasons,
    },
  );
}

/**
 * On a fresh unlock, get-or-create the (project × builder) conversation
 * and drop a system message announcing the unlock. Failures here are
 * non-fatal — the unlock has already been written to the DB at this
 * point, and a missing system message is recoverable (the conversation
 * still appears in both inboxes the moment either side sends a real
 * message).
 */
async function ensureConversationOnUnlock(
  builderId: string,
  projectId: string,
): Promise<void> {
  try {
    const conv = await getOrCreateConversation(projectId, builderId);
    if (!conv.ok) {
      logger.warn(
        {
          event: "unlock.conversation.create_failed",
          projectId,
          builderId,
          err: conv.error,
        },
        "couldn't auto-create conversation on unlock",
      );
      return;
    }
    await postUnlockSystemMessage(conv.value.id, builderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "unlock.conversation.threw", projectId, builderId, msg },
      "ensureConversationOnUnlock threw — continuing",
    );
  }
}

/**
 * Fan-out the unlock event — owner email + bell, builder receipt, ops
 * heads-up. Fire-and-forget; emails never block the unlock action.
 */
async function dispatchUnlock(
  builderId: string,
  projectId: string,
): Promise<void> {
  try {
    const { dispatchUnlockEvent } = await import("./dispatch");
    await dispatchUnlockEvent({ builderId, projectId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "unlock.dispatch.threw", projectId, builderId, msg },
      "unlock dispatch threw — continuing",
    );
  }
}

// ── unlocks ──────────────────────────────────────────────────────────────

/**
 * Idempotent: calling twice with the same builder+project is fine.
 * Returns the existing row in that case.
 *
 * The unlock flow gates on three things, in this order:
 *
 *   1. **Already-unlocked short-circuit.** If this (builder × project)
 *      already has a row, return it. No state change.
 *   2. **Builder eligibility.** Verified ABN + licence (skipped for
 *      admin / paid-source unlocks that already know better).
 *   3. **Platform cap.** No project may have more than UNLOCK_CAP (3)
 *      unlocks. Enforced inside a transaction with `SELECT … FOR UPDATE`
 *      on the project row so two simultaneous unlock attempts can't
 *      both squeeze in. Bypassed for caller-forced sources because
 *      those callsites are admin tooling / Stripe webhooks already.
 *   4. **FBA credit.** Founding-tier credit must be available (free
 *      unlocks). Stripe paid path arrives in v2.
 *
 * The cap is enforced inside the same transaction as the insert.
 * Without that, two builders racing to be the 3rd unlock could both
 * pass the count check (each seeing 2 rows) and both insert — bumping
 * the project to 4. The row lock serialises the cap check + insert.
 */
export async function unlockProject(
  builderId: string,
  projectId: string,
  options: {
    source?: UnlockRow["source"];
    /** Stripe payment intent id — set on the paid path so the row records
     *  which charge funded the unlock (and the webhook can tell its own
     *  unlock apart from a racing one). */
    stripePaymentIntentId?: string | null;
  } = {},
): Promise<Result<UnlockRow>> {
  // Already unlocked? Return the existing row.
  const [existing] = await db
    .select()
    .from(unlocks)
    .where(
      and(eq(unlocks.builderId, builderId), eq(unlocks.projectId, projectId)),
    );
  if (existing) return ok(existing);

  // Verification gate. Admin-source unlocks bypass (admin tooling,
  // Stripe webhooks, etc. — those callsites already know what
  // they're doing). Self-service unlocks only proceed once approved.
  if (!options.source || options.source === "free") {
    const eligibility = await checkUnlockEligibility(builderId);
    if (!eligibility.ok) return eligibility;
  }

  // Caller-forced source (e.g. Stripe webhook, admin override).
  // Still cap-enforced — admins shouldn't blow past the rule by accident.
  if (options.source && options.source !== "free") {
    return insertUnlockWithCap(
      builderId,
      projectId,
      options.source,
      options.stripePaymentIntentId ?? null,
    );
  }

  // Default: gate on FBA credit.
  const credit = await checkCreditAvailable(builderId);
  if (!credit.ok) {
    return fail(
      "rate_limited",
      credit.reason === "exhausted"
        ? "All free unlocks for this cycle have been used."
        : credit.reason === "expired"
        ? "Your Founding Builder Access has expired."
        : "You need Founding Builder Access (or a paid unlock) to view this project.",
      { reason: credit.reason },
    );
  }

  return insertUnlockWithCap(builderId, projectId, "founding");
}

/**
 * Cap-enforced insert. Wraps the count check + insert in a single
 * transaction with `FOR UPDATE` on the project row, so simultaneous
 * unlock attempts on the same project serialise through Postgres.
 *
 * Returns:
 *   - ok(row)                          — unlock recorded
 *   - fail("rate_limited", "project_full") — already at cap
 *   - fail("internal", ...)            — DB error
 *
 * Side effects (conversation create + dispatch) run outside the
 * transaction so they don't block the unlock if email/notification
 * dispatch is slow.
 */
async function insertUnlockWithCap(
  builderId: string,
  projectId: string,
  source: UnlockRow["source"],
  stripePaymentIntentId: string | null = null,
): Promise<Result<UnlockRow>> {
  let inserted: UnlockRow | null = null;
  let atCap = false;
  let capForMessage: number = UNLOCK_CAP;

  try {
    await db.transaction(async (tx) => {
      // Row-level lock on the project. Any other unlock for this same
      // project waits here until our transaction commits/rolls back.
      // Doesn't affect reads, doesn't affect other projects. The same
      // locked read carries the project's own spot count: per-project
      // tender_spots (2–5) with the platform default as fallback.
      const locked = await tx.execute(
        sql`SELECT tender_spots FROM ${projects} WHERE ${projects.id} = ${projectId} FOR UPDATE`,
      );
      const spotsRaw = (locked.rows?.[0] as { tender_spots: number | null } | undefined)
        ?.tender_spots;
      const cap = spotsRaw ?? UNLOCK_CAP;

      const current = await tx.$count(unlocks, eq(unlocks.projectId, projectId));
      if (current >= cap) {
        atCap = true;
        capForMessage = cap;
        return;
      }

      const [row] = await tx
        .insert(unlocks)
        .values({ builderId, projectId, source, stripePaymentIntentId })
        .returning();
      inserted = row ?? null;
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "unlock.insert_failed", projectId, builderId, msg },
      "unlock insert transaction threw",
    );
    return fail("internal", "Failed to record unlock.");
  }

  if (atCap) {
    return fail(
      "rate_limited",
      `This project is full — ${capForMessage} builders already have access.`,
      { reason: "project_full" },
    );
  }
  if (!inserted) {
    return fail("internal", "Failed to record unlock.");
  }

  await ensureConversationOnUnlock(builderId, projectId);
  // `after()` keeps the function runtime alive on Vercel until the
  // dispatch completes. dispatchUnlock today sends ~3 emails (owner /
  // builder confirmation / ops) which fits inside the response window,
  // but consistency matters — naked `void` is the same fragile pattern
  // that bit projects/service.ts publish.
  after(() => dispatchUnlock(builderId, projectId));
  return ok(inserted);
}

export async function isUnlocked(
  builderId: string,
  projectId: string,
): Promise<boolean> {
  const [hit] = await db
    .select({ id: unlocks.id })
    .from(unlocks)
    .where(and(eq(unlocks.builderId, builderId), eq(unlocks.projectId, projectId)));
  return !!hit;
}

/** All projects this builder has unlocked, newest first. */
export async function listMyUnlockedProjectIds(
  builderId: string,
): Promise<string[]> {
  const rows = await db
    .select({ projectId: unlocks.projectId })
    .from(unlocks)
    .where(eq(unlocks.builderId, builderId))
    .orderBy(desc(unlocks.unlockedAt));
  return rows.map((r) => r.projectId);
}

export async function countMyUnlocks(builderId: string): Promise<number> {
  return db.$count(unlocks, eq(unlocks.builderId, builderId));
}

/**
 * Total unlocks on a single project. Bounded between 0 and
 * UNLOCK_CAP under normal operation. Used by the marketplace card
 * to render "X / N spots" and by the detail page to gate the
 * unlock CTA.
 *
 * Bulk-fetch variant lives in `countUnlocksByProject` below — use
 * that when you have a list of project ids (one query vs N).
 */
export async function countUnlocksForProject(projectId: string): Promise<number> {
  return db.$count(unlocks, eq(unlocks.projectId, projectId));
}

/**
 * Bulk version — one query for a batch of project ids. Returns a
 * Map(projectId → count). Projects with zero unlocks are NOT in the
 * map; callers should treat absence as zero.
 */
export async function countUnlocksByProject(
  projectIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (projectIds.length === 0) return result;
  const rows = await db
    .select({
      projectId: unlocks.projectId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(unlocks)
    .where(inArray(unlocks.projectId, projectIds))
    .groupBy(unlocks.projectId);
  for (const r of rows) result.set(r.projectId, r.n);
  return result;
}

/**
 * One row per builder who has unlocked a project — the owner-facing
 * "who's interested" list. Capped at UNLOCK_CAP (3) per project, so the
 * per-builder verification lookup below is a tiny parallel fan-out, not
 * an N+1 risk.
 *
 * `slug` is only populated for `approved` builders (the public profile
 * at /b/<slug> 404s otherwise), so the UI can decide whether to link.
 */
export interface ProjectUnlockBuilder {
  builderId: string;
  companyName: string | null;
  name: string | null;
  /** Public-profile slug — null unless the builder is approved. */
  slug: string | null;
  initials: string;
  state: string | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  unlockedAt: Date;
  source: UnlockRow["source"];
}

function toInitials(name: string | null): string {
  return (name ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function listUnlocksForProject(
  projectId: string,
): Promise<ProjectUnlockBuilder[]> {
  const rows = await db
    .select({
      builderId: unlocks.builderId,
      source: unlocks.source,
      unlockedAt: unlocks.unlockedAt,
      name: users.name,
      companyName: builderProfiles.companyName,
      state: builderProfiles.businessState,
      slug: builderProfiles.slug,
      approvalStatus: builderProfiles.approvalStatus,
    })
    .from(unlocks)
    .innerJoin(users, eq(users.id, unlocks.builderId))
    .leftJoin(builderProfiles, eq(builderProfiles.userId, unlocks.builderId))
    .where(eq(unlocks.projectId, projectId))
    .orderBy(desc(unlocks.unlockedAt));
  if (rows.length === 0) return [];

  // Verification chips — at most UNLOCK_CAP builders, so a small parallel
  // fan-out is fine. A lookup failure degrades to "pending", never throws.
  const { hasFullVerificationForApproval } = await import(
    "@/modules/verification"
  );
  const verifications = await Promise.all(
    rows.map((r) =>
      hasFullVerificationForApproval(r.builderId).catch(() => ({
        abnVerified: false,
        anyLicenceVerified: false,
      })),
    ),
  );

  return rows.map((r, i) => ({
    builderId: r.builderId,
    companyName: r.companyName,
    name: r.name,
    slug: r.approvalStatus === "approved" ? r.slug : null,
    initials: toInitials(r.companyName ?? r.name),
    state: r.state,
    abnVerified: verifications[i]?.abnVerified ?? false,
    anyLicenceVerified: verifications[i]?.anyLicenceVerified ?? false,
    unlockedAt: r.unlockedAt,
    source: r.source,
  }));
}

// ── saved projects ───────────────────────────────────────────────────────

export async function saveProject(
  builderId: string,
  projectId: string,
): Promise<Result<{ id: string }>> {
  const [existing] = await db
    .select({ id: savedProjects.id })
    .from(savedProjects)
    .where(
      and(
        eq(savedProjects.builderId, builderId),
        eq(savedProjects.projectId, projectId),
      ),
    );
  if (existing) return ok({ id: existing.id });

  const [row] = await db
    .insert(savedProjects)
    .values({ builderId, projectId })
    .returning({ id: savedProjects.id });
  if (!row) return fail("internal", "Failed to save project.");
  return ok({ id: row.id });
}

export async function unsaveProject(
  builderId: string,
  projectId: string,
): Promise<Result<{ removed: boolean }>> {
  const res = await db
    .delete(savedProjects)
    .where(
      and(
        eq(savedProjects.builderId, builderId),
        eq(savedProjects.projectId, projectId),
      ),
    )
    .returning({ id: savedProjects.id });
  return ok({ removed: res.length > 0 });
}

export async function isSaved(
  builderId: string,
  projectId: string,
): Promise<boolean> {
  const [hit] = await db
    .select({ id: savedProjects.id })
    .from(savedProjects)
    .where(
      and(
        eq(savedProjects.builderId, builderId),
        eq(savedProjects.projectId, projectId),
      ),
    );
  return !!hit;
}

export async function listMySavedProjectIds(
  builderId: string,
): Promise<string[]> {
  const rows = await db
    .select({ projectId: savedProjects.projectId })
    .from(savedProjects)
    .where(eq(savedProjects.builderId, builderId))
    .orderBy(desc(savedProjects.savedAt));
  return rows.map((r) => r.projectId);
}

export async function countMySaved(builderId: string): Promise<number> {
  return db.$count(savedProjects, eq(savedProjects.builderId, builderId));
}
