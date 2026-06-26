/**
 * GET /api/cron/notification-outbox
 *
 * Drains the notification_outbox email queue. Runs every minute (Vercel
 * cron). Claims a lease-protected, skip-locked batch of due rows, sends
 * each via the real email module, and marks them sent / retries with
 * backoff / parks as failed after the attempt cap.
 *
 * This is the durable replacement for the old in-request builder fan-out
 * loop, which the serverless runtime killed after the first batch —
 * silently dropping most of the fan-out (Brunswick + Footscray). Because
 * sending now happens here, batch by batch, a cutoff just means the next
 * run picks up where this one stopped. Nothing is lost.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  claimDueOutbox,
  markOutboxSent,
  markOutboxFailed,
  type ClaimedOutboxRow,
} from "@/modules/notifications";
import {
  sendProjectPublishedBuilderEmail,
  sendUnlockOwnerEmail,
  sendUnlockBuilderEmail,
  sendUnlockOpsEmail,
} from "@/modules/email";
import { ensureUnsubscribeToken } from "@/modules/projects/unsubscribe";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Rows per run. On Vercel Pro (60s functions) ~0.5s/send means 50 drains
 *  in ~25s with margin; anything beyond drains on the next minute's run.
 *  The lease/claim model means an over-budget run loses nothing — leftovers
 *  are reclaimed next run. */
const BATCH = 50;
/** Resend free tier is 10 req/s; sequential sends are already latency-
 *  bound well under that, so just a tiny safety gap. */
const SEND_GAP_MS = 60;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BASE = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");

export async function GET(request: NextRequest) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    logger.warn({ event: "cron.outbox.no_secret" }, "CRON_SECRET unset — rejecting");
    return NextResponse.json({ ok: false, code: "not_configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 401 });
  }

  const claimed = await claimDueOutbox(BATCH);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of claimed) {
    try {
      // Builder ids are encoded into the unlock kinds (`unlock_owner:<id>`),
      // so match by prefix.
      let resendId: string;
      if (row.kind === "project_published_builder") {
        resendId = await sendProjectPublished(row);
      } else if (row.kind.startsWith("unlock_owner")) {
        resendId = await sendUnlockOwner(row);
      } else if (row.kind.startsWith("unlock_builder")) {
        resendId = await sendUnlockBuilder(row);
      } else if (row.kind.startsWith("unlock_ops")) {
        resendId = await sendUnlockOps(row);
      } else {
        // Unknown kind — park it (don't loop forever).
        await markOutboxFailed(row.id, 999, `unknown kind: ${row.kind}`);
        skipped++;
        continue;
      }
      await markOutboxSent(row.id, resendId);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markOutboxFailed(row.id, row.attempts, msg);
      failed++;
    }
    await sleep(SEND_GAP_MS);
  }

  logger.info(
    { event: "cron.outbox.summary", claimed: claimed.length, sent, failed, skipped },
    `outbox drain: ${sent} sent, ${failed} failed, ${skipped} skipped of ${claimed.length}`,
  );
  return NextResponse.json({
    ok: true,
    summary: { claimed: claimed.length, sent, failed, skipped },
  });
}

/** Send a project_published builder email; returns the Resend id or throws. */
async function sendProjectPublished(row: ClaimedOutboxRow): Promise<string> {
  const p = row.payload as {
    builderFirstName: string | null;
    projectTitle: string;
    projectType: string;
    suburb: string | null;
    state: string | null;
    budgetBand: string | null;
    isInServiceArea: boolean;
    projectSlug: string;
  };
  // Mint the unsubscribe URL at send time (lazy token).
  const unsubscribeUrl = row.userId
    ? `${BASE}/api/unsubscribe/${await ensureUnsubscribeToken(row.userId)}`
    : `${BASE}/api/unsubscribe/`;

  const result = await sendProjectPublishedBuilderEmail({
    to: row.toEmail,
    builderFirstName: p.builderFirstName,
    projectTitle: p.projectTitle,
    projectType: p.projectType,
    suburb: p.suburb,
    state: p.state,
    budgetBand: p.budgetBand,
    isInServiceArea: p.isInServiceArea,
    projectUrl: `${BASE}/builder/projects/${p.projectSlug}`,
    unsubscribeUrl,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value.id;
}

/** Owner notice: "<builder> unlocked your project". Returns id or throws. */
async function sendUnlockOwner(row: ClaimedOutboxRow): Promise<string> {
  const p = row.payload as {
    ownerFirstName: string | null;
    builderCompany: string;
    builderState: string | null;
    abnVerified: boolean;
    anyLicenceVerified: boolean;
    projectTitle: string;
    projectSlug: string;
    builderSlug: string | null;
  };
  const result = await sendUnlockOwnerEmail({
    to: row.toEmail,
    ownerFirstName: p.ownerFirstName,
    builderCompany: p.builderCompany,
    builderState: p.builderState,
    abnVerified: p.abnVerified,
    anyLicenceVerified: p.anyLicenceVerified,
    projectTitle: p.projectTitle,
    projectUrl: `${BASE}/owner/projects/${p.projectSlug}`,
    builderProfileUrl: p.builderSlug ? `${BASE}/b/${p.builderSlug}` : null,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value.id;
}

/** Builder receipt with the address + owner contact. Returns id or throws. */
async function sendUnlockBuilder(row: ClaimedOutboxRow): Promise<string> {
  const p = row.payload as {
    builderFirstName: string | null;
    projectTitle: string;
    projectAddress: string | null;
    ownerName: string | null;
    ownerEmail: string;
    ownerPhone: string | null;
    projectSlug: string;
    unlockedViaFba: boolean;
  };
  const result = await sendUnlockBuilderEmail({
    to: row.toEmail,
    builderFirstName: p.builderFirstName,
    projectTitle: p.projectTitle,
    projectAddress: p.projectAddress,
    ownerName: p.ownerName,
    ownerEmail: p.ownerEmail,
    ownerPhone: p.ownerPhone,
    projectUrl: `${BASE}/builder/projects/${p.projectSlug}`,
    unlockedViaFba: p.unlockedViaFba,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value.id;
}

/** Ops heads-up. sendUnlockOpsEmail targets the ops inbox internally. */
async function sendUnlockOps(row: ClaimedOutboxRow): Promise<string> {
  const p = row.payload as {
    projectTitle: string;
    projectSlug: string;
    builderCompany: string;
    builderEmail: string;
    ownerName: string | null;
    ownerEmail: string;
    source: string;
    unlockedAt: string;
  };
  const result = await sendUnlockOpsEmail({
    projectTitle: p.projectTitle,
    projectUrl: `${BASE}/builder/projects/${p.projectSlug}`,
    builderCompany: p.builderCompany,
    builderEmail: p.builderEmail,
    ownerName: p.ownerName,
    ownerEmail: p.ownerEmail,
    source: p.source,
    unlockedAt: new Date(p.unlockedAt),
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value.id;
}
