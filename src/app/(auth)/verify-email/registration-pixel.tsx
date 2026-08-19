"use client";

/**
 * The browser half of the registration conversion.
 *
 * The server reports every signup through the Conversions API, which
 * is the reliable half. This is the other one, and it is worth having
 * for two reasons: Meta matches a browser event against the click that
 * produced it using cookies the server can only partly reconstruct, and
 * a dataset receiving both halves of a conversion is scored as better
 * connected than one receiving either alone.
 *
 * It fires HERE rather than on the signup form because the form's
 * action ends in a redirect: it returns nothing to the client, so the
 * page that submitted it never learns the id the server used. The id
 * and the role travel in a short-lived http-only cookie instead, and
 * this page sends the matching half. Meta keeps one of the pair on
 * event name and id.
 *
 * They travelled in the query string until an audit pointed out that
 * the same redirect was also carrying the customer's email address,
 * and that the pixel reads the address bar on every event it sends.
 * Nothing about a new account belongs in a URL.
 *
 * Both values are still validated before anything is sent. We wrote
 * the cookie and the browser cannot, but a conversion built from
 * anything other than what the database was given is a conversion that
 * did not happen, and that is worth two lines of checking.
 */

import { useEffect } from "react";

import { trackMetaEvent } from "@/components/analytics/meta-pixel";
import {
  isAdvertisableRole,
  isRegistrationEventId,
  metaRegistrationParams,
} from "@/lib/meta-role";

/**
 * Conversions this document has already reported, by event id. React
 * runs an effect twice in development, a remount would run it again,
 * and while Meta discards the repeat on the id, a conversion should be
 * sent once because it happened once.
 */
const reported = new Set<string>();

export function RegistrationPixel({
  eventId,
  role,
}: {
  eventId?: string;
  role?: string;
}) {
  useEffect(() => {
    if (!eventId || !isRegistrationEventId(eventId)) return;
    if (!role || !isAdvertisableRole(role)) return;
    if (reported.has(eventId)) return;
    reported.add(eventId);
    // The same builder the server used, so the two reports carry the
    // same parameters and not merely the same id.
    trackMetaEvent("CompleteRegistration", metaRegistrationParams({ role }), eventId);
  }, [eventId, role]);

  return null;
}
