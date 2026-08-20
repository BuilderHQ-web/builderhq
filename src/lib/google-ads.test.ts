/**
 * Google Ads conversions, pinned.
 *
 * A conversion action reported for the wrong role does not throw. It
 * shows up weeks later as a campaign bidding toward the wrong audience,
 * and by then the bidding model has learnt from it. The same is true of
 * an enhanced conversion hashed even slightly differently: it is not
 * rejected, it simply matches nobody.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import {
  GOOGLE_ADS_ACCOUNT,
  googleAdsSignupSendTo,
  isSha256Hex,
} from "./google-ads";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("which conversion action a signup reports", () => {
  test("each role Google has an action for reports its own", () => {
    expect(googleAdsSignupSendTo("project_owner")).toBe(
      "AW-18140811034/syr_CP222OQcEJqem8pD",
    );
    expect(googleAdsSignupSendTo("architect")).toBe(
      "AW-18140811034/MCnHCPi32OQcEJqem8pD",
    );
  });

  test("the two actions are never the same", () => {
    // One label pasted twice would silently merge two audiences.
    expect(googleAdsSignupSendTo("project_owner")).not.toBe(
      googleAdsSignupSendTo("architect"),
    );
  });

  test("a role with no action reports nothing rather than something wrong", () => {
    // No builder action exists yet. Falling back to another role's label
    // would teach a campaign to buy the wrong people.
    expect(googleAdsSignupSendTo("builder")).toBeNull();
    expect(googleAdsSignupSendTo("admin")).toBeNull();
    expect(googleAdsSignupSendTo("owner")).toBeNull(); // mapped value, not a stored role
    expect(googleAdsSignupSendTo("")).toBeNull();
    expect(googleAdsSignupSendTo(null)).toBeNull();
    expect(googleAdsSignupSendTo(undefined)).toBeNull();
  });

  test("it is the account already live on the site", () => {
    expect(GOOGLE_ADS_ACCOUNT).toBe("AW-18140811034");
    for (const rel of [
      "../app/(marketing)/guide-confirmed/confirmed-conversion.tsx",
      "../app/(marketing)/book-a-call/confirmed/book-confirmed.tsx",
    ]) {
      expect(read(rel), rel).toContain("AW-18140811034");
    }
  });

  test("the signup labels collide with no existing conversion action", () => {
    // Reusing a lead-magnet label would count a signup as a guide
    // download and inflate both.
    const src = [
      read("../app/(marketing)/guide-confirmed/confirmed-conversion.tsx"),
      read("../app/(marketing)/architect-tender-confirmed/confirmed-conversion.tsx"),
      read("../app/(marketing)/book-a-call/confirmed/book-confirmed.tsx"),
    ].join("\n");
    for (const label of ["syr_CP222OQcEJqem8pD", "MCnHCPi32OQcEJqem8pD"]) {
      expect(src, label).not.toContain(label);
    }
  });
});

describe("the enhanced conversion hash", () => {
  test("only a real hex SHA-256 is accepted", () => {
    expect(isSha256Hex("a".repeat(64))).toBe(true);
    expect(isSha256Hex("A".repeat(64))).toBe(false); // uppercase is not what we emit
    expect(isSha256Hex("a".repeat(63))).toBe(false);
    expect(isSha256Hex("jo@example.com")).toBe(false);
    expect(isSha256Hex(null)).toBe(false);
    expect(isSha256Hex(undefined)).toBe(false);
  });

  test("Google and Meta receive the identical hash for the same person", () => {
    // Both networks specify trim, lowercase, SHA-256, hex. That is why
    // one value can serve both, and it is the reason the preparation
    // lives in one module rather than two that happen to agree.
    const expected = createHash("sha256")
      .update("jo@example.com", "utf8")
      .digest("hex");
    for (const written of ["  Jo@Example.com  ", "JO@EXAMPLE.COM", "jo@example.com"]) {
      const normalised = written.trim().toLowerCase();
      expect(createHash("sha256").update(normalised, "utf8").digest("hex")).toBe(expected);
    }
    expect(isSha256Hex(expected)).toBe(true);
  });

  test("one module prepares it, and the Conversions API uses that module", () => {
    const capi = read("./meta-capi.ts");
    expect(capi).toContain("hash-identity");
    // Email and names delegate to the shared preparation rather than
    // keeping a private copy that could drift from Google's.
    expect(capi).toContain("const hashPlain = hashNormalised");
    // hashState stays local on purpose: it strips punctuation, which is
    // a Meta-only rule, and no state is ever sent to Google.
    expect(capi).toContain("function hashState");
  });
});

describe("how the conversion is fired", () => {
  const comp = read("../app/(auth)/verify-email/signup-conversions.tsx");

  test("enhanced conversions are manual, and set before the event", () => {
    expect(comp).toContain('"set", "user_data"');
    expect(comp).toContain("sha256_email_address");
    const set = comp.indexOf('"set", "user_data"');
    const event = comp.indexOf('"event", "conversion"');
    expect(set).toBeGreaterThan(-1);
    expect(event).toBeGreaterThan(-1);
    expect(set).toBeLessThan(event);
  });

  test("nothing in the codebase turns on automatic collection", () => {
    // Google's automatic enhanced conversions scrape form fields and
    // decide for themselves what is an email address. We do not use it.
    expect(comp).not.toContain("allow_enhanced_conversions");
    expect(comp).not.toContain("enhanced_conversion_data");
  });

  test("an unhashed address can never be passed as user data", () => {
    expect(comp).toContain("isSha256Hex(emailSha256)");
    // The component is never handed a plaintext address at all.
    expect(comp).not.toContain("email:");
  });

  test("the role decides, and it comes from the server", () => {
    expect(comp).toContain("googleAdsSignupSendTo(role)");
    const page = read("../app/(auth)/verify-email/page.tsx");
    expect(page).toContain("readSignupHandoff()");
    expect(page).toContain("emailSha256");
  });

  test("one script load, two destinations, each configured by its own caller", () => {
    // The Google tag is one library serving several products. GA4 and
    // Google Ads are separate destinations on it, so whichever mounts
    // first fetches the script and each adds its own `config`. Fetching
    // it once per id would be a second copy for no benefit.
    const ga = read("../components/analytics/google-analytics.tsx");
    expect(ga).toContain("let scriptLoaded = false");
    expect(ga).toContain('gtag/js?id=${tagId}');
    // GA4 configures its own measurement id...
    expect(ga).toContain('"config", measurementId');
    // ...and the conversion component configures the Ads account.
    expect(comp).toContain("ensureGtag(GOOGLE_ADS_ACCOUNT)");
    expect(comp).toContain('"config", GOOGLE_ADS_ACCOUNT');
  });

  test("both networks fire once per document, on one trigger", () => {
    expect(comp).toContain("CompleteRegistration");
    expect(comp).toContain('"event", "conversion"');
    expect(comp).toContain("reported.has(eventId)");
  });

  test("the plaintext address is hashed on the server, never in the browser", () => {
    const action = read("../app/(auth)/signup/actions.ts");
    expect(action).toContain("hashedEmail(email)");
    expect(comp).not.toContain("crypto.subtle");
  });
});
