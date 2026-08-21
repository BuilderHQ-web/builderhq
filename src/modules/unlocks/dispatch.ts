/**
 * unlocks · dispatch.
 *
 * When a builder unlocks a project, we want:
 *
 *   1. owner email + bell entry — "Builder X unlocked your project"
 *   2. builder receipt email — useful as a reference doc with address
 *      + owner contact
 *   3. ops heads-up to info@
 *
 * Same shape as the tenders / projects dispatch helpers — Promise.all
 * Settled, try/catch the entire call so a flaky email never undoes
 * the unlock the user just paid for.
 */

import "server-only";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { unlocks } from "./schema";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users/schema";
import { builderProfiles, projectOwnerProfiles } from "@/modules/profiles/schema";

import { create as createNotification, enqueueEmails } from "@/modules/notifications";
import { OPS_EMAIL } from "@/modules/email";

interface DispatchContext {
  unlock: { source: string; unlockedAt: Date };
  project: {
    id: string;
    slug: string;
    title: string;
    addressLine1: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
  };
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    name: string | null;
    phone: string | null;
  };
  builder: {
    id: string;
    email: string;
    firstName: string | null;
    company: string;
    state: string | null;
    slug: string | null;
    abnVerified: boolean;
    anyLicenceVerified: boolean;
  };
}

/**
 * Public entrypoint. Caller awaits in a try/catch but failure here
 * never propagates — internal try/catch wraps the whole flow.
 */
export async function dispatchUnlockEvent(input: {
  builderId: string;
  projectId: string;
}): Promise<void> {
  try {
    const ctx = await gatherContext(input.builderId, input.projectId);
    if (!ctx) {
      logger.warn(
        { event: "unlock.dispatch.no_context", ...input },
        "unlock dispatch — no context",
      );
      return;
    }

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const ownerProjectUrl = `${base}/owner/projects/${ctx.project.slug}`;
    const projectAddress =
      [
        ctx.project.addressLine1,
        ctx.project.suburb,
        ctx.project.state,
        ctx.project.postcode,
      ]
        .filter(Boolean)
        .join(", ") || null;

    // Owner gets an instant in-app bell; the three emails go through the
    // durable notification_outbox so a transient Resend failure is retried
    // and recorded (resend_id / last_error) instead of being silently
    // swallowed by Promise.allSettled — which is exactly what dropped an
    // owner unlock email before. The Vercel cron drainer renders + sends.
    //
    // builderId is encoded into each `kind` because the outbox dedups on
    // (kind, to_email, project_id): the owner and ops recipients are the
    // SAME address for every builder, so without the builder in the key a
    // 2nd or 3rd builder unlocking the same project would be deduped away
    // and the owner/ops would never be told. Re-dispatching the SAME unlock
    // still dedups correctly (same builder → same kind).
    const bid = ctx.builder.id;
    await Promise.allSettled([
      createNotification({
        userId: ctx.owner.id,
        kind: "project_unlocked",
        projectId: ctx.project.id,
        title: `${ctx.builder.company} unlocked ${ctx.project.title}`,
        body: "They now have your address, contact, and documents.",
        actionUrl: ownerProjectUrl,
      }),
      enqueueEmails([
        {
          kind: `unlock_owner:${bid}`,
          toEmail: ctx.owner.email,
          userId: ctx.owner.id,
          projectId: ctx.project.id,
          payload: {
            ownerFirstName: ctx.owner.firstName,
            builderCompany: ctx.builder.company,
            builderState: ctx.builder.state,
            abnVerified: ctx.builder.abnVerified,
            anyLicenceVerified: ctx.builder.anyLicenceVerified,
            projectTitle: ctx.project.title,
            projectSlug: ctx.project.slug,
            builderSlug: ctx.builder.slug,
          },
        },
        {
          kind: `unlock_builder:${bid}`,
          toEmail: ctx.builder.email,
          userId: ctx.builder.id,
          projectId: ctx.project.id,
          payload: {
            builderFirstName: ctx.builder.firstName,
            projectTitle: ctx.project.title,
            projectAddress,
            ownerName: ctx.owner.name,
            ownerEmail: ctx.owner.email,
            ownerPhone: ctx.owner.phone,
            projectSlug: ctx.project.slug,
            unlockedViaFba: ctx.unlock.source === "founding",
          },
        },
        {
          kind: `unlock_ops:${bid}`,
          toEmail: OPS_EMAIL,
          userId: null,
          projectId: ctx.project.id,
          payload: {
            projectTitle: ctx.project.title,
            projectSlug: ctx.project.slug,
            builderCompany: ctx.builder.company,
            builderEmail: ctx.builder.email,
            ownerName: ctx.owner.name,
            ownerEmail: ctx.owner.email,
            source: ctx.unlock.source,
            unlockedAt: ctx.unlock.unlockedAt.toISOString(),
          },
        },
      ]),
    ]);

    logger.info(
      { event: "unlock.dispatch.ok", ...input },
      "unlock dispatch complete",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "unlock.dispatch.failed", ...input, msg },
      "unlock dispatch failed — continuing",
    );
  }
}

/**
 * The deferred half of a pre-assigned round.
 *
 * A concierge round is sometimes filled before it is published: unlock
 * rows are inserted while the project is still a draft, silently, so
 * the builders hear nothing about a project they cannot yet open. This
 * sends the builder half of the unlock dispatch for every unlock on
 * the project, and ONLY the builder half. The owner is deliberately
 * not told here: on a pre-assigned round the owner is briefed by the
 * concierge, not by three "builder unlocked your project" emails
 * arriving in the same minute their round goes live.
 *
 * Called from the project_published dispatch, which runs once per
 * publish. Safe to call again anyway: the outbox dedupes on
 * (kind, email, project), and the kind here is the same one the
 * organic unlock dispatch uses, so a builder can never receive the
 * unlock email twice whichever path fires first.
 */
export async function dispatchDeferredUnlockBuilderEmails(
  projectId: string,
): Promise<number> {
  try {
    const rows = await db
      .select({ builderId: unlocks.builderId })
      .from(unlocks)
      .where(eq(unlocks.projectId, projectId));
    if (rows.length === 0) return 0;

    let sent = 0;
    for (const { builderId } of rows) {
      const ctx = await gatherContext(builderId, projectId);
      if (!ctx) {
        logger.warn(
          { event: "unlock.deferred.no_context", projectId, builderId },
          "deferred unlock email — no context",
        );
        continue;
      }
      const projectAddress =
        [
          ctx.project.addressLine1,
          ctx.project.suburb,
          ctx.project.state,
          ctx.project.postcode,
        ]
          .filter(Boolean)
          .join(", ") || null;

      await enqueueEmails([
        {
          kind: `unlock_builder:${ctx.builder.id}`,
          toEmail: ctx.builder.email,
          userId: ctx.builder.id,
          projectId: ctx.project.id,
          payload: {
            builderFirstName: ctx.builder.firstName,
            projectTitle: ctx.project.title,
            projectAddress,
            ownerName: ctx.owner.name,
            ownerEmail: ctx.owner.email,
            ownerPhone: ctx.owner.phone,
            projectSlug: ctx.project.slug,
            unlockedViaFba: ctx.unlock.source === "founding",
          },
        },
      ]);
      sent += 1;
    }
    logger.info(
      { event: "unlock.deferred.enqueued", projectId, sent },
      "deferred unlock builder emails enqueued",
    );
    return sent;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "unlock.deferred.failed", projectId, msg },
      "deferred unlock dispatch failed — continuing",
    );
    return 0;
  }
}

async function gatherContext(
  builderId: string,
  projectId: string,
): Promise<DispatchContext | null> {
  const ownerUsers = alias(users, "owner_users");
  const builderUsers = alias(users, "builder_users");

  const [row] = await db
    .select({
      // unlock
      unlockSource: unlocks.source,
      unlockedAt: unlocks.unlockedAt,
      // project
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectAddressLine1: projects.addressLine1,
      projectSuburb: projects.suburb,
      projectState: projects.state,
      projectPostcode: projects.postcode,
      // owner
      ownerId: ownerUsers.id,
      ownerEmail: ownerUsers.email,
      ownerName: ownerUsers.name,
      ownerPhone: ownerUsers.phone,
      // owner profile (unused now, but cheap to fetch — handy if we
      // ever want to add owner company name to the email later)
      ownerCompany: projectOwnerProfiles.companyName,
      // builder user
      builderId: builderUsers.id,
      builderEmail: builderUsers.email,
      builderName: builderUsers.name,
      // builder profile
      builderCompany: builderProfiles.companyName,
      builderState: builderProfiles.businessState,
      builderSlug: builderProfiles.slug,
      builderApprovalStatus: builderProfiles.approvalStatus,
    })
    .from(unlocks)
    .innerJoin(projects, eq(projects.id, unlocks.projectId))
    .innerJoin(ownerUsers, eq(ownerUsers.id, projects.ownerId))
    .leftJoin(
      projectOwnerProfiles,
      eq(projectOwnerProfiles.userId, projects.ownerId),
    )
    .innerJoin(builderUsers, eq(builderUsers.id, unlocks.builderId))
    .leftJoin(builderProfiles, eq(builderProfiles.userId, unlocks.builderId))
    .where(
      // Scope by BOTH builder AND project. The unique index guarantees at
      // most one row. (Previously this filtered by builderId alone with
      // limit(1) — so for a builder who'd unlocked more than one project,
      // it could fetch the WRONG project's unlock row, fail the projectId
      // check below, and silently drop the entire notification set:
      // owner email + bell, builder receipt, and the ops email.)
      and(
        eq(unlocks.builderId, builderId),
        eq(unlocks.projectId, projectId),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Verification chips — pull from the verification module via dynamic
  // import to keep this dispatch file's static graph small. Failures
  // are non-fatal; we just send pending chips.
  let abnVerified = false;
  let anyLicenceVerified = false;
  try {
    const { hasFullVerificationForApproval } = await import(
      "@/modules/verification"
    );
    const v = await hasFullVerificationForApproval(builderId);
    abnVerified = v.abnVerified;
    anyLicenceVerified = v.anyLicenceVerified;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      { event: "unlock.dispatch.verification_lookup_failed", msg },
      "couldn't load verification chips for unlock email — falling back",
    );
  }

  const firstFromName = (n: string | null) =>
    n ? (n.split(" ")[0] ?? null) : null;

  return {
    unlock: {
      source: row.unlockSource,
      unlockedAt: row.unlockedAt,
    },
    project: {
      id: row.projectId,
      slug: row.projectSlug,
      title: row.projectTitle,
      addressLine1: row.projectAddressLine1,
      suburb: row.projectSuburb,
      state: row.projectState,
      postcode: row.projectPostcode,
    },
    owner: {
      id: row.ownerId,
      email: row.ownerEmail,
      firstName: firstFromName(row.ownerName),
      name: row.ownerName,
      phone: row.ownerPhone,
    },
    builder: {
      id: row.builderId,
      email: row.builderEmail,
      firstName: firstFromName(row.builderName),
      company:
        row.builderCompany ?? row.builderName ?? "A builder on BuilderHQ",
      state: row.builderState,
      slug:
        row.builderApprovalStatus === "approved" ? row.builderSlug : null,
      abnVerified,
      anyLicenceVerified,
    },
  };
}
