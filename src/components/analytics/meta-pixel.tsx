"use client";

/**
 * The Meta (Facebook) Pixel.
 *
 * Meta's copy-paste snippet assumes a document load per page view. This
 * is an App Router application, where the first page is a document load
 * and every page after it is a client-side transition, so the snippet
 * alone would report exactly one page view per visit no matter how far
 * the visitor travelled. The effect below closes that gap.
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
import Script from "next/script";

import { env } from "@/lib/env";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * The URL a PageView was last sent for, held at module scope so it
 * survives this component unmounting. A visitor crossing from a
 * marketing page to a login page leaves one route group and enters
 * another, which remounts the pixel; a ref would reset there and the
 * new page would be recorded as if it were a fresh landing.
 */
let lastTrackedPath: string | null = null;

export function MetaPixel() {
  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();

  /**
   * Transmission is tied to being mounted.
   *
   * `next/script` injects the tag once and leaves it in the document
   * when this component unmounts, which is the right behaviour for a
   * script that should not be re-executed but means fbevents.js stays
   * resident after a visitor crosses from a marketing page into the
   * signed-in application without a document load. No PageView is sent
   * there, because the effect below is gone with the component, but
   * Meta's automatic configuration can observe interactions on its own
   * once the library is present.
   *
   * Revoking consent on the way out closes that. It is Meta's own
   * documented switch, it holds every transmission rather than merely
   * suppressing the calls we make, and re-granting on mount restores
   * the pixel the moment the visitor returns to a public page. Without
   * it, the promise in section 12 of the privacy policy would hold for
   * a fresh load of an application URL and not for a navigation into
   * one.
   */
  useEffect(() => {
    if (!pixelId) return;
    window.fbq?.("consent", "grant");
    return () => {
      window.fbq?.("consent", "revoke");
    };
  }, [pixelId]);

  useEffect(() => {
    if (!pixelId || !pathname) return;
    // The base snippet sends the PageView for the URL the visitor
    // landed on. Record that one rather than repeating it, then send
    // one for each client-side navigation after it.
    if (lastTrackedPath === null) {
      lastTrackedPath = pathname;
      return;
    }
    if (lastTrackedPath === pathname) return;
    lastTrackedPath = pathname;
    window.fbq?.("track", "PageView");
  }, [pixelId, pathname]);

  if (!pixelId) return null;

  return (
    <>
      {/* Meta's base code, unmodified apart from the id. `afterInteractive`
          is next/script's default and the right one here: the pixel is not
          needed to render the page, and loading it before hydration would
          put a third-party network in front of the visitor's first paint. */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

/**
 * Send a Meta standard or custom event, for example a conversion:
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
