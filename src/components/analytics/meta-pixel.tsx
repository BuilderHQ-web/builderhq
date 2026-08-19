"use client";

/**
 * The Meta (Facebook) Pixel.
 *
 * Meta's copy-paste snippet assumes a document load per page view. This
 * is an App Router application, where the first page is a document load
 * and every page after it is a client-side transition, so the snippet
 * alone would report exactly one page view per visit no matter how far
 * the visitor travelled. The effect below closes that gap, and it is
 * also what boots the pixel in the first place.
 *
 * WHY THE BOOT MOVED HERE. Meta's snippet fires a PageView the instant
 * it runs, before any of our code has had a chance to look at the
 * address it is about to report, and the pixel offers no way to
 * override that address afterwards. Some of the addresses on this site
 * must never be reported at all: a password reset link, an account
 * claim, an invitation, an email verification. Each of those is a
 * secret written in path form, so no amount of stripping the query
 * saves them. Owning the boot is what makes the decision possible: on
 * a page that may not be reported, nothing loads and nothing is sent.
 *
 * WHERE IT MOUNTS. The marketing and auth surfaces only, never the
 * signed-in application. Two reasons, and both matter:
 *
 *   1. The privacy policy states, in section 12, that advertising tags
 *      are not present in the signed in application. Mounting here and
 *      nowhere else is what keeps that sentence true.
 *   2. Signed-in URLs carry project slugs (`/owner/projects/
 *      single-dwelling-pascoe-vale-south-vic/scope`), which name a
 *      client's project type and suburb. Meta reads the URL on every
 *      call, so mounting it there would hand a third-party advertising
 *      network the private detail this platform promises to hold back
 *      until a verified builder secures a spot.
 *
 * WHEN IT RUNS. Only when NEXT_PUBLIC_META_PIXEL_ID is set, which is
 * Vercel's Production scope alone. Development and preview browsing
 * therefore never reaches the live ad account, so audiences and
 * conversion counts stay clean without anyone remembering to be careful.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { env } from "@/lib/env";
import { isReportableTrackingUrl } from "@/lib/meta-url";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * Per document, not per mount. A visitor crossing from a marketing page
 * to a login page leaves one route group and enters another, which
 * remounts this component; state held in the component would reset
 * there and the pixel would be booted twice, or the new page recorded
 * as if it were a fresh landing.
 */
let booted = false;
let lastTrackedPath: string | null = null;

/**
 * Meta's base code, transcribed. It defines `fbq` as a queue
 * immediately, so calls made while fbevents.js is still downloading are
 * held and replayed rather than lost.
 */
function bootPixel(pixelId: string): void {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    const self = fbq as unknown as {
      callMethod?: (...a: unknown[]) => void;
      queue: unknown[][];
    };
    if (self.callMethod) self.callMethod(...args);
    else self.queue.push(args);
  } as unknown as Window["fbq"] & Record<string, unknown>;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq as Window["fbq"];
  if (!window._fbq) window._fbq = fbq;

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(tag);

  window.fbq?.("init", pixelId);
}

export function MetaPixel() {
  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();

  useEffect(() => {
    if (!pixelId || !pathname) return;

    // The query is read from the document rather than through
    // useSearchParams, which would opt every marketing page out of
    // static rendering for the sake of a measurement tag.
    if (!isReportableTrackingUrl(pathname, window.location.search)) {
      // Meta's own switch. It holds every transmission rather than
      // merely suppressing the calls we make, so automatic
      // configuration cannot report the address on its own either.
      window.fbq?.("consent", "revoke");
      return;
    }

    if (!booted) {
      booted = true;
      bootPixel(pixelId);
    }
    window.fbq?.("consent", "grant");

    if (lastTrackedPath !== pathname) {
      lastTrackedPath = pathname;
      window.fbq?.("track", "PageView");
    }

    /**
     * Transmission is tied to being mounted.
     *
     * fbevents.js stays resident once loaded, which is right for a
     * library that should not be re-executed but means it is still
     * present after a visitor crosses from a marketing page into the
     * signed-in application without a document load. No PageView is
     * sent there, because this effect is gone with the component, but
     * Meta's automatic configuration can observe interactions on its
     * own once the library is present.
     *
     * Revoking on the way out closes that, and re-granting above
     * restores the pixel the moment the visitor returns to a public
     * page. Without it, the promise in section 12 of the privacy
     * policy would hold for a fresh load of an application URL and not
     * for a navigation into one.
     */
    return () => {
      window.fbq?.("consent", "revoke");
    };
  }, [pixelId, pathname]);

  return null;
}

/**
 * Send an event of our own naming (Meta "custom event"). Campaigns can
 * optimise on these once volume exists; until then they are still
 * audience signals. Same guarantees as trackMetaEvent: a no-op when
 * the pixel is absent, never throws.
 */
export function trackMetaCustomEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  window.fbq?.("trackCustom", event, params);
}

/**
 * Send a Meta standard event, for example a conversion:
 *
 *   trackMetaEvent("CompleteRegistration", { content_name: "builder" });
 *
 * Safe to call anywhere on the client. It is a no-op when the pixel is
 * not configured, when it has not finished loading, and on the server,
 * so a call site never needs to guard.
 *
 * Never pass personal information. Meta's standard parameters expect
 * categories and values, and an email or an address in a parameter
 * would be a disclosure the privacy policy does not cover.
 */
export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
  /**
   * Shared with the server's report of the same conversion so Meta
   * keeps one of the pair. Omit it for browser-only events; pass the
   * id the server action returned whenever both halves fire, or the
   * conversion is counted twice.
   */
  eventId?: string,
): void {
  if (typeof window === "undefined") return;
  if (eventId) {
    window.fbq?.("track", event, params ?? {}, { eventID: eventId });
    return;
  }
  window.fbq?.("track", event, params);
}
