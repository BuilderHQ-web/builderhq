"use client";

/**
 * Remember where every visitor came from.
 *
 * The campaign parameters exist on the page an advertisement points at
 * and nowhere else. By the time somebody has read the page, watched the
 * demo and reached the signup form the URL is `/signup?role=architect`,
 * and by the time they come back a week later to actually create the
 * account there is nothing left at all.
 *
 * So the visit is folded into a first-party record on every page view:
 * first touch kept forever, last touch updated by any later visit that
 * names a campaign of its own. The signup action reads it on the server.
 *
 * No personal data is involved. The values are ones we wrote into our
 * own advertisements, plus a referring hostname and a landing path.
 *
 * It mounts beside the pixel, on the marketing and auth surfaces only.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { recordVisit } from "@/lib/attribution-client";

export function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      recordVisit();
    } catch {
      /* Measurement must never break a page. */
    }
  }, [pathname]);

  return null;
}
