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
import { fail, ok, type Result } from "@/lib/result";

import { unlocks, savedProjects, type UnlockRow } from "./schema";

// ── unlocks ──────────────────────────────────────────────────────────────

/**
 * Idempotent: calling twice with the same builder+project is fine.
 * Returns the row either way.
 *
 * Source defaults to "free" — step 5 will pass through founding /
 * paid / admin once Stripe + credits exist.
 */
export async function unlockProject(
  builderId: string,
  projectId: string,
  source: UnlockRow["source"] = "free",
): Promise<Result<UnlockRow>> {
  // Already unlocked?
  const [existing] = await db
    .select()
    .from(unlocks)
    .where(and(eq(unlocks.builderId, builderId), eq(unlocks.projectId, projectId)));
  if (existing) return ok(existing);

  const [row] = await db
    .insert(unlocks)
    .values({ builderId, projectId, source })
    .returning();
  if (!row) return fail("internal", "Failed to record unlock.");
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
