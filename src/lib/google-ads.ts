/**
 * Google Ads conversion actions.
 *
 * The mirror of lib/meta-role: one place that decides which conversion
 * a new account reports, chosen by the role the database actually
 * wrote, never by anything the browser could claim.
 *
 * WHY THE ROLE DECIDES. Owner Signup and Architect Signup are separate
 * conversion actions in Google Ads so that a campaign aimed at
 * architects can bid toward architects rather than toward whoever
 * happens to register. Sending one action for both would collapse that
 * distinction and there would be no way to recover it later.
 *
 * BUILDERS HAVE NO ACTION YET. No conversion action was created for
 * them, so a builder signup reports nothing rather than being counted
 * as somebody else. Add the label here the day one exists.
 */

/** The Google tag, already live on the site. */
export const GOOGLE_ADS_ACCOUNT = "AW-18140811034";

/**
 * Conversion labels, keyed by the role stored on the user row. These
 * are the values Google Ads generated for each conversion action; they
 * are not secret and they are not interchangeable.
 */
const SIGNUP_LABELS: Readonly<Record<string, string>> = {
  project_owner: "syr_CP222OQcEJqem8pD",
  architect: "MCnHCPi32OQcEJqem8pD",
};

/**
 * The `send_to` for a new account, or null when this role has no
 * conversion action. Null is a deliberate outcome, not a failure.
 */
export function googleAdsSignupSendTo(
  role: string | null | undefined,
): string | null {
  if (!role) return null;
  const label = SIGNUP_LABELS[role];
  return label ? `${GOOGLE_ADS_ACCOUNT}/${label}` : null;
}

/** A hex SHA-256, and nothing else, may be sent as user data. */
export function isSha256Hex(value: string | null | undefined): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
