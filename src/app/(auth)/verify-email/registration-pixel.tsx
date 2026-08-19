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
 * and the role travel in the redirect instead, and this page sends the
 * matching half. Meta keeps one of the pair on event name and id.
 *
 * Both values are validated before anything is sent. They arrive
 * through a URL, which anyone can type, and a conversion built from an
 * arbitrary query string is a conversion that did not happen.
 */

import { useEffect } from "react";

import { trackMetaEvent } from "@/components/analytics/meta-pixel";
import {
  isAdvertisableRole,
  isRegistrationEventId,
  metaRegistrationParams,
} from "@/lib/meta-role";

export function RegistrationPixel({
  eventId,
  role,
}: {
  eventId?: string;
  role?: string;
}) {
  useEffect(() => {
    if (!isRegistrationEventId(eventId)) return;
    if (!role || !isAdvertisableRole(role)) return;
    // The same builder the server used, so the two reports carry the
    // same parameters and not merely the same id.
    trackMetaEvent("CompleteRegistration", metaRegistrationParams({ role }), eventId);
  }, [eventId, role]);

  return null;
}
