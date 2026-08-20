import { NextResponse, after, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import {
  ATTRIBUTION_COOKIE,
  SESSION_COOKIE,
  decodeAttribution,
} from "@/lib/attribution";
import { MAX_BATCH, recordEvents } from "@/modules/analytics/ingest";

/**
 * The first-party event sink.
 *
 * WHAT THE BROWSER IS TRUSTED WITH, AND WHAT IT IS NOT. The page sends
 * the name of the thing that happened, where it happened and the size of
 * the window. It does not send who it is or where it came from: the
 * anonymous id, the session and the whole attribution record are read
 * from the cookies on this request, server side, where a call site
 * cannot get them wrong and a stranger cannot forge them. Device class
 * comes off the user agent for the same reason.
 *
 * NOTHING HERE IDENTIFIES A PERSON. Paths are stored without their query
 * strings, under the same rule that governs the advertising tags, and
 * the application's own pages never reach this endpoint because the
 * tracker is not mounted there.
 */

/** Bounds, so a loose call site cannot fill the table. */
const MAX_NAME = 60;
const MAX_PATH = 200;
const MAX_PROP_KEYS = 12;
const MAX_PROP_LEN = 200;

interface Incoming {
  name?: unknown;
  path?: unknown;
  lens?: unknown;
  vw?: unknown;
  vh?: unknown;
  props?: unknown;
}

const LENSES = new Set(["homeowner", "builder", "architect"]);

/** Query strings never reach the table. */
function cleanPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  const cut = value.split(/[?#]/)[0] ?? "";
  return cut.slice(0, MAX_PATH) || null;
}

function cleanProps(
  value: unknown,
): Record<string, string | number | boolean | null> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string | number | boolean | null> = {};
  let n = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (n >= MAX_PROP_KEYS) break;
    if (typeof k !== "string" || k.length > 40) continue;
    if (typeof v === "string") out[k] = v.slice(0, MAX_PROP_LEN);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean" || v === null) out[k] = v;
    else continue;
    n += 1;
  }
  return n ? out : null;
}

function positiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  return n > 0 && n < 20000 ? n : null;
}

/**
 * Device class from the user agent. Coarse on purpose: the question this
 * answers is "did the layout fail on phones", not "which handset".
 */
function deviceClass(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|iphone|android.*mobile|windows phone/.test(s)) return "mobile";
  if (/bot|crawl|spider|headless|preview/.test(s)) return "bot";
  if (!s) return "unknown";
  return "desktop";
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = await limiters.events.limit(ip);
  if (!rl.success) return new NextResponse(null, { status: 429 });

  const body = (await req.json().catch(() => null)) as {
    events?: unknown;
  } | null;
  const incoming = Array.isArray(body?.events) ? body.events : null;
  if (!incoming || incoming.length === 0) {
    return new NextResponse(null, { status: 400 });
  }

  // Identity and attribution come from the request, never the payload.
  const jar = await cookies();
  const attribution = decodeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value);
  const sessionId = jar.get(SESSION_COOKIE)?.value?.slice(0, 64) ?? null;
  const device = deviceClass(req.headers.get("user-agent") ?? "");

  const rows = incoming.slice(0, MAX_BATCH).flatMap((raw) => {
    const e = raw as Incoming;
    if (typeof e.name !== "string" || !e.name.trim()) return [];
    const lens = typeof e.lens === "string" && LENSES.has(e.lens) ? e.lens : null;
    return [
      {
        name: e.name.trim().slice(0, MAX_NAME),
        anonId: attribution.aid ?? null,
        sessionId,
        path: cleanPath(e.path),
        lens,
        firstSource: attribution.first?.source ?? null,
        firstCampaign: attribution.first?.campaign ?? null,
        lastSource: attribution.last?.source ?? null,
        lastMedium: attribution.last?.medium ?? null,
        lastCampaign: attribution.last?.campaign ?? null,
        lastContent: attribution.last?.content ?? null,
        referrer: attribution.last?.referrer ?? null,
        device,
        viewportW: positiveInt(e.vw),
        viewportH: positiveInt(e.vh),
        props: cleanProps(e.props),
      },
    ];
  });

  if (rows.length === 0) return new NextResponse(null, { status: 400 });

  // The page does not wait for a database write to finish.
  after(() => recordEvents(rows));
  return new NextResponse(null, { status: 204 });
}
