/**
 * analytics — one call site, every destination.
 *
 * Every conversion-relevant moment on the public site goes through
 * `track()`, so the event vocabulary lives in one place, call sites never
 * crash if a destination is blocked, and adding a fourth destination is
 * one edit here rather than thirteen edits across the landing pages.
 *
 * Destinations today:
 *   Vercel Web Analytics — quick traffic reads, no configuration
 *   Our own database     — the record that joins to accounts and survives
 *                          ad blockers, via /api/events
 *
 * Event vocabulary (keep this list current):
 *   lens_selected            { role, source: "selector" | "nav" }
 *   hero_cta                 { role, label }
 *   close_cta                { role, label }
 *   demo_cta_click           { lens, placement, destination }
 *   partner_modal_opened     { mode }        — architect | finance | intro
 *   partner_modal_submitted  { mode }
 *   section_viewed           { id }          — once per section per pageview
 *   demo_opened              { script }
 *   demo_stage               { stage }
 *   demo_completed           { script }
 *   demo_skipped_to_end      { script }
 *   demo_signup_click        { }
 *
 * WHAT A CALL SITE MAY PASS. Categories, labels and numbers. Never a
 * name, an address, or anything a person typed. The server strips query
 * strings from the path it records and reads identity from cookies
 * rather than from anything sent here, but the rule still holds at the
 * call site: nothing personal goes into an event.
 */

import { track as vercelTrack } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null>;

interface Queued {
  name: string;
  path: string;
  lens?: string;
  vw?: number;
  vh?: number;
  props?: EventProps;
}

/**
 * Events are batched rather than sent one by one. A visitor scrolling a
 * landing page can generate a dozen in a few seconds, and a dozen
 * requests to say so is rude to their connection and to our own edge.
 */
const FLUSH_AFTER_MS = 1500;
const FLUSH_AT_COUNT = 10;
/** Matches the server's cap, so a batch is never silently truncated. */
const MAX_BATCH = 20;

let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function send(batch: Queued[], viaBeacon: boolean): void {
  if (batch.length === 0) return;
  const body = JSON.stringify({ events: batch });
  try {
    // On the way out of the page, a beacon is the only thing the browser
    // promises to deliver. Everywhere else `keepalive` does the same job
    // and lets us skip a blob allocation.
    if (viaBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* measurement must never surface to a visitor */
    });
  } catch {
    /* nor must it ever throw */
  }
}

function flush(viaBeacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = queue;
  queue = [];
  for (let i = 0; i < batch.length; i += MAX_BATCH) {
    send(batch.slice(i, i + MAX_BATCH), viaBeacon);
  }
}

/**
 * A visitor who clicks a link and leaves takes the queue with them
 * unless we flush on the way out. `pagehide` fires where `unload` is
 * unreliable, and the hidden state covers a tab being backgrounded on a
 * phone, which is how most mobile sessions actually end.
 */
function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}

/**
 * Which of the three stories the visitor was reading.
 *
 * It is the one dimension every report on this site groups by, so it
 * gets its own column rather than living in a property bag. Call sites
 * spell it three different ways for good reasons of their own: the
 * landing calls it `role`, the demo calls it `script`, and the demo CTA
 * calls it `lens`. All three mean the same thing here.
 */
const LENSES = new Set(["homeowner", "builder", "architect"]);

function lensOf(props: EventProps | undefined): string | null {
  if (!props) return null;
  for (const key of ["lens", "role", "script"] as const) {
    const v = props[key];
    if (typeof v === "string" && LENSES.has(v)) return v;
  }
  return null;
}

export function track(event: string, props?: EventProps): void {
  // Vercel's own event stream, unchanged.
  try {
    vercelTrack(event, props);
  } catch {
    /* Analytics must never break the page. */
  }

  if (typeof window === "undefined") return;
  try {
    listen();
    queue.push({
      name: event,
      path: window.location.pathname,
      ...(lensOf(props) ? { lens: lensOf(props)! } : {}),
      vw: window.innerWidth,
      vh: window.innerHeight,
      ...(props && Object.keys(props).length ? { props } : {}),
    });
    if (queue.length >= FLUSH_AT_COUNT) {
      flush();
      return;
    }
    if (!timer) timer = setTimeout(() => flush(), FLUSH_AFTER_MS);
  } catch {
    /* never break a page for a measurement */
  }
}
