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
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { checkCreditAvailable } from "@/modules/credits";
import {
  getOrCreateConversation,
  postUnlockSystemMessage,
} from "@/modules/messaging";

import { unlocks, savedProjects, type UnlockRow } from "./schema";

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

// ── unlocks ──────────────────────────────────────────────────────────────

/**
 * Idempotent: calling twice with the same builder+project is fine.
 * Returns the existing row in that case.
 *
 * The unlock flow now gates on Founding Builder Access (FBA):
 *
 *   - If the builder already has an unlock for this project → return
 *     it. (Idempotent.)
 *   - Else, if the caller passed a non-default source (e.g. "paid"
 *     after Stripe success in step 5b, or "admin" via admin override),
 *     trust that and write the row.
 *   - Else, default path: check the builder's FBA. If a credit is
 *     available, write the row with source="founding". If not, fail
 *     with `code: "payment_required"` — the UI surfaces the paid-
 *     unlock CTA (Stripe lands in step 5b).
 */
export async function unlockProject(
  builderId: string,
  projectId: string,
  options: { source?: UnlockRow["source"] } = {},
): Promise<Result<UnlockRow>> {
  // Already unlocked? Return the existing row.
  const [existing] = await db
    .select()
    .from(unlocks)
    .where(
      and(eq(unlocks.builderId, builderId), eq(unlocks.projectId, projectId)),
    );
  if (existing) return ok(existing);

  // Caller-forced source (e.g. Stripe webhook, admin override).
  if (options.source && options.source !== "free") {
    const [row] = await db
      .insert(unlocks)
      .values({ builderId, projectId, source: options.source })
      .returning();
    if (!row) return fail("internal", "Failed to record unlock.");
    await ensureConversationOnUnlock(builderId, projectId);
    return ok(row);
  }

  // Default: gate on FBA.
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

  const [row] = await db
    .insert(unlocks)
    .values({ builderId, projectId, source: "founding" })
    .returning();
  if (!row) return fail("internal", "Failed to record unlock.");
  await ensureConversationOnUnlock(builderId, projectId);
  return ok(row);
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
