/**
 * wallet · service layer.
 *
 * Account credit in whole Australian dollars.
 *
 *   balanceFor()        — what a builder can spend, derived from the ledger
 *   grantCredit()       — issue value, with an expiry and a reason
 *   unlockWithCredits() — spend it, atomically with the unlock itself
 *   acknowledgeGrants() — the builder has read the announcement
 *
 * THE INVARIANT. A builder must never hold an unlock the ledger did
 * not pay for, and must never be debited for an unlock they did not
 * get. Both halves commit in ONE transaction: the debit runs inside
 * `unlockProject`'s insert via its `fundWithin` hook, under the same
 * row lock that enforces the spot cap. Anything that throws in there
 * rolls back the unlock too.
 *
 * Balance is never stored. It is:
 *   SUM(grant.amount_aud) - SUM(redemption.amount_aud)
 * over grants that are neither revoked nor past expiry. A stored
 * balance is one lost update away from giving away unlocks nobody
 * funded, and it cannot be audited afterwards.
 */

import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import { getMarketplacePreview, unlockPriceFor } from "@/modules/projects";
import {
  checkUnlockEligibility,
  isUnlocked,
  unlockProject,
  UNLOCK_CAP,
  type UnlockTx,
} from "@/modules/unlocks";
import { projects } from "@/modules/projects/schema";

import { creditGrants, creditRedemptions } from "./schema";
import {
  CREDIT_TERM_MONTHS,
  type CreditBalance,
  type CreditGrantView,
  type CreditRedemptionView,
} from "./types";

/** A grant counts toward the balance only while both of these hold. */
const liveGrant = (alias = "credit_grants") =>
  sql.raw(`${alias}.revoked_at is null and ${alias}.expires_at > now()`);

// ── reading ─────────────────────────────────────────────────────────

/**
 * Everything the credits surfaces need, in one read.
 *
 * Returns a zeroed balance for a builder who has never been granted
 * anything, rather than null: the settings section renders the same
 * way for everyone, and only the numbers differ.
 */
export async function balanceFor(builderId: string): Promise<CreditBalance> {
  // Two plain queries rather than one correlated subquery. A
  // `sql` template interpolating ${creditGrants.id} renders as bare
  // "id", which inside a subquery over credit_redemptions binds to
  // THAT table's own id: the comparison is then always false, every
  // grant reads as unspent, and the platform gives unlocks away. The
  // join is spelled out below where the column cannot be mistaken.
  const grantRows = await db
    .select()
    .from(creditGrants)
    .where(eq(creditGrants.builderId, builderId))
    .orderBy(asc(creditGrants.expiresAt));

  const spentRows = await db
    .select({
      grantId: creditRedemptions.grantId,
      spentAud: sql<number>`sum(${creditRedemptions.amountAud})`.mapWith(Number),
    })
    .from(creditRedemptions)
    .where(eq(creditRedemptions.builderId, builderId))
    .groupBy(creditRedemptions.grantId);
  const spentByGrant = new Map(spentRows.map((r) => [r.grantId, r.spentAud]));

  const now = new Date();
  const grants: CreditGrantView[] = grantRows.map((g) => ({
    id: g.id,
    amountAud: g.amountAud,
    remainingAud: Math.max(0, g.amountAud - (spentByGrant.get(g.id) ?? 0)),
    reason: g.reason,
    note: g.note,
    grantedAt: g.grantedAt,
    expiresAt: g.expiresAt,
    acknowledgedAt: g.acknowledgedAt,
    live: g.revokedAt === null && g.expiresAt > now,
  }));

  const redemptionRows = await db
    .select({
      id: creditRedemptions.id,
      amountAud: creditRedemptions.amountAud,
      createdAt: creditRedemptions.createdAt,
      projectTitle: projects.title,
      projectSlug: projects.slug,
    })
    .from(creditRedemptions)
    .leftJoin(projects, eq(projects.id, creditRedemptions.projectId))
    .where(eq(creditRedemptions.builderId, builderId))
    .orderBy(desc(creditRedemptions.createdAt))
    .limit(50);

  const liveGrants = grants.filter((g) => g.live);
  const availableAud = liveGrants.reduce((n, g) => n + g.remainingAud, 0);
  const withValue = liveGrants.filter((g) => g.remainingAud > 0);

  return {
    availableAud,
    grantedAud: grants.reduce((n, g) => n + g.amountAud, 0),
    spentAud: grants.reduce((n, g) => n + (g.amountAud - g.remainingAud), 0),
    expiringAud: availableAud,
    nextExpiryAt: withValue.length > 0 ? withValue[0]!.expiresAt : null,
    grants,
    redemptions: redemptionRows.map(
      (r): CreditRedemptionView => ({
        id: r.id,
        amountAud: r.amountAud,
        projectTitle: r.projectTitle,
        projectSlug: r.projectSlug,
        createdAt: r.createdAt,
      }),
    ),
  };
}

/**
 * Live grants this builder has not yet been shown. Drives the
 * dashboard announcement, and is the whole reason the feature is
 * replicable: grant credit to anyone and their card appears.
 */
export async function unacknowledgedGrantsFor(
  builderId: string,
): Promise<CreditGrantView[]> {
  const rows = await db
    .select()
    .from(creditGrants)
    .where(
      and(
        eq(creditGrants.builderId, builderId),
        isNull(creditGrants.acknowledgedAt),
        isNull(creditGrants.revokedAt),
        sql`${creditGrants.expiresAt} > now()`,
      ),
    )
    .orderBy(asc(creditGrants.grantedAt));

  return rows.map((g) => ({
    id: g.id,
    amountAud: g.amountAud,
    remainingAud: g.amountAud,
    reason: g.reason,
    note: g.note,
    grantedAt: g.grantedAt,
    expiresAt: g.expiresAt,
    acknowledgedAt: null,
    live: true,
  }));
}

/** The builder has read the announcement. Idempotent. */
export async function acknowledgeGrants(
  builderId: string,
): Promise<Result<{ acknowledged: number }>> {
  const rows = await db
    .update(creditGrants)
    .set({ acknowledgedAt: new Date() })
    .where(
      and(
        eq(creditGrants.builderId, builderId),
        isNull(creditGrants.acknowledgedAt),
      ),
    )
    .returning({ id: creditGrants.id });
  return ok({ acknowledged: rows.length });
}

// ── issuing ─────────────────────────────────────────────────────────

export interface GrantCreditInput {
  builderId: string;
  amountAud: number;
  reason: string;
  note?: string | null;
  /** Defaults to CREDIT_TERM_MONTHS from now. */
  expiresAt?: Date;
  grantedBy?: string | null;
}

/**
 * Issue credit. Deliberately has no authorisation of its own: it is
 * called from admin tooling and scripts that have already established
 * who is asking.
 */
export async function grantCredit(
  input: GrantCreditInput,
): Promise<Result<{ id: string; expiresAt: Date }>> {
  if (!Number.isInteger(input.amountAud) || input.amountAud <= 0) {
    return fail("validation", "A credit needs a whole-dollar amount above zero.");
  }
  const expiresAt = input.expiresAt ?? monthsFromNow(CREDIT_TERM_MONTHS);
  if (expiresAt <= new Date()) {
    return fail("validation", "A credit cannot expire in the past.");
  }

  const [row] = await db
    .insert(creditGrants)
    .values({
      builderId: input.builderId,
      amountAud: input.amountAud,
      reason: input.reason,
      note: input.note ?? null,
      grantedBy: input.grantedBy ?? null,
      expiresAt,
    })
    .returning({ id: creditGrants.id, expiresAt: creditGrants.expiresAt });

  if (!row) return fail("internal", "Could not record the credit.");
  logger.info(
    {
      event: "wallet.granted",
      builderId: input.builderId,
      amountAud: input.amountAud,
      reason: input.reason,
    },
    "credit granted",
  );
  return ok(row);
}

/** Six months from now, to the day. */
export function monthsFromNow(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

// ── spending ────────────────────────────────────────────────────────

export interface UnlockWithCreditsResult {
  projectSlug: string;
  spentAud: number;
  remainingAud: number;
}

/**
 * Unlock a project using credit alone.
 *
 * Credit funds the WHOLE unlock or none of it. Part-credit with a card
 * top-up would mean holding a Stripe authorisation open across a
 * ledger write, and the failure modes of that are not worth the
 * convenience while every unlock is under $200.
 */
export async function unlockWithCredits(args: {
  builderId: string;
  slug: string;
}): Promise<Result<UnlockWithCreditsResult>> {
  const { builderId, slug } = args;

  const preview = await getMarketplacePreview(slug);
  if (!preview.ok) return fail("not_found", "Project not found.");
  const project = preview.value;

  // The same gates the paid path runs, in the same order.
  const eligibility = await checkUnlockEligibility(builderId);
  if (!eligibility.ok) return eligibility;

  if (await isUnlocked(builderId, project.id)) {
    const after = await balanceFor(builderId);
    return ok({
      projectSlug: project.slug,
      spentAud: 0,
      remainingAud: after.availableAud,
    });
  }

  if (project.unlockedCount >= (project.tenderSpots ?? UNLOCK_CAP)) {
    return fail("rate_limited", "This project is full, all spots are taken.", {
      reason: "project_full",
    });
  }

  const priceAud = unlockPriceFor(project.type);

  // Cheap pre-check for a clear message. The authoritative check is
  // the locked one inside the transaction below.
  const before = await balanceFor(builderId);
  if (before.availableAud < priceAud) {
    return fail(
      "validation",
      `This unlock is $${priceAud} and your credit balance is $${before.availableAud}.`,
      { reason: "insufficient_credit" },
    );
  }

  const granted = await unlockProject(builderId, project.id, {
    source: "credit",
    fundWithin: (tx, unlock) =>
      debitWithin(tx, {
        builderId,
        amountAud: priceAud,
        projectId: project.id,
        unlockId: unlock.id,
      }),
  });
  if (!granted.ok) return granted;

  const after = await balanceFor(builderId);
  logger.info(
    {
      event: "wallet.unlock",
      builderId,
      projectId: project.id,
      spentAud: priceAud,
      remainingAud: after.availableAud,
    },
    "unlock funded by credit",
  );
  return ok({
    projectSlug: project.slug,
    spentAud: priceAud,
    remainingAud: after.availableAud,
  });
}

/**
 * Take `amountAud` off the builder's live grants, soonest-expiring
 * first, and write one redemption row per grant drawn on.
 *
 * Runs inside the unlock transaction. THROWS rather than returning a
 * Result, because a throw is what rolls the unlock back: returning an
 * error here would leave the builder holding an unfunded unlock.
 *
 * The SELECT takes FOR UPDATE on every live grant, so two unlocks
 * racing on one balance serialise instead of both reading the same
 * available figure and both succeeding.
 */
async function debitWithin(
  tx: UnlockTx,
  args: {
    builderId: string;
    amountAud: number;
    projectId: string;
    unlockId: string;
  },
): Promise<void> {
  const { builderId, amountAud, projectId, unlockId } = args;

  // TWO statements, and the order matters more than it looks.
  //
  // Postgres runs this transaction at READ COMMITTED. When a
  // `SELECT ... FOR UPDATE` blocks on a row another transaction holds,
  // it re-reads THAT ROW at the latest version once the lock frees,
  // but the rest of the statement keeps the snapshot it started with.
  // A sum of redemptions computed inside this same statement would
  // therefore be the sum from BEFORE the transaction we just waited
  // for committed: both callers read the balance as untouched, and
  // both spend it. That is a real double-spend, and it cost $298 of
  // unlocks against $199 of credit the first time this was written.
  //
  // So: take the locks first, carrying nothing but the grant rows.
  const locked = await tx.execute(sql`
    select g.id, g.amount_aud
      from credit_grants g
     where g.builder_id = ${builderId}
       and g.revoked_at is null
       and g.expires_at > now()
     order by g.expires_at asc, g.id asc
       for update
  `);

  const grantRows = (locked.rows ?? locked) as Array<{
    id: string;
    amount_aud: number;
  }>;

  // Then, as a SEPARATE statement, read what has been spent. Every
  // statement in READ COMMITTED takes a fresh snapshot, so this one
  // sees every redemption committed by whoever held the lock before us.
  const spentQ = await tx.execute(sql`
    select grant_id, sum(amount_aud)::int as spent_aud
      from credit_redemptions
     where builder_id = ${builderId}
     group by grant_id
  `);
  const spentByGrant = new Map(
    ((spentQ.rows ?? spentQ) as Array<{ grant_id: string; spent_aud: number }>).map(
      (r) => [r.grant_id, Number(r.spent_aud)],
    ),
  );

  const rows = grantRows.map((g) => ({
    id: g.id,
    amount_aud: g.amount_aud,
    spent_aud: spentByGrant.get(g.id) ?? 0,
  }));

  let owing = amountAud;
  const draws: Array<{ grantId: string; take: number }> = [];
  for (const r of rows) {
    if (owing <= 0) break;
    const remaining = Number(r.amount_aud) - Number(r.spent_aud);
    if (remaining <= 0) continue;
    const take = Math.min(remaining, owing);
    draws.push({ grantId: r.id, take });
    owing -= take;
  }

  if (owing > 0) {
    // Read under lock, so this is the truth and not a stale figure.
    throw new Error(
      `This unlock is $${amountAud} and your credit balance is $${amountAud - owing}.`,
    );
  }

  await tx.insert(creditRedemptions).values(
    draws.map((d) => ({
      grantId: d.grantId,
      builderId,
      amountAud: d.take,
      projectId,
      unlockId,
    })),
  );
}
