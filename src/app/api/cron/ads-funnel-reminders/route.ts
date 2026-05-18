/**
 * GET /api/cron/ads-funnel-reminders
 *
 * Daily Vercel Cron job. Re-issues magic links for ads-funnel
 * projects whose owners haven't verified their email within 24-48h
 * of signing up. The new link uses the same template — only the
 * first email is "your link"; the re-issue lands as a "still there?"
 * follow-up by virtue of the time gap.
 *
 * Schedule: `0 22 * * *` — 22:00 UTC daily, which is 08:00 AEST
 * (09:00 AEDT). Good time to land in Australian inboxes.
 *
 * Target window: created_at between 48h ago and 24h ago. Projects
 * older than 48h are abandoned (we don't keep nagging); projects
 * younger than 24h are too fresh (give them time to find the email).
 *
 * Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}` on
 * every invocation. Endpoint rejects anything else.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, between, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { issueAdsFunnelMagicLink } from "@/modules/auth";
import { humanProjectTypeLabel, projects } from "@/modules/projects";
import { users } from "@/modules/users";

export const runtime = "nodejs";
// Allow up to 60s — bulk send can take a few seconds when there are
// dozens of leads in the window.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // ── Auth gate ─────────────────────────────────────────────────────
  const secret = env.CRON_SECRET;
  if (!secret) {
    logger.warn(
      { event: "cron.ads_funnel.no_secret" },
      "CRON_SECRET unset — cron endpoint is unprotected; rejecting",
    );
    return NextResponse.json({ ok: false, code: "not_configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 401 });
  }

  // ── Window ────────────────────────────────────────────────────────
  const now = Date.now();
  const from = new Date(now - 48 * 60 * 60 * 1000);
  const to = new Date(now - 24 * 60 * 60 * 1000);

  // ── Find leads in the window ──────────────────────────────────────
  const rows = await db
    .select({
      projectId: projects.id,
      projectSuburb: projects.suburb,
      projectType: projects.type,
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      userStatus: users.status,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    .where(
      and(
        eq(projects.acquisitionSource, "ads_funnel"),
        eq(projects.awaitingOwnerVerification, true),
        between(projects.createdAt, from, to),
      ),
    );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Skip users who've already verified (status=active) but whose
    // project happens to still have the flag set. Belt-and-braces.
    if (row.userStatus !== "pending_verification") {
      skipped += 1;
      continue;
    }
    const issued = await issueAdsFunnelMagicLink({
      email: row.email,
      firstName: row.firstName,
      projectId: row.projectId,
      suburb: row.projectSuburb ?? "your",
      projectTypeLabel: humanProjectTypeLabel(row.projectType),
    });
    if (issued.ok) {
      sent += 1;
    } else {
      failed += 1;
      errors.push(`${row.email}: ${issued.error.message}`);
    }
  }

  logger.info(
    {
      event: "cron.ads_funnel.summary",
      windowFrom: from.toISOString(),
      windowTo: to.toISOString(),
      candidates: rows.length,
      sent,
      skipped,
      failed,
    },
    `ads-funnel reminders: ${sent} sent, ${skipped} skipped, ${failed} failed`,
  );

  return NextResponse.json({
    ok: true,
    summary: {
      windowFrom: from.toISOString(),
      windowTo: to.toISOString(),
      candidates: rows.length,
      sent,
      skipped,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}
