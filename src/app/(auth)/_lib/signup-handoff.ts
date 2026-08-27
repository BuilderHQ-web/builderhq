import "server-only";

/**
 * What the signup step tells the "check your inbox" page.
 *
 * The page has to name the address it just wrote to, offer to send the
 * link again, and send the browser's half of the registration
 * conversion under the id the server already used. All four values
 * used to travel in the query string, which put a customer's email
 * address in the address bar.
 *
 * That address bar is read by the advertising pixel on every event it
 * sends. Meta's Business Tools terms forbid receiving personal data in
 * the clear, Meta detects it automatically, and an address disclosed
 * to an overseas third party is a disclosure under the Australian
 * Privacy Principles whether or not anybody meant it. It also sat in
 * browser history, in referer headers to every third party the page
 * touches, and in any screenshot of the page.
 *
 * So it travels in a cookie instead: first party, http-only, scoped to
 * the one path that reads it, and gone in ten minutes. The URL that
 * remains is `/verify-email`, which says nothing about anybody.
 *
 * The continuation path travels with it for the same reason. An
 * invited builder's `next` is `/invite/b/<token>`, and a one-time
 * invitation token is not something to publish in an address bar
 * either.
 */

import { cookies } from "next/headers";

import { decodeCookieJson, encodeCookieJson } from "@/lib/cookie-json";
import { env } from "@/lib/env";
import { isSha256Hex } from "@/lib/google-ads";
import { isAdvertisableRole, isRegistrationEventId } from "@/lib/meta-role";
import { safeInternalPath } from "./next-path";

export const SIGNUP_HANDOFF_COOKIE = "bhq_signup";

/** Long enough to survive the redirect and a reload, and no longer. */
const MAX_AGE_SECONDS = 600;

/** An email address is at most 254 characters. */
const MAX_EMAIL_LENGTH = 254;

export interface SignupHandoff {
  /** The address the verification link went to. */
  email?: string;
  /**
   * The same SHA-256 of that address the Conversions API was given, so
   * Google's enhanced conversions can be matched on it. Hashed on the
   * server; the plaintext never reaches an advertising network.
   */
  emailSha256?: string;
  /** The conversion the server reported, so the browser can pair with it. */
  eventId?: string;
  /** The role that was actually written, for the advertising breakdown. */
  role?: string;
  /** Where the visitor was heading before they were asked to verify. */
  next?: string;
}

export async function setSignupHandoff(handoff: SignupHandoff): Promise<void> {
  const payload = {
    ...(handoff.email ? { e: handoff.email } : {}),
    ...(handoff.emailSha256 ? { h: handoff.emailSha256 } : {}),
    ...(handoff.eventId ? { v: handoff.eventId } : {}),
    ...(handoff.role ? { r: handoff.role } : {}),
    ...(handoff.next ? { n: handoff.next } : {}),
  };
  const store = await cookies();
  store.set(SIGNUP_HANDOFF_COOKIE, encodeCookieJson(payload), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/verify-email",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Read it back, checking every field.
 *
 * We wrote this cookie and it is http-only, so nothing here is
 * expected to fail. It is checked anyway: an event id and a role are
 * the two values that decide what a conversion reports, and a
 * conversion built from anything other than what the database was
 * given is a conversion that did not happen.
 */
export async function readSignupHandoff(): Promise<SignupHandoff> {
  const store = await cookies();
  const value = decodeCookieJson(store.get(SIGNUP_HANDOFF_COOKIE)?.value);
  if (!value) return {};

  const email =
    typeof value.e === "string" &&
    value.e.length <= MAX_EMAIL_LENGTH &&
    value.e.includes("@")
      ? value.e
      : undefined;
  const eventId =
    typeof value.v === "string" && isRegistrationEventId(value.v) ? value.v : undefined;
  const emailSha256 =
    typeof value.h === "string" && isSha256Hex(value.h) ? value.h : undefined;
  const role =
    typeof value.r === "string" && isAdvertisableRole(value.r) ? value.r : undefined;
  const next =
    typeof value.n === "string" ? (safeInternalPath(value.n) ?? undefined) : undefined;

  return {
    ...(email ? { email } : {}),
    ...(emailSha256 ? { emailSha256 } : {}),
    ...(eventId ? { eventId } : {}),
    ...(role ? { role } : {}),
    ...(next ? { next } : {}),
  };
}
