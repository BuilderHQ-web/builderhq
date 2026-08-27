/**
 * leads · Meta Lead Ads webhook.
 *
 * HOW META'S FLOW ACTUALLY WORKS, because it is not obvious and the
 * shape of this file follows from it.
 *
 * A person submits an Instant Form inside Facebook or Instagram. Meta
 * does NOT send us the answers. It sends a small notification carrying
 * a `leadgen_id`, and the answers must then be fetched from the Graph
 * API with a Page access token. That is deliberate on Meta's part: the
 * webhook can be public, the data cannot.
 *
 * THREE THINGS THIS FILE EXISTS TO GET RIGHT.
 *
 * 1. PROVE IT IS META. The endpoint is public and anyone can POST a
 *    plausible body to it. Every delivery carries an HMAC of the raw
 *    bytes in `X-Hub-Signature-256`, computed with the app secret, and
 *    a request that fails it is discarded before anything is read. The
 *    comparison is timing-safe: a fast reject leaks the prefix.
 *
 * 2. NEVER CREATE THE SAME LEAD TWICE. Meta retries anything it does
 *    not get a prompt 200 for, and replays a backlog after an outage,
 *    so duplicate deliveries are routine rather than exceptional. The
 *    lead's own Meta id is the natural key, enforced by a partial
 *    unique index rather than by a read-then-write that two concurrent
 *    deliveries would both pass.
 *
 * 3. NEVER LOSE A LEAD TO A BAD FIELD NAME. An Instant Form's fields
 *    are named by whoever built the form, and they get renamed without
 *    telling anyone. So mapping is tolerant, the raw payload is always
 *    stored, and a lead whose email cannot be found is still WRITTEN,
 *    flagged for a human, rather than dropped for tidiness.
 *
 * Secrets never leave the server. The Page token is read from env
 * inside these functions and appears in no log line, no error message
 * and no URL we record.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

// ── the notification Meta sends ─────────────────────────────────────

export interface LeadgenNotification {
  leadgenId: string;
  formId: string | null;
  pageId: string | null;
  adId: string | null;
  adgroupId: string | null;
  campaignId: string | null;
  /** Unix seconds, as Meta sends it. */
  createdTime: number | null;
}

/**
 * Confirm the delivery came from Meta.
 *
 * Timing-safe on purpose: comparing digests with `===` returns early
 * on the first differing byte, which leaks how much of a forged
 * signature was right and makes the secret guessable a byte at a time.
 */
export function verifySignature(
  rawBody: string,
  header: string | null,
  appSecret: string | undefined,
): Result<true> {
  if (!appSecret) return fail("internal", "Meta app secret is not configured.");
  if (!header) return fail("validation", "Missing signature header.");

  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return fail("validation", "Signature does not match.");
  }
  return ok(true);
}

/**
 * The subscription handshake. Meta GETs the endpoint once when the
 * webhook is configured and expects the challenge echoed back as plain
 * text, but ONLY when the verify token matches ours — otherwise anyone
 * who guesses the URL could point their own app at it.
 */
export function verifySubscription(
  params: URLSearchParams,
  verifyToken: string | undefined,
): Result<string> {
  if (!verifyToken) return fail("internal", "Meta verify token is not configured.");
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode !== "subscribe") return fail("validation", "Unexpected hub.mode.");
  if (!token || token !== verifyToken) return fail("forbidden", "Verify token does not match.");
  if (!challenge) return fail("validation", "Missing hub.challenge.");
  return ok(challenge);
}

/**
 * Pull the leadgen notifications out of a webhook body.
 *
 * One delivery can carry several, and Meta reserves the right to send
 * changes we have not subscribed to, so anything that is not a leadgen
 * change is ignored rather than treated as malformed.
 */
export function parseNotifications(body: unknown): LeadgenNotification[] {
  const out: LeadgenNotification[] = [];
  const entries = (body as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const c = change as { field?: string; value?: Record<string, unknown> };
      if (c.field !== "leadgen") continue;
      const v = c.value ?? {};
      const leadgenId = str(v.leadgen_id);
      if (!leadgenId) continue;
      out.push({
        leadgenId,
        formId: str(v.form_id),
        pageId: str(v.page_id),
        adId: str(v.ad_id),
        adgroupId: str(v.adgroup_id),
        campaignId: str(v.campaign_id),
        createdTime: typeof v.created_time === "number" ? v.created_time : null,
      });
    }
  }
  return out;
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

// ── fetching the answers ────────────────────────────────────────────

export interface LeadFieldDatum {
  name: string;
  values: string[];
}

export interface FetchedLead {
  id: string;
  createdTime: string | null;
  fieldData: LeadFieldDatum[];
  /** "fb" or "ig" — which app the person was in. */
  platform: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  formId: string | null;
  /** Everything Meta returned, kept verbatim for forensics. */
  raw: Record<string, unknown>;
}

const GRAPH_VERSION = "v21.0";

/**
 * Retrieve one lead's answers.
 *
 * The token is a Page access token with `leads_retrieval`, passed as a
 * header rather than a query parameter so it cannot end up in an
 * access log, a redirect chain or an error string. Failures are
 * returned rather than thrown, because the caller must still answer
 * Meta promptly.
 */
export async function fetchLead(
  leadgenId: string,
  pageAccessToken: string | undefined,
  { fetchImpl = fetch }: { fetchImpl?: typeof fetch } = {},
): Promise<Result<FetchedLead>> {
  if (!pageAccessToken) return fail("internal", "Meta page access token is not configured.");

  // Names as well as ids: an ops notice that says "Canberra Extensions
  // Q3" is actionable, one that says "23847562934875" is not.
  const fields = [
    "id",
    "created_time",
    "field_data",
    "platform",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "form_id",
  ].join(",");
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}?fields=${fields}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: "no-store",
    });
  } catch (e) {
    return fail("internal", `Graph request failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  if (!res.ok) {
    // The body can carry Meta's own diagnostics, which are safe to log.
    // The token never appears in either the URL or the message.
    const detail = await res.text().catch(() => "");
    return fail(
      res.status === 400 || res.status === 403 ? "forbidden" : "internal",
      `Graph returned ${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  const fieldData = Array.isArray(json.field_data)
    ? (json.field_data as unknown[]).flatMap((f) => {
        const d = f as { name?: unknown; values?: unknown };
        const name = str(d.name);
        if (!name) return [];
        const values = Array.isArray(d.values)
          ? d.values.map((v) => String(v)).filter((v) => v.trim())
          : [];
        return [{ name, values }];
      })
    : [];

  return ok({
    id: str(json.id) ?? leadgenId,
    createdTime: str(json.created_time),
    fieldData,
    platform: str(json.platform),
    campaignId: str(json.campaign_id),
    campaignName: str(json.campaign_name),
    adsetId: str(json.adset_id),
    adsetName: str(json.adset_name),
    adId: str(json.ad_id),
    adName: str(json.ad_name),
    formId: str(json.form_id),
    raw: json,
  });
}

// ── mapping the answers onto a lead ─────────────────────────────────

export interface MappedLead {
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  /** Answers that did not map to a known column, keyed by field name. */
  extras: Record<string, string>;
  /** True when a required field could not be found. */
  incomplete: boolean;
}

/**
 * Field names are chosen by whoever built the Instant Form, and get
 * renamed without warning. So matching is by INTENT rather than by
 * exact name, and anything unrecognised is preserved in `extras`
 * instead of discarded — a question we did not anticipate is still an
 * answer somebody gave us.
 */
const MATCHERS: Array<{ key: keyof Omit<MappedLead, "extras" | "incomplete">; test: RegExp }> = [
  { key: "email", test: /^(email|e_?mail|email_address|work_email)$/i },
  { key: "phone", test: /(phone|mobile|telephone|contact_number|phone_number)/i },
  { key: "firstName", test: /^(first_?name|given_?name|firstname)$/i },
  { key: "lastName", test: /^(last_?name|surname|family_?name|lastname)$/i },
];

const FULL_NAME = /^(full_?name|name|your_?name)$/i;

export function mapLeadFields(fieldData: LeadFieldDatum[]): MappedLead {
  const out: MappedLead = {
    firstName: "",
    lastName: null,
    email: null,
    phone: null,
    extras: {},
    incomplete: false,
  };

  let fullName: string | null = null;

  for (const f of fieldData) {
    const value = f.values[0]?.trim();
    if (!value) continue;

    if (FULL_NAME.test(f.name)) {
      fullName = value;
      continue;
    }
    const match = MATCHERS.find((m) => m.test.test(f.name));
    if (match) {
      if (match.key === "email") out.email = value.toLowerCase();
      else if (match.key === "phone") out.phone = value;
      else if (match.key === "firstName") out.firstName = value;
      else out.lastName = value;
      continue;
    }
    out.extras[f.name] = value.slice(0, 500);
  }

  // A single "full name" answer is the common case; split it only when
  // no explicit first name was given, and never lose the remainder.
  if (!out.firstName && fullName) {
    const parts = fullName.split(/\s+/);
    out.firstName = parts[0]!;
    if (!out.lastName && parts.length > 1) out.lastName = parts.slice(1).join(" ");
  }

  // A lead with no name is still a lead. Writing "Unknown" and flagging
  // it beats refusing the row and losing the email address with it.
  if (!out.firstName) {
    out.firstName = "Unknown";
    out.incomplete = true;
  }
  if (!out.email) out.incomplete = true;

  return out;
}

/** Log without ever printing the person's details or our token. */
export function logLeadEvent(
  event: string,
  n: LeadgenNotification,
  extra: Record<string, unknown> = {},
): void {
  logger.info(
    { event, leadgenId: n.leadgenId, formId: n.formId, campaignId: n.campaignId, ...extra },
    event,
  );
}
