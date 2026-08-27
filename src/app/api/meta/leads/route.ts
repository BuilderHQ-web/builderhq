/**
 * /api/meta/leads — receiver for Meta Lead Ads (Instant Forms).
 *
 * GET  is Meta's one-time subscription handshake. It echoes the
 *      challenge back as PLAIN TEXT, and only when the verify token
 *      matches ours.
 * POST is a lead notification. It carries a lead id and nothing else,
 *      so the answers are fetched from the Graph API before anything is
 *      written.
 *
 * WHY THIS ANSWERS 200 SO OFTEN. Meta redelivers anything it does not
 * get a prompt 200 for, and there is only one outcome where a retry
 * helps us: the Graph fetch failed and might succeed later. Everything
 * else — a lead we already hold, a change we do not subscribe to, an
 * ops email that bounced — is settled, and a non-200 would only have
 * Meta send the same lead again. Signature failures are the exception:
 * they get a 403, because they did not come from Meta at all.
 *
 * The composition of "write the lead, then tell ops" lives here rather
 * than in the leads module, matching the marketing form actions, which
 * compose the same two steps the same way.
 */

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendMetaLeadOpsEmail, sendMetaLeadUnretrievableEmail } from "@/modules/email";
import { markLeadOpsNotified, recordExternalLead } from "@/modules/leads";
import {
  fetchLead,
  mapLeadFields,
  parseNotifications,
  verifySignature,
  verifySubscription,
  type LeadgenNotification,
} from "@/modules/leads/meta-webhook";

export const runtime = "nodejs";
// A webhook must never be cached or statically optimised.
export const dynamic = "force-dynamic";

const EXTERNAL_SOURCE = "meta_lead_ads";

export async function GET(request: NextRequest) {
  const result = verifySubscription(
    request.nextUrl.searchParams,
    env.META_LEAD_VERIFY_TOKEN,
  );
  if (!result.ok) {
    logger.warn(
      { event: "meta.leads.handshake_rejected", code: result.error.code },
      "meta subscription handshake rejected",
    );
    return new NextResponse("Forbidden", { status: 403 });
  }
  logger.info({ event: "meta.leads.handshake_ok" }, "meta subscription handshake accepted");
  // Meta wants the bare challenge, not JSON.
  return new NextResponse(result.value, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export async function POST(request: NextRequest) {
  // The signature covers the exact bytes Meta sent, so the body must be
  // read as text. Parsing it first and reserialising would change the
  // whitespace and break verification.
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-hub-signature-256") ?? request.headers.get("X-Hub-Signature-256");

  const verified = verifySignature(rawBody, signature, env.META_APP_SECRET);
  if (!verified.ok) {
    logger.warn(
      { event: "meta.leads.signature_rejected", code: verified.error.code },
      "meta webhook signature rejected",
    );
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    logger.warn({ event: "meta.leads.unparseable" }, "meta webhook body was not JSON");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (!env.META_PAGE_ACCESS_TOKEN) {
    // Loud on purpose. Nothing downstream can work without this, and a
    // subscription pointed at an endpoint that cannot read leads will
    // quietly lose every one of them.
    logger.error(
      { event: "meta.leads.not_configured" },
      "META_PAGE_ACCESS_TOKEN is missing; leads cannot be retrieved",
    );
  }

  const notifications = parseNotifications(body);
  if (notifications.length === 0) {
    // Meta sends changes we have not asked for. Not an error.
    logger.info({ event: "meta.leads.no_leadgen" }, "meta webhook carried no leadgen change");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let retryable = false;
  for (const notification of notifications) {
    const outcome = await ingest(notification);
    if (outcome === "retry") retryable = true;
  }

  if (retryable) {
    // The only case worth a redelivery: we could not reach Graph, so
    // the lead exists at Meta and nowhere else. Idempotency makes the
    // repeat harmless for any lead in the same batch that did land.
    return NextResponse.json({ received: false }, { status: 503 });
  }
  return NextResponse.json({ received: true }, { status: 200 });
}

type Outcome = "done" | "retry";

async function ingest(notification: LeadgenNotification): Promise<Outcome> {
  const fetched = await fetchLead(notification.leadgenId, env.META_PAGE_ACCESS_TOKEN, {
    appSecret: env.META_APP_SECRET,
  });
  if (!fetched.ok) {
    logger.error(
      {
        event: "meta.leads.fetch_failed",
        leadgenId: notification.leadgenId,
        code: fetched.error.code,
        msg: fetched.error.message,
      },
      "could not retrieve the lead from Graph",
    );
    // A rejected token or a lead we are not permitted to read will fail
    // the same way on every retry, so only transport failures are worth
    // repeating. `forbidden` covers Meta's 4xx, which will not change.
    if (fetched.error.code !== "forbidden") return "retry";

    // Acknowledging it means Meta will never send it again, so this is
    // the last moment anybody could learn the lead existed. Until the
    // app passes App Review for lead retrieval this is what EVERY lead
    // from a member of the public looks like, and without a notice it
    // is a silent loss while the campaign keeps spending.
    const alarm = await sendMetaLeadUnretrievableEmail({
      leadgenId: notification.leadgenId,
      formId: notification.formId,
      pageId: notification.pageId,
      reason: fetched.error.message.slice(0, 200),
      receivedAt: notification.createdTime
        ? new Date(notification.createdTime * 1000)
        : new Date(),
    });
    if (!alarm.ok) {
      // Now nobody knows by any route. Ask for the redelivery.
      logger.error(
        { event: "meta.leads.alarm_failed", leadgenId: notification.leadgenId },
        "could not read the lead AND could not raise the alarm",
      );
      return "retry";
    }
    return "done";
  }
  const lead = fetched.value;
  const mapped = mapLeadFields(lead.fieldData);

  const recorded = await recordExternalLead({
    kind: "meta_instant_form",
    externalSource: EXTERNAL_SOURCE,
    externalId: lead.id,
    firstName: mapped.firstName,
    lastName: mapped.lastName,
    email: mapped.email,
    phone: mapped.phone,
    source: lead.campaignName ? `meta:${lead.campaignName}` : EXTERNAL_SOURCE,
    createdAt: lead.createdTime ? new Date(lead.createdTime) : null,
    meta: {
      platform: lead.platform,
      campaign_id: lead.campaignId,
      campaign_name: lead.campaignName,
      adset_id: lead.adsetId,
      adset_name: lead.adsetName,
      ad_id: lead.adId,
      ad_name: lead.adName,
      form_id: lead.formId ?? notification.formId,
      page_id: notification.pageId,
      incomplete: mapped.incomplete,
      answers: mapped.extras,
      // The verbatim Graph response. Field names drift as campaigns are
      // rebuilt, and this is what lets an answer be recovered later
      // without asking Meta for a lead it may no longer serve.
      graph: lead.raw,
    },
  });

  if (!recorded.ok) {
    logger.error(
      { event: "meta.leads.record_failed", leadgenId: notification.leadgenId },
      "could not record the lead",
    );
    return "retry";
  }

  const row = recorded.value.lead;
  if (!row) return "done";

  // Notify on a first write, and also on a replay of a lead nobody was
  // ever told about — the first delivery may have written the row and
  // then failed to send.
  if (!recorded.value.created && row.opsNotifiedAt !== null) {
    return "done";
  }

  const notified = await sendMetaLeadOpsEmail({
    leadId: row.id,
    fullName: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
    email: row.email || null,
    phone: row.phone,
    extras: mapped.extras,
    campaignName: lead.campaignName,
    adName: lead.adName,
    formLabel: lead.formId ?? notification.formId,
    platform: lead.platform,
    incomplete: mapped.incomplete,
    createdAt: row.createdAt,
  });

  if (notified.ok) {
    await markLeadOpsNotified(row.id);
  } else {
    // Deliberately not retryable. The lead is safely recorded and shows
    // in the admin dashboard; having Meta redeliver would not fix an
    // email provider outage.
    logger.warn(
      { event: "meta.leads.ops_email_failed", leadId: row.id, msg: notified.error.message },
      "meta lead recorded but ops notification failed",
    );
  }
  return "done";
}
