/**
 * Campaign attribution, pinned.
 *
 * The `signupSource` and `signupCampaign` columns have existed on the
 * user row since the beginning and every account created through the
 * website form left them null, because the campaign parameters live on
 * the landing page and the form is three clicks later. These tests
 * cover the carrier that closes that gap.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { decodeCookieJson, encodeCookieJson } from "./cookie-json";
import { readUtmAttribution, utmCookieValue, UTM_KEYS } from "./utm";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("the campaign cookie", () => {
  test("a round trip returns what was stored", () => {
    const value = utmCookieValue("meta", "architects-au-aug");
    expect(value).not.toBeNull();
    expect(readUtmAttribution(value)).toEqual({
      source: "meta",
      campaign: "architects-au-aug",
    });
  });

  test("either half on its own is still worth storing", () => {
    expect(readUtmAttribution(utmCookieValue("meta", null))).toEqual({ source: "meta" });
    expect(readUtmAttribution(utmCookieValue(null, "arch"))).toEqual({ campaign: "arch" });
  });

  test("a visit with no campaign writes nothing", () => {
    expect(utmCookieValue(null, null)).toBeNull();
    expect(utmCookieValue("", "  ")).toBeNull();
  });

  test("the value is cookie-safe and survives being encoded twice", () => {
    // Commas and quotes in a Set-Cookie header are how a working
    // handoff becomes an intermittent one behind a proxy.
    const value = utmCookieValue("meta", "spring, 2026")!;
    expect(value).not.toContain(",");
    expect(value).not.toContain('"');
    expect(readUtmAttribution(value).campaign).toBe("spring, 2026");
    expect(readUtmAttribution(encodeURIComponent(value)).campaign).toBe("spring, 2026");
  });

  test("nothing malformed can stop a signup", () => {
    // This value is read inside the signup action. Whatever is in the
    // cookie, the answer is an object.
    for (const junk of ["", "   ", "not json", "%%%", "[1,2,3]", '"a"', "null", null, undefined]) {
      expect(readUtmAttribution(junk as string), String(junk)).toEqual({});
    }
    expect(readUtmAttribution(encodeCookieJson({ s: 42, c: [] }))).toEqual({});
  });

  test("a value too long for the column is cut, not rejected", () => {
    const long = "x".repeat(400);
    const stored = readUtmAttribution(utmCookieValue(long, long));
    expect(stored.source).toHaveLength(120);
    expect(stored.campaign).toHaveLength(120);
  });

  test("decodeCookieJson only ever yields a plain object", () => {
    expect(decodeCookieJson(encodeCookieJson({ a: 1 }))).toEqual({ a: 1 });
    expect(decodeCookieJson(encodeCookieJson([1, 2]))).toBeNull();
    expect(decodeCookieJson("%E0%A4%A")).toBeNull();
  });
});

describe("the campaign reaches the account", () => {
  test("the page writes the cookie and the action reads it on the server", () => {
    const capture = read("../components/analytics/utm-capture.tsx");
    // The name comes from the same module the server reads it with, so
    // the two halves cannot drift apart.
    expect(capture).toContain("UTM_COOKIE");
    expect(capture).toContain("utm_source");
    expect(capture).toContain("utm_campaign");

    const action = read("../app/(auth)/signup/actions.ts");
    expect(action).toContain("readUtmAttribution");
    expect(action).toContain("signupSource");
    expect(action).toContain("signupCampaign");
    // Read from our own cookie, never from the submitted form: this
    // value lands in the database.
    expect(action).not.toContain('formData.get("signupSource")');
  });

  test("it is mounted on the surfaces campaigns point at", () => {
    for (const rel of ["../app/(marketing)/layout.tsx", "../app/(auth)/layout.tsx"]) {
      expect(read(rel), rel).toContain("<UtmCapture />");
    }
  });

  test("the keys advertising may put in a URL are the ones we read", () => {
    expect([...UTM_KEYS]).toEqual([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]);
  });
});
