"use client";

/**
 * The browser half of a registration, reported to both networks.
 *
 * WHY HERE. The signup form's action ends in a redirect, so it returns
 * nothing to the client and the page that submitted it never learns
 * what happened. Everything past this page is the signed-in
 * application, where no advertising tag mounts at all. This page is the
 * last moment a browser can report the conversion, and it is the first
 * moment it knows enough to.
 *
 * WHAT ARRIVES, AND FROM WHERE. The role, the event id and the hashed
 * email travel from the signup action in a short-lived http-only
 * cookie, read on the server and handed down as props. They used to
 * ride in the query string, until an audit pointed out the same
 * redirect was carrying the customer's email address in the clear.
 * Nothing about a new account belongs in an address bar.
 *
 * TWO NETWORKS, ONE TRIGGER, NO OVERLAP:
 *
 *   META  CompleteRegistration, under the same event id the server
 *         already used, so Meta keeps one of the pair rather than
 *         counting the conversion twice.
 *
 *   GOOGLE ADS  Owner Signup or Architect Signup, chosen by the role
 *         the database actually wrote. These are separate conversion
 *         actions so a campaign aimed at architects can bid toward
 *         architects. A builder reports nothing, because no action
 *         exists for them yet, which is better than being counted as
 *         somebody else.
 *
 * ENHANCED CONVERSIONS ARE MANUAL, DELIBERATELY. `user_data` is set
 * with a hash we computed ourselves, from an address we already had.
 * Google's automatic collection is not used and must stay switched off
 * in the conversion action: it works by scraping form fields on the
 * page, which is a mechanism that decides for itself what counts as an
 * email address, and this platform does not hand that decision to a
 * script it does not control.
 *
 * Everything is validated before anything is sent, and every send
 * happens once per document.
 */

import { useEffect, useRef } from "react";

import { trackMetaEvent } from "@/components/analytics/meta-pixel";
import { ensureGtag } from "@/components/analytics/google-analytics";
import { GOOGLE_ADS_ACCOUNT, googleAdsSignupSendTo, isSha256Hex } from "@/lib/google-ads";
import {
  isAdvertisableRole,
  isRegistrationEventId,
  metaRegistrationParams,
} from "@/lib/meta-role";

/**
 * Conversions this document has already reported, by event id. React
 * runs an effect twice in development and a remount would run it again;
 * a conversion should be sent once because it happened once.
 */
const reported = new Set<string>();

export function SignupConversions({
  eventId,
  role,
  emailSha256,
}: {
  eventId?: string;
  role?: string;
  emailSha256?: string;
}) {
  // Props are stable for the life of this page, but the guard reads
  // them inside the effect, so a ref keeps the effect honest without
  // widening its dependencies.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!eventId || !isRegistrationEventId(eventId)) return;
    if (!role || !isAdvertisableRole(role)) return;
    if (reported.has(eventId)) return;
    fired.current = true;
    reported.add(eventId);

    // Meta. The same builder the server used, so both reports of one
    // conversion agree parameter for parameter as well as on the id.
    trackMetaEvent("CompleteRegistration", metaRegistrationParams({ role }), eventId);

    // Google Ads. Nothing is sent for a role with no conversion action.
    const sendTo = googleAdsSignupSendTo(role);
    if (!sendTo) return;

    ensureGtag(GOOGLE_ADS_ACCOUNT);
    window.gtag?.("config", GOOGLE_ADS_ACCOUNT);

    // Enhanced conversions, set before the event so the conversion
    // carries it. Only a real hex SHA-256 is ever passed: anything else
    // would be sent as if it were a hashed address and would match
    // nobody, which reads as an audience problem rather than a bug.
    if (isSha256Hex(emailSha256)) {
      window.gtag?.("set", "user_data", { sha256_email_address: emailSha256 });
    }
    window.gtag?.("event", "conversion", { send_to: sendTo });
  }, [eventId, role, emailSha256]);

  return null;
}
