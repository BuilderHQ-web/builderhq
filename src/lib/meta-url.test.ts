/**
 * What leaves in a URL, pinned.
 *
 * This file exists because of a real leak. The signup redirect carried
 * `?email=`, the Meta pixel reads the address bar on every event it
 * sends, and so every page view on the verification page handed a
 * customer's email address to an overseas advertising network in the
 * clear. Nothing threw and nothing was logged.
 *
 * The rules below are the fix. A test that fails here is a disclosure
 * that would otherwise be found by Meta's automated detection, which
 * filters the events, then flags the dataset, then restricts the ad
 * account.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  isPrivateTrackingPath,
  isReportableTrackingUrl,
  sanitiseMetaSourceUrl,
} from "./meta-url";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("the address a server event may carry", () => {
  test("personal data in the query never survives", () => {
    expect(
      sanitiseMetaSourceUrl("https://builderhq.com.au/verify-email?email=jo@example.com"),
    ).toBe("https://builderhq.com.au/verify-email");
    expect(
      sanitiseMetaSourceUrl("https://builderhq.com.au/x?name=Jo%20Smith&phone=0400000000"),
    ).toBe("https://builderhq.com.au/x");
  });

  test("the campaign parameters survive, and only those", () => {
    expect(
      sanitiseMetaSourceUrl(
        "https://builderhq.com.au/for/architects?utm_source=meta&utm_medium=paid&utm_campaign=arch&utm_content=a&utm_term=t&fbclid=XYZ&email=jo@example.com",
      ),
    ).toBe(
      "https://builderhq.com.au/for/architects?utm_source=meta&utm_medium=paid&utm_campaign=arch&utm_content=a&utm_term=t",
    );
  });

  test("a path that is itself a secret is not reported at all", () => {
    // Stripping the query does nothing for these: the token is the path.
    for (const url of [
      "https://builderhq.com.au/reset-password/9f3c1d2e",
      "https://builderhq.com.au/claim/9f3c1d2e",
      "https://builderhq.com.au/verify-email/9f3c1d2e",
      "https://builderhq.com.au/invite/b/9f3c1d2e",
      "https://builderhq.com.au/partners/preview/house-design-solutions",
      "https://builderhq.com.au/partners/welcome?p=hds",
    ]) {
      expect(sanitiseMetaSourceUrl(url), url).toBeUndefined();
    }
  });

  test("the page that reports the conversion is still reportable", () => {
    // /verify-email is where the browser half of CompleteRegistration
    // fires. Only /verify-email/<token> is the private one.
    expect(sanitiseMetaSourceUrl("https://builderhq.com.au/verify-email")).toBe(
      "https://builderhq.com.au/verify-email",
    );
  });

  test("fragments, ports and junk", () => {
    expect(sanitiseMetaSourceUrl("https://builderhq.com.au/x#email=jo@example.com")).toBe(
      "https://builderhq.com.au/x",
    );
    expect(sanitiseMetaSourceUrl("http://localhost:3000/for/builders?utm_source=meta")).toBe(
      "http://localhost:3000/for/builders?utm_source=meta",
    );
    expect(sanitiseMetaSourceUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitiseMetaSourceUrl("not a url")).toBeUndefined();
    expect(sanitiseMetaSourceUrl("")).toBeUndefined();
    expect(sanitiseMetaSourceUrl(null)).toBeUndefined();
    expect(sanitiseMetaSourceUrl(undefined)).toBeUndefined();
  });
});

describe("whether the browser pixel may report a page", () => {
  test("ordinary marketing pages report, campaign parameters and all", () => {
    expect(isReportableTrackingUrl("/", "")).toBe(true);
    expect(isReportableTrackingUrl("/for/architects", "?utm_source=meta&utm_campaign=a")).toBe(
      true,
    );
    expect(isReportableTrackingUrl("/demo/builder", "")).toBe(true);
    // The two pages that fire conversions must always be reportable, or
    // the conversion is lost rather than merely unreported.
    expect(isReportableTrackingUrl("/verify-email", "")).toBe(true);
    expect(isReportableTrackingUrl("/start/q/contact", "")).toBe(true);
  });

  test("a harmless parameter does not silence the page", () => {
    // Suppressing on any unknown parameter would be safer and would
    // also quietly kill conversions the day somebody adds `?ref=`.
    expect(isReportableTrackingUrl("/signup", "?role=builder")).toBe(true);
    expect(isReportableTrackingUrl("/start/sent", "?pid=b7c2e4a1&v=2")).toBe(true);
  });

  test("a private path is never reported", () => {
    for (const path of [
      "/reset-password/9f3c1d2e",
      "/claim/9f3c1d2e",
      "/verify-email/9f3c1d2e",
      "/invite/b/9f3c1d2e",
      "/partners/preview/house-design-solutions",
      "/partners/welcome",
    ]) {
      expect(isReportableTrackingUrl(path, ""), path).toBe(false);
      expect(isPrivateTrackingPath(path), path).toBe(true);
    }
  });

  test("a continuation into a private page silences the page it sits on", () => {
    // An invited builder arrives at /signup?next=/invite/b/<token>. A
    // one-time invitation token is not worth a page view.
    expect(isReportableTrackingUrl("/signup", "?next=%2Finvite%2Fb%2F9f3c1d2e")).toBe(false);
    expect(isReportableTrackingUrl("/login", "?next=%2Fclaim%2F9f3c1d2e")).toBe(false);
  });

  test("anything shaped like an address silences the page", () => {
    // The belt to the braces: no page should carry one any more.
    expect(isReportableTrackingUrl("/verify-email", "?email=jo@example.com")).toBe(false);
  });
});

describe("the rule is applied where events are actually sent", () => {
  test("the Conversions API payload sanitises its source URL", () => {
    const capi = read("./meta-capi.ts");
    expect(capi).toContain("sanitiseMetaSourceUrl");
    // And not the raw value it used to send.
    expect(capi).not.toMatch(/event_source_url:\s*input\.sourceUrl/);
  });

  test("the browser pixel decides before it boots", () => {
    const pixel = read("../components/analytics/meta-pixel.tsx");
    expect(pixel).toContain("isReportableTrackingUrl");
    // Meta's snippet fires a PageView the instant it runs, so the
    // decision cannot be made after it has been injected.
    expect(pixel).not.toContain("fbq('track', 'PageView')");
    expect(pixel).toContain("consent");
  });

  test("no signup redirect puts a person in the address bar", () => {
    for (const rel of ["../app/(auth)/signup/actions.ts", "../app/(auth)/login/actions.ts"]) {
      const src = read(rel);
      expect(src, rel).toContain('redirect("/verify-email")');
      expect(src, rel).not.toContain("verify-email?email=");
      expect(src, rel).toContain("setSignupHandoff");
    }
  });
});
