import { NextResponse, after, type NextRequest } from "next/server";

import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import {
  metaRequestContext,
  sendMetaConversion,
} from "@/lib/meta-capi";
import { isMetaViewEventId, metaLensContentName, type LandingLens } from "@/lib/meta-role";

/**
 * The server half of a landing-page view.
 *
 * WHY A ROUTE AND NOT THE PAGE. The obvious place to report a page
 * view from the server is the page itself, and it is the wrong place.
 * A landing route renders for crawlers, uptime checks and Meta's own
 * link scraper, none of which are visitors, and a Conversions API
 * event fired from the render counts every one of them. The architect
 * campaign optimises against this event, so an inflated count does not
 * merely look wrong, it teaches the algorithm to buy the wrong people.
 *
 * Reporting from a request the browser makes means only something that
 * ran JavaScript is ever counted, and it carries the same cookies and
 * headers the page did, so `_fbp`, `_fbc`, the IP and the user agent
 * all reach Meta exactly as they would have.
 *
 * The browser sends the event id it used for its own half, so Meta
 * keeps one of the pair.
 */

const LENSES: readonly LandingLens[] = ["homeowner", "builder", "architect"];

export async function POST(req: NextRequest) {
  // Nothing here is authenticated, so it is rate limited: the endpoint
  // reports a conversion-adjacent event and must not become a way to
  // manufacture them.
  const ip = clientIpFromHeaders(req.headers);
  const rl = await limiters.metaLensView.limit(ip);
  if (!rl.success) return new NextResponse(null, { status: 429 });

  const body = (await req.json().catch(() => null)) as {
    lens?: unknown;
    eventId?: unknown;
  } | null;

  const lens = body?.lens;
  const eventId = body?.eventId;
  if (typeof lens !== "string" || !LENSES.includes(lens as LandingLens)) {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof eventId !== "string" || !isMetaViewEventId(eventId)) {
    return new NextResponse(null, { status: 400 });
  }

  // Captured during the request, while the headers and cookies are
  // still readable; `after` runs once this response is finished.
  const context = await metaRequestContext();
  after(() =>
    sendMetaConversion({
      eventName: "ViewContent",
      eventId,
      context,
      customData: {
        content_name: metaLensContentName(lens as LandingLens),
        content_category: "landing",
      },
    }),
  );

  // Nothing to say back. The browser has already sent its half and does
  // not wait on this.
  return new NextResponse(null, { status: 204 });
}
