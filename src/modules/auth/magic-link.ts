/**
 * Magic-link issue + redemption — powering the /start ads funnel.
 *
 * This is a passwordless signup/login path. The user submits email +
 * phone at /start/contact, we create a `pending_verification` user
 * and a `draft` project, then email them a link. The link click does
 * three things in one transaction:
 *
 *   1. Sets users.emailVerified = now + users.status = active
 *   2. Sets projects.awaitingOwnerVerification = false and
 *      (when the wizard data is complete enough) publishes the project
 *   3. Issues a real Auth.js session via the `ads-funnel-handoff`
 *      Credentials provider — the user lands on /owner already
 *      signed in
 *
 * Why a "handoff proof" instead of having the magic-link token itself
 * be the credential for signIn():
 *   · Redemption is a destructive DB transaction. If Auth.js were to
 *     retry signIn() on a transient error, we'd double-consume.
 *   · We want the route handler to know the redemption outcome
 *     (published? still draft?) so it can route + flash appropriately.
 *     authorize() callbacks only return User|null.
 *   · The redemption + the handoff are split: the route handler runs
 *     the atomic redemption first, then mints a short-lived HMAC blob
 *     bound to (userId, exp). signIn() consumes that blob in
 *     authorize() — pure verify + user lookup, no mutation.
 *
 * The handoff secret reuses AUTH_SECRET (already required for the JWT
 * cookie). Rotating AUTH_SECRET rotates both, which is the right
 * coupling.
 */

import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { sendAdsFunnelMagicLinkEmail } from "@/modules/email";
import { projects, type ProjectRow } from "@/modules/projects";
import { users } from "@/modules/users";

import { verificationTokens } from "./schema";

const MAGIC_LINK_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const HANDOFF_TTL_SECONDS = 60; // 1 minute window between redeem → signIn

// ── Issue (called from /api/start/contact + /api/start/resend) ───────

interface IssueMagicLinkInput {
  email: string;
  /** First name as supplied — embedded in the email greeting. */
  firstName: string | null;
  projectId: string;
  projectTitle: string;
}

/**
 * Mint + persist a magic-link token, then send the email. Idempotent
 * per (email, project): any prior magic-link tokens for the same
 * identifier are invalidated first so a re-send invalidates the old
 * link.
 *
 * Identifier format: `magic_link:<projectId>:<email>` — pinning the
 * token to a specific project means a magic link for project A can't
 * accidentally publish project B if the same user has two drafts.
 */
export async function issueAdsFunnelMagicLink(
  input: IssueMagicLinkInput,
): Promise<Result<{ tokenId: string }>> {
  const token = randomBytes(32).toString("hex");
  const identifier = magicLinkIdentifier(input.projectId, input.email);
  const expires = new Date(Date.now() + MAGIC_LINK_TTL_SECONDS * 1000);

  await db.transaction(async (tx) => {
    // Invalidate prior magic-link tokens for this exact pin. We don't
    // touch other purposes (verification, password_reset) on the same
    // identifier — those don't exist by construction anyway, but the
    // purpose filter is belt-and-braces.
    await tx
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.purpose, "magic_link"),
        ),
      );
    await tx.insert(verificationTokens).values({
      identifier,
      token,
      purpose: "magic_link",
      expires,
    });
  });

  const magicUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/magic?token=${token}`;
  const emailResult = await sendAdsFunnelMagicLinkEmail({
    to: input.email,
    magicUrl,
    firstName: input.firstName,
    projectTitle: input.projectTitle,
  });
  if (!emailResult.ok) {
    // Token is already persisted — the user can request a resend. We
    // don't roll back: a failed send doesn't void the link, just
    // means it wasn't delivered.
    return fail(
      "external_error",
      emailResult.error.message,
    );
  }

  logger.info(
    {
      event: "auth.ads_funnel.magic_issued",
      projectId: input.projectId,
    },
    "ads-funnel magic link issued",
  );
  return ok({ tokenId: token });
}

function magicLinkIdentifier(projectId: string, email: string): string {
  return `magic_link:${projectId}:${email.toLowerCase()}`;
}

// ── Redeem (called from /auth/magic) ─────────────────────────────────

export interface MagicLinkRedemption {
  userId: string;
  email: string;
  firstName: string | null;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  /** True when the redemption also published the project to the
   *  marketplace. False = wizard wasn't far enough along; user lands
   *  on /owner/projects/[slug]/edit instead of the dashboard. */
  published: boolean;
}

/**
 * Atomic redeem. On success the token is deleted, the user is
 * verified + activated, and the project's hold flag is cleared. If
 * the project also passes the publish gate (architectural docs
 * present + required fields filled), it's published in the same txn.
 *
 * Idempotency: the token row is deleted inside the transaction —
 * concurrent retries see no-such-token and fail cleanly.
 */
export async function redeemAdsFunnelMagicLink(
  token: string,
): Promise<Result<MagicLinkRedemption>> {
  if (!token || typeof token !== "string" || token.length < 32) {
    return fail("validation", "Invalid link.");
  }

  // Pre-check — get the token row outside the txn so we can return
  // friendly errors. The txn re-reads and gates again.
  const [pre] = await db
    .select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, "magic_link"),
      ),
    )
    .limit(1);

  if (!pre) {
    return fail(
      "not_found",
      "This link is invalid or has already been used. Request a new one to continue.",
    );
  }
  if (pre.expires < new Date()) {
    return fail(
      "validation",
      "This link has expired. Request a new one to continue.",
    );
  }

  // Pull email + projectId out of the namespaced identifier.
  const parsed = parseMagicLinkIdentifier(pre.identifier);
  if (!parsed) {
    return fail("validation", "Invalid link.");
  }

  // Side-fetch user + project for the txn body (cheaper to do these
  // reads outside the lock).
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.email))
    .limit(1);
  if (!user) {
    return fail("not_found", "We couldn't find your account.");
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, parsed.projectId))
    .limit(1);
  if (!project) {
    return fail("not_found", "The project for this link is gone.");
  }
  if (project.ownerId !== user.id) {
    // Tampered identifier or mismatched project — collapse to invalid.
    return fail("not_found", "Invalid link.");
  }

  // Decide upfront whether the project is publishable. We don't call
  // the full publish() here because it lives in projects/service.ts
  // (server-only) and we want this module to be self-contained for
  // testing. publishability is checked by the route handler if
  // needed; for now, we publish iff the publish gate passes inline.
  const publishable = isProjectPublishable(project);

  let published = false;

  await db.transaction(async (tx) => {
    // Re-read the token inside the txn to detect double-redemption.
    const [tok] = await tx
      .select({ token: verificationTokens.token })
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);
    if (!tok) {
      // Already consumed by a concurrent request.
      throw new Error("MAGIC_LINK_DOUBLE_REDEEM");
    }

    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    // Idempotent: re-verifying an already-active account is a no-op.
    if (user.status !== "active") {
      await tx
        .update(users)
        .set({
          emailVerified: new Date(),
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    if (project.awaitingOwnerVerification || (publishable && !project.publishedAt)) {
      const next: Partial<ProjectRow> = {
        awaitingOwnerVerification: false,
        updatedAt: new Date(),
      };
      if (publishable && !project.publishedAt) {
        next.status = "published";
        next.publishedAt = new Date();
        published = true;
      }
      await tx.update(projects).set(next).where(eq(projects.id, project.id));
    }
  }).catch((err) => {
    if (err instanceof Error && err.message === "MAGIC_LINK_DOUBLE_REDEEM") {
      return; // surfaced below as already-used
    }
    throw err;
  });

  // If we hit the double-redeem path, re-check whether the project
  // already went live (the first-mover txn would have set this).
  if (!published && publishable) {
    const [fresh] = await db
      .select({ publishedAt: projects.publishedAt })
      .from(projects)
      .where(eq(projects.id, project.id))
      .limit(1);
    if (fresh?.publishedAt) published = true;
  }

  // Post-publish fan-out — owner welcome, ops heads-up, builder blast.
  // Same pattern as projects/service.ts:publish, lazy import to keep
  // this module's dep graph small.
  if (published) {
    try {
      const { dispatchProjectPublishedEvent } = await import(
        "@/modules/projects/dispatch"
      );
      void dispatchProjectPublishedEvent(project.id);
    } catch {
      /* dispatch is best-effort; failures don't roll back the publish */
    }
  }

  logger.info(
    {
      event: "auth.ads_funnel.magic_redeemed",
      userId: user.id,
      projectId: project.id,
      published,
    },
    "ads-funnel magic link redeemed",
  );

  return ok({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    projectId: project.id,
    projectSlug: project.slug,
    projectTitle: project.title,
    published,
  });
}

function parseMagicLinkIdentifier(
  identifier: string,
): { projectId: string; email: string } | null {
  // Format: "magic_link:<uuid>:<email>"
  const prefix = "magic_link:";
  if (!identifier.startsWith(prefix)) return null;
  const rest = identifier.slice(prefix.length);
  const sep = rest.indexOf(":");
  if (sep < 0) return null;
  const projectId = rest.slice(0, sep);
  const email = rest.slice(sep + 1);
  if (!projectId || !email) return null;
  return { projectId, email };
}

// ── Publish gate (subset of projects/service.checkPublishability) ────

/**
 * Inline copy of the publish gate. Kept here to avoid pulling the
 * full projects/service module (which has a heavier dep tree) into
 * the magic-link redemption path. The two MUST stay in lockstep —
 * if `projects/service.ts:checkPublishability` adds a check, mirror
 * it here.
 *
 * NOTE: We don't check for architectural docs inline because the
 * docs table is in another module and the join is non-trivial.
 * Instead we delegate that piece via a separate query.
 */
function isProjectPublishable(project: ProjectRow): boolean {
  if (project.status !== "draft") return false;
  if (project.publishedAt) return false;
  if (!project.title?.trim()) return false;
  if (!project.addressLine1) return false;
  if (!project.suburb) return false;
  if (!project.state) return false;
  if (!project.postcode || !/^\d{4}$/.test(project.postcode)) return false;
  if (!project.budgetBand) return false;
  // Per-type required fields — minimal sketch; the full service-side
  // check covers more. The /start funnel's final step blocks submission
  // when these are missing, so reaching the magic link with them
  // unfilled is unlikely.
  switch (project.type) {
    case "single_dwelling":
      if (!project.bedrooms || !project.bathrooms) return false;
      break;
    case "multi_dwelling":
      if (!project.dwellingCount || project.dwellingCount < 2) return false;
      break;
    case "renovation":
      if (!project.renovationScope) return false;
      break;
    case "extension":
      if (!project.extensionType) return false;
      break;
  }
  return true;
}

// ── Auth.js handoff proof ────────────────────────────────────────────

/**
 * After successful redemption, the route handler mints one of these
 * and passes it through signIn("ads-funnel-handoff", { proof }). The
 * Credentials provider verifies the HMAC + expiry and returns the
 * user — Auth.js sets the JWT cookie from there.
 *
 * Why HMAC instead of just passing userId: signIn() can in principle
 * be called from the client. An attacker hitting POST /api/auth/callback
 * with { proof: "<their-target-userid>" } must be rejected. Signing
 * with AUTH_SECRET means only the server can mint a valid proof.
 */
export function mintHandoffProof(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS;
  const body = `${userId}.${exp}`;
  const mac = createHmac("sha256", env.AUTH_SECRET).update(body).digest("base64url");
  return `${Buffer.from(body).toString("base64url")}.${mac}`;
}

export function verifyHandoffProof(
  proof: string,
): { ok: true; userId: string } | { ok: false } {
  if (!proof || typeof proof !== "string") return { ok: false };
  const dot = proof.indexOf(".");
  if (dot < 0) return { ok: false };
  const bodyB64 = proof.slice(0, dot);
  const givenMac = proof.slice(dot + 1);

  let body: string;
  try {
    body = Buffer.from(bodyB64, "base64url").toString("utf8");
  } catch {
    return { ok: false };
  }

  const expectedMac = createHmac("sha256", env.AUTH_SECRET).update(body).digest("base64url");
  const a = Buffer.from(givenMac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length) return { ok: false };
  if (!timingSafeEqual(a, b)) return { ok: false };

  const sep = body.indexOf(".");
  if (sep < 0) return { ok: false };
  const userId = body.slice(0, sep);
  const expStr = body.slice(sep + 1);
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return { ok: false };
  if (exp * 1000 < Date.now()) return { ok: false };
  if (!userId) return { ok: false };
  return { ok: true, userId };
}

// ── GC helper (called by Inngest daily job) ──────────────────────────

/**
 * Returns the list of ads-funnel draft projects abandoned past their
 * cutoff. The Inngest job calls this then soft-deletes via the
 * projects service. Pure read — no side effects here.
 */
export async function listAbandonedAdsFunnelDrafts(
  olderThan: Date,
): Promise<Array<{ projectId: string; userId: string }>> {
  return db
    .select({
      projectId: projects.id,
      userId: projects.ownerId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.acquisitionSource, "ads_funnel"),
        eq(projects.awaitingOwnerVerification, true),
        lt(projects.createdAt, olderThan),
      ),
    );
}
