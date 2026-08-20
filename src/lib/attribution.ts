/**
 * Where a visitor came from, kept for as long as it takes them to decide.
 *
 * A campaign lands somebody on `/for/architects?utm_source=meta&
 * utm_campaign=architects-vic`. They read, they watch the demo, they close
 * the tab. Nine days later they come back through a Google search and
 * create an account. Every advertising platform will score that as
 * organic, because every advertising platform only remembers its own
 * click. The campaign that actually paid for the customer gets no credit,
 * the channel looks unprofitable, and the honest response to a report
 * like that is to switch off the thing that was working.
 *
 * This is the record that prevents it.
 *
 * TWO TOUCHES, NOT ONE. First touch is written once and never changed:
 * it names the campaign that introduced us. Last touch is rewritten by
 * any later visit that carries campaign parameters of its own: it names
 * the campaign that closed. Reporting on only one of them is how
 * channels get defunded for other channels' work, so we keep both and
 * let the analysis choose.
 *
 * WHAT IS NOT IN HERE. No name, no address, no page a visitor read, no
 * query string beyond the campaign keys. The referrer is reduced to a
 * hostname and the landing page to a path, because `?email=` in a
 * referrer is exactly the disclosure the tracking audit just closed.
 * See lib/meta-url for the same rule applied to advertising events.
 */

import { decodeCookieJson, encodeCookieJson } from "./cookie-json";

/** The campaign keys a URL is allowed to carry. */
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

/** The attribution record. First party, 400 days, no personal data. */
export const ATTRIBUTION_COOKIE = "bhq_at";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 400;

/** Yesterday's two-field cookie, read once so live traffic is not lost. */
export const LEGACY_UTM_COOKIE = "bhq_utm";

/** The visit. Thirty minutes idle ends it, which is the industry default. */
export const SESSION_COOKIE = "bhq_sid";
export const SESSION_MAX_AGE = 60 * 30;

/** Long enough for any real campaign name, short enough to bound the cookie. */
const MAX_FIELD = 120;

export interface Touch {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  /** Hostname only. A full referring URL can carry somebody's details. */
  referrer?: string;
  /** Path only, no query, for the same reason. */
  landing?: string;
  /** ISO 8601. */
  at?: string;
}

export interface Attribution {
  /** Anonymous id. The join between a stranger and, later, an account. */
  aid?: string;
  first?: Touch;
  last?: Touch;
  /** Click ids, kept because they are the platforms' own join keys. */
  gclid?: string;
  fbclid?: string;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_FIELD);
  return trimmed || undefined;
}

/** Short keys: this rides in a cookie on every request to our own origin. */
function packTouch(t: Touch): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, v: string | undefined) => {
    const c = clean(v);
    if (c) out[k] = c;
  };
  put("s", t.source);
  put("m", t.medium);
  put("c", t.campaign);
  put("n", t.content);
  put("t", t.term);
  put("r", t.referrer);
  put("l", t.landing);
  put("a", t.at);
  return out;
}

function unpackTouch(raw: unknown): Touch | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const touch: Touch = {};
  const put = <K extends keyof Touch>(key: K, value: unknown) => {
    const c = clean(value);
    if (c) touch[key] = c as Touch[K];
  };
  put("source", v.s);
  put("medium", v.m);
  put("campaign", v.c);
  put("content", v.n);
  put("term", v.t);
  put("referrer", v.r);
  put("landing", v.l);
  put("at", v.a);
  return Object.keys(touch).length ? touch : undefined;
}

/**
 * A cookie may not exceed 4KB, and a browser that is handed a larger one
 * simply does not store it. Attribution would then silently reset to
 * direct on the next page, which is the exact failure this file exists
 * to prevent, so the record is budgeted rather than trusted to be small.
 */
const COOKIE_BUDGET = 1800;

function pack(record: Attribution): Record<string, unknown> {
  const packed: Record<string, unknown> = {};
  if (record.aid) packed.i = record.aid;
  if (record.first) packed.f = packTouch(record.first);
  if (record.last) packed.l = packTouch(record.last);
  if (record.gclid) packed.g = record.gclid;
  if (record.fbclid) packed.b = record.fbclid;
  return packed;
}

/** Just enough to still credit the right campaign. */
function essential(t: Touch | undefined): Touch | undefined {
  if (!t) return undefined;
  const slim: Touch = {};
  if (t.source) slim.source = t.source;
  if (t.medium) slim.medium = t.medium;
  if (t.campaign) slim.campaign = t.campaign;
  if (t.at) slim.at = t.at;
  return Object.keys(slim).length ? slim : undefined;
}

export function encodeAttribution(record: Attribution): string {
  const full = encodeCookieJson(pack(record));
  if (full.length <= COOKIE_BUDGET) return full;

  // Over budget. Shed the descriptive fields, keep the ones that decide
  // which campaign gets credit.
  const slim: Attribution = {
    ...(record.aid ? { aid: record.aid } : {}),
    ...(essential(record.first) ? { first: essential(record.first) } : {}),
    ...(essential(record.last) ? { last: essential(record.last) } : {}),
  };
  const reduced = encodeCookieJson(pack(slim));
  if (reduced.length <= COOKIE_BUDGET) return reduced;

  // Still over, which takes deliberate abuse. Keep the identity alone:
  // a visitor we can still follow beats no cookie at all.
  return encodeCookieJson(pack(record.aid ? { aid: record.aid } : {}));
}

/**
 * Read the record back. Anything malformed reads as no attribution: a
 * broken cookie must never be the reason a signup fails.
 */
export function decodeAttribution(
  cookieValue: string | null | undefined,
): Attribution {
  const raw = decodeCookieJson(cookieValue);
  if (!raw) return {};
  const out: Attribution = {};
  const aid = clean(raw.i);
  const first = unpackTouch(raw.f);
  const last = unpackTouch(raw.l);
  const gclid = clean(raw.g);
  const fbclid = clean(raw.b);
  if (aid) out.aid = aid;
  if (first) out.first = first;
  if (last) out.last = last;
  if (gclid) out.gclid = gclid;
  if (fbclid) out.fbclid = fbclid;
  return out;
}

/**
 * Yesterday's cookie, so the traffic already bought by the live campaigns
 * keeps its attribution instead of resetting to direct.
 */
export function decodeLegacyUtm(
  cookieValue: string | null | undefined,
): Touch | undefined {
  const raw = decodeCookieJson(cookieValue);
  if (!raw) return undefined;
  const source = clean(raw.s);
  const campaign = clean(raw.c);
  if (!source && !campaign) return undefined;
  return {
    ...(source ? { source } : {}),
    ...(campaign ? { campaign } : {}),
  };
}

/** True when this visit names a campaign, and so may rewrite last touch. */
export function isCampaignTouch(touch: Touch): boolean {
  return Boolean(touch.source || touch.medium || touch.campaign);
}

/**
 * Fold the current visit into whatever we already knew.
 *
 * First touch is set once. Last touch moves only for a visit that names a
 * campaign, so an idle return through a bookmark does not overwrite the
 * advertisement that paid for the introduction.
 */
export function mergeAttribution(
  existing: Attribution,
  visit: Touch,
  ids: { gclid?: string; fbclid?: string },
  newId: () => string,
): Attribution {
  const next: Attribution = {
    aid: existing.aid ?? newId(),
    ...(existing.first ? { first: existing.first } : {}),
    ...(existing.last ? { last: existing.last } : {}),
    ...(existing.gclid ? { gclid: existing.gclid } : {}),
    ...(existing.fbclid ? { fbclid: existing.fbclid } : {}),
  };
  if (!next.first) next.first = visit;
  if (isCampaignTouch(visit) || !next.last) next.last = visit;
  if (ids.gclid) next.gclid = ids.gclid;
  if (ids.fbclid) next.fbclid = ids.fbclid;
  return next;
}

/**
 * The visit, read from a URL and a referrer.
 *
 * `referrer` is reduced to its hostname and the URL to its path. Neither
 * a query string nor a fragment survives, here or anywhere else that
 * leaves this origin.
 */
export function readTouch(
  href: string,
  referrer: string,
  now: string,
): { touch: Touch; gclid?: string; fbclid?: string } {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { touch: { at: now } };
  }
  const p = url.searchParams;
  const touch: Touch = { at: now, landing: url.pathname };

  const put = <K extends keyof Touch>(key: K, value: string | null) => {
    const c = clean(value);
    if (c) touch[key] = c as Touch[K];
  };
  put("source", p.get("utm_source"));
  put("medium", p.get("utm_medium"));
  put("campaign", p.get("utm_campaign"));
  put("content", p.get("utm_content"));
  put("term", p.get("utm_term"));

  // An external referrer, reduced to a hostname. Our own pages are not a
  // source of traffic to ourselves.
  if (referrer) {
    try {
      const ref = new URL(referrer);
      if (ref.hostname && ref.hostname !== url.hostname) {
        touch.referrer = ref.hostname.slice(0, MAX_FIELD);
      }
    } catch {
      /* an unparseable referrer is no referrer */
    }
  }

  const gclid = clean(p.get("gclid"));
  const fbclid = clean(p.get("fbclid"));
  return {
    touch,
    ...(gclid ? { gclid } : {}),
    ...(fbclid ? { fbclid } : {}),
  };
}
