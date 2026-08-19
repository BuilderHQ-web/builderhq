"use client";

/**
 * ViewContent, once per landing page view.
 *
 * The landing page is three stories wearing one URL: `/` opens on the
 * homeowner story, `/for/architects` on the designer's, `/for/builders`
 * on the builder's. A PageView cannot tell those apart, so a campaign
 * pointed at one audience cannot see whether the audience it paid for
 * ever read its own page. This reports which story was served.
 *
 * IT REPORTS THE LENS THE PAGE WAS SERVED WITH, and not whatever the
 * visitor later switches to with the selector. That is deliberate. The
 * architect campaign optimises against `architect_lens`, and if idle
 * toggling counted, the signal it learns from would fill up with people
 * who are not architects, which is worse than a smaller signal.
 *
 * ONCE, AND ONLY ONCE. The guard is module scope and keyed by path and
 * lens, so a re-render does not repeat it, an effect replayed in
 * development does not repeat it, and navigating away and back does not
 * repeat it. A genuine new visit is a new document and a new module.
 *
 * BOTH HALVES, ONE ID. The browser sends its own event and asks the
 * server to send the matching one under the same id, so Meta keeps one
 * of the pair. The server half goes through a route rather than the
 * page render, so crawlers, uptime checks and link scrapers, which
 * never run this code, are never counted as visitors.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackMetaEvent } from "@/components/analytics/meta-pixel";
import { metaLensContentName, type LandingLens } from "@/lib/meta-role";

/** Views already reported by this document, as `path::lens`. */
const reported = new Set<string>();

function viewEventId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `view.${rand}`;
}

export function LensView({ lens }: { lens: LandingLens }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const key = `${pathname}::${lens}`;
    if (reported.has(key)) return;
    reported.add(key);

    const eventId = viewEventId();
    const params = {
      content_name: metaLensContentName(lens),
      content_category: "landing",
    };

    // The browser's half, through the consent-gated wrapper: a no-op
    // unless the pixel is configured and mounted.
    trackMetaEvent("ViewContent", params, eventId);

    // The server's half, under the same id. Fire and forget: a failed
    // beacon must never be visible to the visitor, and nothing on the
    // page waits for it.
    void fetch("/api/meta/lens-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lens, eventId }),
      keepalive: true,
    }).catch(() => {
      /* measurement must never break a page */
    });
  }, [pathname, lens]);

  return null;
}
