/**
 * GET /api/cron/notify
 *
 * Daily Vercel Cron job — the platform's diary. Three sweeps, each
 * idempotent by construction (a durable marker per send, so a rerun
 * never doubles up):
 *
 *   1. Tender validity closing — priced tenders (submitted or
 *      shortlisted) whose validity window ends within the next 3 days.
 *      Bell to everyone on the owner side, letter to the runner.
 *      Dedupe: one `tender_validity_expiring` notification row per
 *      tender, ever.
 *   2. Participant seat reminders — pending seats 10+ days old (their
 *      14-day link has ~4 days left). Re-sends the SAME link (the
 *      token is untouched, so the original email keeps working).
 *      Dedupe: `reminded_at`, cleared when the runner re-sends by hand.
 *   3. Builder invitation reminders — pending invitations 7+ days old
 *      on live rounds. Same email as the original. Dedupe: `reminded_at`.
 *
 * Schedule: `15 22 * * *` — 22:15 UTC daily, morning in Australia.
 * Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { tenders, tenderBuilderInvites } from "@/modules/tenders";
import { projects, projectParticipants } from "@/modules/projects";
import { users } from "@/modules/users";
import { builderProfiles } from "@/modules/profiles";
import {
  notifications,
  create as createNotification,
} from "@/modules/notifications";
import { sendTenderValidityExpiringEmail } from "@/modules/email";
import { dispatchParticipantInvite } from "@/modules/projects";
import { dispatchBuilderInvite } from "@/modules/tenders";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Nudge when a tender's validity ends within this many days. */
const VALIDITY_WINDOW_DAYS = 3;
/** Remind a pending seat after this many days (link dies at 14). */
const SEAT_REMINDER_AFTER_DAYS = 10;
/** Remind a pending builder invitation after this many days. */
const INVITE_REMINDER_AFTER_DAYS = 7;

export async function GET(request: NextRequest) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    logger.warn(
      { event: "cron.notify.no_secret" },
      "CRON_SECRET not configured — refusing",
    );
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const out = { validity: 0, seatReminders: 0, inviteReminders: 0 };

  // ── 1. validity windows closing ─────────────────────────────────────
  try {
    const ownerUsers = alias(users, "owner_users");
    const rows = await db
      .select({
        tenderId: tenders.id,
        submittedAt: tenders.submittedAt,
        validityDays: tenders.validityDays,
        projectId: projects.id,
        projectSlug: projects.slug,
        projectTitle: projects.title,
        runnerId: projects.ownerId,
        runnerEmail: ownerUsers.email,
        runnerFirstName: ownerUsers.firstName,
        runnerRole: ownerUsers.role,
        builderCompany: builderProfiles.companyName,
      })
      .from(tenders)
      .innerJoin(projects, eq(projects.id, tenders.projectId))
      .innerJoin(ownerUsers, eq(ownerUsers.id, projects.ownerId))
      .leftJoin(builderProfiles, eq(builderProfiles.userId, tenders.builderId))
      .where(
        and(
          inArray(tenders.status, ["submitted", "shortlisted"]),
          isNull(tenders.deletedAt),
          isNull(projects.deletedAt),
          sql`${tenders.submittedAt} IS NOT NULL`,
          sql`${tenders.validityDays} IS NOT NULL`,
          // Window: ends within N days, has not already ended.
          sql`${tenders.submittedAt} + (${tenders.validityDays} || ' days')::interval <= ${new Date(now + VALIDITY_WINDOW_DAYS * DAY_MS).toISOString()}::timestamptz`,
          sql`${tenders.submittedAt} + (${tenders.validityDays} || ' days')::interval >= ${new Date(now).toISOString()}::timestamptz`,
          // Dedupe: one nudge per tender, ever.
          sql`NOT EXISTS (
            SELECT 1 FROM ${notifications} n
            WHERE n."tender_id" = ${tenders.id}
              AND n."kind" = 'tender_validity_expiring'
          )`,
        ),
      )
      .limit(50);

    for (const r of rows) {
      const endsAt = new Date(
        r.submittedAt!.getTime() + r.validityDays! * DAY_MS,
      );
      const daysLeft = Math.max(
        0,
        Math.floor((endsAt.getTime() - now) / DAY_MS),
      );
      const holdsUntil = endsAt.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Australia/Sydney",
      });
      const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
      const reviewUrl = `${base}${r.runnerRole === "architect" ? "/architect" : "/owner"}/projects/${r.projectSlug}/tenders`;
      const company = r.builderCompany ?? "A builder";

      const seats = await db
        .select({ userId: projectParticipants.userId })
        .from(projectParticipants)
        .where(
          and(
            eq(projectParticipants.projectId, r.projectId),
            eq(projectParticipants.status, "joined"),
          ),
        );
      const ownerSideIds = [
        r.runnerId,
        ...seats.map((s) => s.userId).filter((v): v is string => v != null),
      ];

      await Promise.allSettled([
        ...ownerSideIds.map((userId) =>
          createNotification({
            userId,
            kind: "tender_validity_expiring",
            title: `${company}'s price holds until ${holdsUntil}`,
            body: r.projectTitle,
            actionUrl: reviewUrl,
            projectId: r.projectId,
            tenderId: r.tenderId,
          }),
        ),
        sendTenderValidityExpiringEmail({
          to: r.runnerEmail,
          recipientFirstName: r.runnerFirstName,
          builderCompany: company,
          projectTitle: r.projectTitle,
          holdsUntil,
          daysLeft,
          reviewUrl,
        }),
      ]);
      out.validity += 1;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "cron.notify.validity_failed", msg }, "validity sweep failed");
  }

  // ── 2. participant seat reminders ───────────────────────────────────
  try {
    const pending = await db
      .select({ id: projectParticipants.id })
      .from(projectParticipants)
      .innerJoin(projects, eq(projects.id, projectParticipants.projectId))
      .where(
        and(
          eq(projectParticipants.status, "invited"),
          isNull(projectParticipants.remindedAt),
          isNull(projects.deletedAt),
          lte(
            projectParticipants.invitedAt,
            new Date(now - SEAT_REMINDER_AFTER_DAYS * DAY_MS),
          ),
          // Still inside the 14-day window — a dead link gets no nudge.
          sql`${projectParticipants.invitedAt} >= ${new Date(now - 14 * DAY_MS).toISOString()}::timestamptz`,
        ),
      )
      .limit(50);

    for (const p of pending) {
      const { emailed } = await dispatchParticipantInvite(p.id);
      if (emailed) {
        await db
          .update(projectParticipants)
          .set({ remindedAt: new Date(), updatedAt: new Date() })
          .where(eq(projectParticipants.id, p.id));
        out.seatReminders += 1;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "cron.notify.seat_reminders_failed", msg }, "seat reminder sweep failed");
  }

  // ── 3. builder invitation reminders ─────────────────────────────────
  try {
    const pending = await db
      .select({ id: tenderBuilderInvites.id })
      .from(tenderBuilderInvites)
      .innerJoin(projects, eq(projects.id, tenderBuilderInvites.projectId))
      .where(
        and(
          eq(tenderBuilderInvites.status, "invited"),
          isNull(tenderBuilderInvites.remindedAt),
          isNull(projects.deletedAt),
          inArray(projects.status, ["published", "tendering"]),
          lte(
            tenderBuilderInvites.invitedAt,
            new Date(now - INVITE_REMINDER_AFTER_DAYS * DAY_MS),
          ),
        ),
      )
      .limit(50);

    for (const inv of pending) {
      const { emailed } = await dispatchBuilderInvite(inv.id);
      if (emailed) {
        await db
          .update(tenderBuilderInvites)
          .set({ remindedAt: new Date(), updatedAt: new Date() })
          .where(eq(tenderBuilderInvites.id, inv.id));
        out.inviteReminders += 1;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "cron.notify.invite_reminders_failed", msg }, "invite reminder sweep failed");
  }

  logger.info({ event: "cron.notify.done", ...out }, "notify cron completed");
  return NextResponse.json({ ok: true, ...out });
}
