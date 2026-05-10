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
import { and, eq, ne, isNull, count, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { projects } from "./schema";
import { documents } from "@/modules/documents/schema";
import { users } from "@/modules/users/schema";
import {
  builderProfiles,
  builderServiceAreas,
  projectOwnerProfiles,
} from "@/modules/profiles/schema";

import { createMany as createNotificationsMany } from "@/modules/notifications";
import {
  sendProjectPublishedOwnerEmail,
  sendProjectPublishedBuilderEmail,
  sendProjectPublishedOpsEmail,
} from "@/modules/email";

import { ensureUnsubscribeToken } from "./unsubscribe";

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

// Keep bulk sends under Resend's free-tier limit (10 req/sec). Each
// batch fires N sends in parallel, then we sleep to respect the cap.
// Tunable here; raise once we're on a paid Resend plan with higher rps.
const BULK_BATCH_SIZE = 8;
const BULK_BATCH_DELAY_MS = 1100;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

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

    // 2. Fan-out to all eligible builders.
    await fanOutToBuilders(ctx, builderUrl, base);

    logger.info(
      { event: "project.dispatch.ok", projectId, kind: "project_published" },
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
  baseUrl: string,
): Promise<void> {
  // Pull every builder with marketing-emails on AND a non-incomplete
  // profile (skip half-onboarded — they don't have a public profile yet
  // and emailing them is more nag than nudge). pending_review counts
  // as a real builder; only `incomplete` is excluded.
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

  // 2. Email fan-out — batched to respect Resend rate limit.
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BULK_BATCH_SIZE) {
    const batch = recipients.slice(i, i + BULK_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const token = await ensureUnsubscribeToken(r.userId);
        // The API endpoint handles both the one-click POST (from
        // Gmail/Outlook's built-in unsubscribe button via the List-
        // Unsubscribe header) and the GET fallback (which 302s to the
        // friendly /unsubscribe/[token] confirmation page). Same URL
        // for both flows = simpler everything.
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe/${token}`;
        return sendProjectPublishedBuilderEmail({
          to: r.email,
          builderFirstName: r.firstName,
          projectTitle: ctx.project.title,
          projectType: TYPE_LABEL[ctx.project.type] ?? ctx.project.type,
          suburb: ctx.project.suburb,
          state: ctx.project.state,
          budgetBand: ctx.project.budgetBand
            ? BUDGET_LABEL[ctx.project.budgetBand] ?? ctx.project.budgetBand
            : null,
          isInServiceArea: r.isInServiceArea,
          projectUrl,
          unsubscribeUrl,
        });
      }),
    );
    for (const res of results) {
      if (res.status === "fulfilled" && res.value.ok) sent++;
      else failed++;
    }
    // Last batch needn't sleep.
    if (i + BULK_BATCH_SIZE < recipients.length) {
      await sleep(BULK_BATCH_DELAY_MS);
    }
  }

  logger.info(
    {
      event: "project.dispatch.fanout.done",
      projectId: ctx.project.id,
      recipients: recipients.length,
      sent,
      failed,
    },
    "project_published fan-out complete",
  );
}

