import "server-only";

/**
 * The Meta Conversions API — conversions reported from the server.
 *
 * WHY THIS EXISTS ALONGSIDE THE PIXEL. The browser pixel is the first
 * reporter and it is a lossy one: content blockers, privacy browsers and
 * iOS tracking rules all stop it, and on this platform there is a further
 * gap of our own making, because the pixel deliberately does not mount
 * inside the signed-in application. Signing up finishes on the far side
 * of that boundary, so the conversion that matters most to a campaign is
 * one the browser is in no position to report. The server always knows it
 * happened.
 *
 * DEDUPLICATION IS THE POINT OF THE DATASET ID. Where both reporters see
 * the same conversion, each sends the same `event_name` and `event_id`
 * into the same dataset, and Meta keeps one. Without that pairing every
 * such conversion is counted twice, which halves the apparent cost of
 * acquiring a customer: worse than having no server events at all,
 * because the number looks better while being wrong.
 *
 * NOTHING IDENTIFYING LEAVES IN THE CLEAR. Meta's matching parameters are
 * SHA-256 hashes of normalised values, and normalisation is part of the
 * contract, not a detail: a hash of "Jo@Example.com " and a hash of
 * "jo@example.com" share nothing, so casing and stray whitespace do not
 * merely reduce match quality, they destroy it. IP address and user agent
 * are sent as-is because Meta requires them unhashed.
 *
 * FAILURE IS ALWAYS SILENT TO THE CALLER. Every entry point returns void
 * and swallows its errors into the log. A marketing integration must
 * never be able to fail somebody's signup.
 */

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIpFromHeaders } from "@/lib/ratelimit";
import { sanitiseMetaSourceUrl } from "@/lib/meta-url";

/** Pinned rather than floating: a version bump can change field
 *  handling, and that should be a deliberate edit with a test behind
 *  it, never something that happens to us overnight. */
const GRAPH_API_VERSION = "v21.0";

/** Meta drops the request if it waits too long anyway, and this runs
 *  after the response, so a hung socket must not hold a serverless
 *  invocation open at our expense. */
const REQUEST_TIMEOUT_MS = 8_000;

export type MetaEventName =
  | "CompleteRegistration"
  | "Lead"
  | "Purchase"
  | "SubmitApplication"
  | (string & {});

export function isMetaCapiEnabled(): boolean {
  return Boolean(env.META_CAPI_ACCESS_TOKEN && env.META_DATASET_ID);
}

/* ── normalisation + hashing ─────────────────────────────────────────── */

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Hash a value Meta expects lowercased and trimmed (email, names). */
function hashPlain(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalised = value.trim().toLowerCase();
  return normalised.length > 0 ? sha256(normalised) : null;
}

/**
 * Phone numbers must reach Meta as digits including the country code,
 * so an Australian mobile written the way Australians write it
 * ("0412 345 678") has to become 61412345678 before hashing. Sending
 * the local form would hash to something no advertiser's copy of that
 * number could ever match.
 */
function hashPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = `61${digits.slice(1)}`;
  else if (!digits.startsWith("61") && digits.length <= 9) digits = `61${digits}`;
  return digits.length >= 8 ? sha256(digits) : null;
}

/** Meta wants the state as a lowercase code with no punctuation. */
function hashState(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalised = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  return normalised.length > 0 ? sha256(normalised) : null;
}

/* ── request context ─────────────────────────────────────────────────── */

export interface MetaRequestContext {
  ip: string | null;
  userAgent: string | null;
  /** Meta's browser id cookie, set by the pixel. */
  fbp: string | null;
  /** Meta's click id, from the cookie or rebuilt from an fbclid. */
  fbc: string | null;
  sourceUrl: string | null;
}

/**
 * Capture everything about the current request that Meta can match on.
 *
 * MUST be called during the request, not inside `after()`. The callback
 * there runs once the response is finished, where the request-scoped
 * header and cookie stores are no longer guaranteed to be readable, so
 * a context captured late is a context that silently arrives empty.
 */
export async function metaRequestContext(): Promise<MetaRequestContext> {
  try {
    const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);
    const fbp = cookieStore.get("_fbp")?.value ?? null;
    let fbc = cookieStore.get("_fbc")?.value ?? null;

    // A visitor arriving from an ad carries `fbclid` in the URL, and the
    // pixel turns it into the _fbc cookie. On the first request that
    // cookie does not exist yet, so where the click id is on the URL and
    // the cookie is not, rebuild it in Meta's documented shape. This is
    // the single highest-value matching signal for paid traffic: without
    // it the click and the conversion are two unrelated events.
    if (!fbc) {
      const referer = hdrs.get("referer");
      const fbclid = referer ? new URL(referer).searchParams.get("fbclid") : null;
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    }

    return {
      ip: clientIpFromHeaders(hdrs) || null,
      userAgent: hdrs.get("user-agent") ?? null,
      fbp,
      fbc,
      sourceUrl: hdrs.get("referer") ?? null,
    };
  } catch {
    // Called outside a request scope. The event is still worth sending;
    // it simply matches on the hashed identity alone.
    return { ip: null, userAgent: null, fbp: null, fbc: null, sourceUrl: null };
  }
}

/* ── sending ─────────────────────────────────────────────────────────── */

export interface MetaConversionInput {
  eventName: MetaEventName;
  /**
   * Shared with the browser event for the same conversion so Meta keeps
   * one of the pair. Use `metaEventId()` and hand the same string to
   * both reporters; a random value on each side deduplicates nothing.
   */
  eventId: string;
  context: MetaRequestContext;
  /** Raw values. Hashing happens here so no caller has to remember. */
  user?: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    state?: string | null;
    /** Our own stable id for the person, hashed like the rest. */
    externalId?: string | null;
  };
  /** Meta's non-identifying event parameters (content_name, value...). */
  customData?: Record<string, unknown>;
  /** Overrides the referer when the caller knows the true page. */
  sourceUrl?: string | null;
}

/** A dedup key shared by the browser and server halves of one event. */
export function metaEventId(prefix: string, unique: string): string {
  return `${prefix}.${unique}`;
}

/**
 * Report one conversion. Returns void and never throws: call it from
 * inside `after()` so it cannot add latency to the response either.
 */
export async function sendMetaConversion(
  input: MetaConversionInput,
): Promise<void> {
  const token = env.META_CAPI_ACCESS_TOKEN;
  const datasetId = env.META_DATASET_ID;
  if (!token || !datasetId) return;

  const u = input.user ?? {};
  // Meta reads each matching parameter as an array of hashes.
  const userData: Record<string, unknown> = {};
  const put = (key: string, hash: string | null) => {
    if (hash) userData[key] = [hash];
  };
  put("em", hashPlain(u.email));
  put("ph", hashPhone(u.phone));
  put("fn", hashPlain(u.firstName));
  put("ln", hashPlain(u.lastName));
  put("st", hashState(u.state));
  put("country", hashPlain(u.state ? "au" : null));
  put("external_id", hashPlain(u.externalId));

  // Never hashed, by Meta's specification.
  if (input.context.ip) userData.client_ip_address = input.context.ip;
  if (input.context.userAgent) userData.client_user_agent = input.context.userAgent;
  if (input.context.fbp) userData.fbp = input.context.fbp;
  if (input.context.fbc) userData.fbc = input.context.fbc;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        // Stripped to the campaign parameters, and dropped entirely
        // for a path that is itself a secret. See lib/meta-url.
        event_source_url: sanitiseMetaSourceUrl(
          input.sourceUrl ?? input.context.sourceUrl,
        ),
        user_data: userData,
        ...(input.customData ? { custom_data: input.customData } : {}),
      },
    ],
    access_token: token,
  };
  // Present only while verifying: it diverts the event to the Test
  // Events tab instead of the live stream.
  if (env.META_TEST_EVENT_CODE) {
    payload.test_event_code = env.META_TEST_EVENT_CODE;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${datasetId}/events`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      // Meta answers a rejected event with a specific diagnosis. Losing
      // it to a bare status code would leave a silently broken
      // integration looking exactly like a quiet one.
      const body = await res.text().catch(() => "");
      logger.warn(
        {
          event: "meta.capi.rejected",
          eventName: input.eventName,
          status: res.status,
          body: body.slice(0, 500),
        },
        "Meta rejected a conversion event",
      );
      return;
    }
    logger.info(
      {
        event: "meta.capi.sent",
        eventName: input.eventName,
        eventId: input.eventId,
        test: Boolean(env.META_TEST_EVENT_CODE),
        matched: Object.keys(userData),
      },
      "conversion reported to Meta",
    );
  } catch (err) {
    logger.warn(
      {
        event: "meta.capi.failed",
        eventName: input.eventName,
        msg: err instanceof Error ? err.message : String(err),
      },
      "could not reach the Meta Conversions API",
    );
  } finally {
    clearTimeout(timer);
  }
}
