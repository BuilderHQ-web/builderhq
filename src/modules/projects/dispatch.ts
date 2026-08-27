/**
 * projects · dispatch.
 *
 * Fan-out helper for project lifecycle events. Currently handles:
 *
 *   project_published — when a draft flips to live, we:
 *     1. confirm to the owner
 *     2. heads-up to ops (info@)
 *     3. fan out to every builder whose marketing_emails_enabled flag
 *        is on, with an "in your service area" hint when their service
 *        areas overlap the project's state+suburb (or radius-statewide).
 *
 * Same shape as `tenders/dispatch.ts` — Promise.allSettled per recipient,
 * idempotency via the partial unique index on `notifications`, and the
 * whole call wrapped in try/catch so a flaky email never undoes a
 * publish.
 *
 * The builder fan-out is fire-and-forget from the publish action's
 * perspective: caller does `void dispatchProjectPublishedEvent(...)`,
 * the publish returns to the user immediately, and the bulk send
 * runs in the background.
 *
 * When this codebase grows an Inngest pipeline (Phase 4+), the bulk
 * fan-out moves into a job that respects retries + backoff. For now
 * this is a straight Promise.allSettled with rate-limit-aware
 * batching.
 */

import "server-only";
import { and, eq, ne, isNull, count, inArray, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { projects, projectParticipants } from "./schema";
import {
  PARTICIPANT_ROLE_LABEL,
  PARTICIPANT_INVITE_VALIDITY_DAYS,
} from "./participants";
import { tenderBuilderInvites } from "@/modules/tenders/schema";
import { unlocks } from "@/modules/unlocks";
import { documents } from "@/modules/documents/schema";
import { users } from "@/modules/users/schema";
import {
  architectProfiles,
  builderProfiles,
  builderServiceAreas,
  projectOwnerProfiles,
} from "@/modules/profiles/schema";

import {
  createMany as createNotificationsMany,
  enqueueEmails,
} from "@/modules/notifications";
import {
  sendProjectPublishedOwnerEmail,
  sendProjectPublishedOpsEmail,
  sendParticipantInviteEmail,
  sendParticipantJoinedEmail,
} from "@/modules/email";
import { recordProjectEvent } from "./audit";
import { PARTICIPANT_ROLE_LABEL as ROLE_LABEL_FOR_JOIN } from "./participants";

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

const BUDGET_LABEL: Record<string, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k–$1M",
  "1m_1_5m": "$1M–$1.5M",
  "1_5m_2m": "$1.5M–$2M",
  "2m_3m": "$2M–$3M",
  "3m_5m": "$3M–$5M",
  over_5m: "Over $5M",
};

// The builder fan-out no longer sends inline — it enqueues to the
// notification_outbox and the Vercel cron drains it. See fanOutToBuilders.

/**
 * Public entrypoint. Fire-and-forget from the publish action — caller
 * uses `void dispatchProjectPublishedEvent(projectId)` so the action
 * returns to the user without waiting on the bulk send.
 */
export async function dispatchProjectPublishedEvent(
  projectId: string,
): Promise<void> {
  try {
    const ctx = await gatherContext(projectId);
    if (!ctx) {
      logger.warn(
        { event: "project.dispatch.no_context", projectId },
        "project dispatch — no context",
      );
      return;
    }

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const ownerManageUrl = `${base}/owner/projects/${ctx.project.slug}`;
    const builderUrl = `${base}/builder/projects/${ctx.project.slug}`;

    // 1. Owner confirmation + ops heads-up — parallel, both transactional.
    await Promise.allSettled([
      sendProjectPublishedOwnerEmail({
        to: ctx.owner.email,
        ownerFirstName: ctx.owner.firstName,
        projectTitle: ctx.project.title,
        projectType: TYPE_LABEL[ctx.project.type] ?? ctx.project.type,
        suburb: ctx.project.suburb,
        state: ctx.project.state,
        budgetBand: ctx.project.budgetBand
          ? BUDGET_LABEL[ctx.project.budgetBand] ?? ctx.project.budgetBand
          : null,
        manageUrl: ownerManageUrl,
      }),
      sendProjectPublishedOpsEmail({
        projectTitle: ctx.project.title,
        projectType: TYPE_LABEL[ctx.project.type] ?? ctx.project.type,
        suburb: ctx.project.suburb,
        state: ctx.project.state,
        budgetBand: ctx.project.budgetBand
          ? BUDGET_LABEL[ctx.project.budgetBand] ?? ctx.project.budgetBand
          : null,
        ownerName: ctx.owner.name,
        ownerEmail: ctx.owner.email,
        documentCount: ctx.project.documentCount,
        projectUrl: builderUrl,
      }),
    ]);

    // 2. Network fan-out (enqueues to the outbox) — open rounds only
    // (legacy hybrid rows behave as open). A PRIVATE round never
    // announces itself to the network; its builders are invited by
    // hand.
    if (ctx.project.tenderMode !== "private") {
      await fanOutToBuilders(ctx, builderUrl);
    }

    // 3. Invitations created while the project was still a draft were
    // deferred (an invite email to a closed round reads as a broken
    // link) — the round is open now, so they go out.
    const pendingInvites = await db
      .select({ id: tenderBuilderInvites.id })
      .from(tenderBuilderInvites)
      .where(
        and(
          eq(tenderBuilderInvites.projectId, projectId),
          eq(tenderBuilderInvites.status, "invited"),
        ),
      );
    if (pendingInvites.length > 0) {
      const { dispatchBuilderInvite } = await import(
        "@/modules/tenders/dispatch"
      );
      await Promise.allSettled(
        pendingInvites.map((inv) => dispatchBuilderInvite(inv.id)),
      );
    }

    // 4. Unlocks granted while the project was still a draft — a
    // pre-assigned (concierge) round. The builders were deliberately
    // told nothing at grant time, because the project did not exist for
    // them yet. It does now, so their unlock email goes out. Same
    // outbox kind as an organic unlock, so it can never double-send.
    const { dispatchDeferredUnlockBuilderEmails } = await import(
      "@/modules/unlocks/dispatch"
    );
    const deferredUnlockEmails =
      await dispatchDeferredUnlockBuilderEmails(projectId);

    logger.info(
      {
        event: "project.dispatch.ok",
        projectId,
        kind: "project_published",
        invitesSent: pendingInvites.length,
        deferredUnlockEmails,
      },
      "project_published dispatch complete",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "project.dispatch.failed", projectId, msg },
      "project dispatch failed — continuing",
    );
  }
}

interface DispatchContext {
  project: {
    id: string;
    slug: string;
    title: string;
    type: string;
    suburb: string | null;
    state: string | null;
    budgetBand: string | null;
    tenderMode: "open" | "private" | "hybrid";
    documentCount: number;
  };
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    name: string | null;
  };
}

async function gatherContext(
  projectId: string,
): Promise<DispatchContext | null> {
  const [row] = await db
    .select({
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectType: projects.type,
      projectSuburb: projects.suburb,
      projectState: projects.state,
      projectBudgetBand: projects.budgetBand,
      projectTenderMode: projects.tenderMode,
      ownerId: users.id,
      ownerEmail: users.email,
      ownerName: users.name,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!row) return null;

  // Active doc count — useful operationally to spot projects published
  // with light document sets.
  const [docs] = await db
    .select({ value: count() })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.status, "active"),
        isNull(documents.deletedAt),
      ),
    );

  const firstFromName = (n: string | null) =>
    n ? (n.split(" ")[0] ?? null) : null;

  return {
    project: {
      id: row.projectId,
      slug: row.projectSlug,
      title: row.projectTitle,
      type: row.projectType,
      suburb: row.projectSuburb,
      state: row.projectState,
      budgetBand: row.projectBudgetBand,
      tenderMode: row.projectTenderMode,
      documentCount: docs?.value ?? 0,
    },
    owner: {
      id: row.ownerId,
      email: row.ownerEmail,
      firstName: firstFromName(row.ownerName),
      name: row.ownerName,
    },
  };
}

interface BuilderRecipient {
  userId: string;
  email: string;
  firstName: string | null;
  isInServiceArea: boolean;
}

async function fanOutToBuilders(
  ctx: DispatchContext,
  projectUrl: string,
): Promise<void> {
  // Pull every builder with marketing-emails on AND a non-incomplete
  // profile (skip half-onboarded — they don't have a public profile yet
  // and emailing them is more nag than nudge). pending_review counts
  // as a real builder; only `incomplete` is excluded.
  // Builders already holding an unlock on this project are IN the
  // round, not an audience for it. On an organic round this set is
  // empty at publish; on a pre-assigned round, inviting them to come
  // and unlock a project they already hold would read as a mix-up.
  // They receive the unlock email instead (step 4 of the dispatch).
  const alreadyIn = await db
    .select({ builderId: unlocks.builderId })
    .from(unlocks)
    .where(eq(unlocks.projectId, ctx.project.id));
  const alreadyInIds = alreadyIn.map((r) => r.builderId);

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      approvalStatus: builderProfiles.approvalStatus,
    })
    .from(users)
    .innerJoin(builderProfiles, eq(builderProfiles.userId, users.id))
    .where(
      and(
        eq(users.marketingEmailsEnabled, true),
        eq(users.role, "builder"),
        ne(builderProfiles.approvalStatus, "incomplete"),
        isNull(users.deletedAt),
        ...(alreadyInIds.length > 0
          ? [notInArray(users.id, alreadyInIds)]
          : []),
      ),
    );

  if (rows.length === 0) {
    logger.info(
      { event: "project.dispatch.fanout.no_recipients", projectId: ctx.project.id },
      "no builders match the fan-out criteria",
    );
    return;
  }

  // Pull service areas in one shot for the matched builders so we can
  // tag each recipient with isInServiceArea. A row matches when the
  // area's state equals the project's state AND either the suburb
  // equals the project's suburb OR the radius is >= 50 (statewide).
  const builderIds = rows.map((r) => r.userId);
  const areas = await db
    .select({
      builderId: builderServiceAreas.builderId,
      state: builderServiceAreas.state,
      suburb: builderServiceAreas.suburb,
      radiusKm: builderServiceAreas.radiusKm,
    })
    .from(builderServiceAreas)
    .where(inArray(builderServiceAreas.builderId, builderIds));

  const inAreaIds = new Set<string>();
  for (const a of areas) {
    if (a.state !== ctx.project.state) continue;
    const statewide = a.radiusKm >= 50;
    if (statewide || a.suburb === ctx.project.suburb) {
      inAreaIds.add(a.builderId);
    }
  }

  const firstFromName = (n: string | null) =>
    n ? (n.split(" ")[0] ?? null) : null;

  const recipients: BuilderRecipient[] = rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    firstName: firstFromName(r.name),
    isInServiceArea: inAreaIds.has(r.userId),
  }));

  // 1. Insert notification rows — single batch. The partial unique
  // index drops dupes if dispatch runs twice for the same project.
  // We use ON CONFLICT DO NOTHING via createNotificationsMany's
  // best-effort behaviour; if it errors on conflict, we catch + log
  // (the email send is what matters most).
  try {
    await createNotificationsMany(
      recipients.map((r) => ({
        userId: r.userId,
        kind: "project_published" as const,
        projectId: ctx.project.id,
        title: r.isInServiceArea
          ? `New ${TYPE_LABEL[ctx.project.type] ?? ctx.project.type} in your service area`
          : `New project: ${ctx.project.title}`,
        body:
          [ctx.project.suburb, ctx.project.state]
            .filter(Boolean)
            .join(", ") || ctx.project.title,
        actionUrl: projectUrl,
      })),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      { event: "project.dispatch.notifications_insert_failed", projectId: ctx.project.id, msg },
      "bulk notification insert hit conflict — continuing with emails",
    );
  }

  // 2. Enqueue the builder emails to the durable outbox in ONE fast bulk
  //    insert. The Vercel cron (/api/cron/notification-outbox) drains it
  //    in retry-safe batches. This replaces the old in-request throttled
  //    send loop, which the serverless runtime killed after the first
  //    batch — silently dropping most of the fan-out (Brunswick + Footscray).
  //    Per-recipient email inputs are denormalised into the payload so the
  //    drainer is self-contained; the unsubscribe URL is minted at send
  //    time from the user id.
  const enqueued = await enqueueEmails(
    recipients.map((r) => ({
      kind: "project_published_builder",
      toEmail: r.email,
      userId: r.userId,
      projectId: ctx.project.id,
      payload: {
        builderFirstName: r.firstName,
        projectTitle: ctx.project.title,
        projectType: TYPE_LABEL[ctx.project.type] ?? ctx.project.type,
        suburb: ctx.project.suburb,
        state: ctx.project.state,
        budgetBand: ctx.project.budgetBand
          ? BUDGET_LABEL[ctx.project.budgetBand] ?? ctx.project.budgetBand
          : null,
        isInServiceArea: r.isInServiceArea,
        projectSlug: ctx.project.slug,
      },
    })),
  );

  logger.info(
    {
      event: "project.dispatch.fanout.enqueued",
      projectId: ctx.project.id,
      recipients: recipients.length,
      enqueued,
    },
    "project_published fan-out enqueued to outbox",
  );
}


// ── participant invitation dispatch ──────────────────────────────────────

/**
 * Send (or re-send) a participant seat's invitation email. Fired by
 * the participants actions after `inviteParticipant` /
 * `resendParticipantInvite`. Internally try/catch'd — a flaky send
 * never fails the seat creation; the runner can re-send from the
 * panel.
 */
export async function dispatchParticipantInvite(
  participantId: string,
): Promise<{ emailed: boolean }> {
  try {
    const inviterUsers = alias(users, "inviter_users");
    const [row] = await db
      .select({
        email: projectParticipants.email,
        name: projectParticipants.name,
        role: projectParticipants.role,
        status: projectParticipants.status,
        inviteToken: projectParticipants.inviteToken,
        invitedAt: projectParticipants.invitedAt,
        projectTitle: projects.title,
        projectSuburb: projects.suburb,
        projectState: projects.state,
        inviterName: inviterUsers.name,
        inviterPractice: architectProfiles.practiceName,
      })
      .from(projectParticipants)
      .innerJoin(projects, eq(projects.id, projectParticipants.projectId))
      .innerJoin(
        inviterUsers,
        eq(inviterUsers.id, projectParticipants.invitedBy),
      )
      .leftJoin(
        architectProfiles,
        eq(architectProfiles.userId, projectParticipants.invitedBy),
      )
      .where(eq(projectParticipants.id, participantId))
      .limit(1);
    if (!row || row.status !== "invited") {
      logger.warn(
        { event: "participant_invite.dispatch.no_context", participantId },
        "participant invite dispatch — no sendable context",
      );
      return { emailed: false };
    }

    const inviterName =
      (row.inviterPractice ?? row.inviterName ?? "The project team").slice(0, 80);
    const roleLabel = PARTICIPANT_ROLE_LABEL[row.role];
    const roleLine =
      row.role === "decider"
        ? "Your access includes the decision: you can review every tender alongside the evaluation and take part in shortlisting and awarding."
        : "You can follow the round as it unfolds: the project file, the tenders as they arrive, and the full evaluation.";
    const expiresOn = new Date(
      row.invitedAt.getTime() +
        PARTICIPANT_INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Australia/Sydney",
    });
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");

    const result = await sendParticipantInviteEmail({
      to: row.email,
      recipientFirstName: row.name ? (row.name.split(" ")[0] ?? null) : null,
      inviterName,
      projectTitle: row.projectTitle.slice(0, 120),
      projectLocation: row.projectSuburb
        ? `${row.projectSuburb}, ${row.projectState ?? ""}`.replace(/, $/, "")
        : null,
      roleLabel,
      roleLine,
      claimUrl: `${base}/invite/p/${row.inviteToken}`,
      expiresOn,
    });

    if (result.ok) {
      logger.info(
        { event: "participant_invite.dispatch.ok", participantId },
        "participant invite dispatch completed",
      );
    } else {
      logger.warn(
        { event: "participant_invite.dispatch.email_failed", participantId },
        "participant seat created but the email did not send",
      );
    }
    return { emailed: result.ok };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "participant_invite.dispatch.failed", participantId, msg },
      "participant invite dispatch failed — continuing",
    );
    return { emailed: false };
  }
}


/**
 * The runner hears the door: bell + a quiet letter when an invited
 * seat is claimed, plus the audit line. Fired after
 * `claimParticipantInvite` succeeds. Internally try/catch'd — a flaky
 * send never fails the claim.
 */
export async function dispatchParticipantJoined(
  participantId: string,
): Promise<void> {
  try {
    const runnerUsers = alias(users, "runner_users");
    const joinedUsers = alias(users, "joined_users");
    const [row] = await db
      .select({
        projectId: projects.id,
        projectSlug: projects.slug,
        projectTitle: projects.title,
        runnerId: projects.ownerId,
        runnerEmail: runnerUsers.email,
        runnerFirstName: runnerUsers.firstName,
        runnerRole: runnerUsers.role,
        seatEmail: projectParticipants.email,
        seatName: projectParticipants.name,
        seatRole: projectParticipants.role,
        seatUserId: projectParticipants.userId,
        joinedName: joinedUsers.name,
      })
      .from(projectParticipants)
      .innerJoin(projects, eq(projects.id, projectParticipants.projectId))
      .innerJoin(runnerUsers, eq(runnerUsers.id, projects.ownerId))
      .leftJoin(joinedUsers, eq(joinedUsers.id, projectParticipants.userId))
      .where(eq(projectParticipants.id, participantId))
      .limit(1);
    if (!row) return;

    const participantName =
      row.joinedName ?? row.seatName ?? row.seatEmail;
    const roleLabel = ROLE_LABEL_FOR_JOIN[row.seatRole];
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const projectPath =
      row.runnerRole === "architect"
        ? `/architect/projects/${row.projectSlug}`
        : `/owner/projects/${row.projectSlug}`;

    await Promise.allSettled([
      createNotificationsMany([
        {
          userId: row.runnerId,
          kind: "participant_joined",
          title: `${participantName} joined ${row.projectTitle}`,
          body: `They hold a ${roleLabel.toLowerCase()} seat on the round.`,
          actionUrl: `${base}${projectPath}`,
          projectId: row.projectId,
        },
      ]),
      sendParticipantJoinedEmail({
        to: row.runnerEmail,
        runnerFirstName: row.runnerFirstName,
        participantName,
        roleLabel,
        projectTitle: row.projectTitle,
        projectUrl: `${base}${projectPath}`,
      }),
      recordProjectEvent({
        projectId: row.projectId,
        actorId: row.seatUserId,
        kind: "seat.joined",
        subjectId: participantId,
        summary: `${participantName} accepted their invitation (${roleLabel}).`,
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "participant_joined.dispatch.failed", participantId, msg },
      "participant joined dispatch failed — continuing",
    );
  }
}
