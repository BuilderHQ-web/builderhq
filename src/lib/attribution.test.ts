/**
 * Attribution, pinned.
 *
 * These rules decide which campaign gets credit for a customer, which
 * decides where the budget goes next month. Getting them wrong is not
 * loud: nothing throws, a report simply reads that search produces
 * everything and paid social produces nothing, and the advertisement
 * that actually introduced the customer gets switched off.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  decodeAttribution,
  decodeLegacyUtm,
  encodeAttribution,
  isCampaignTouch,
  mergeAttribution,
  readTouch,
  UTM_KEYS,
  type Attribution,
} from "./attribution";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const NOW = "2026-08-20T04:00:00.000Z";
const LATER = "2026-08-29T09:30:00.000Z";
const id = () => "aid-fixed-0001";

describe("reading a visit", () => {
  test("a campaign landing yields every parameter it carries", () => {
    const { touch, fbclid } = readTouch(
      "https://builderhq.com.au/for/architects?utm_source=meta&utm_medium=paid_social&utm_campaign=architect-vic&utm_content=carousel-a&utm_term=tender&fbclid=ABC123",
      "https://l.facebook.com/",
      NOW,
    );
    expect(touch).toEqual({
      at: NOW,
      landing: "/for/architects",
      source: "meta",
      medium: "paid_social",
      campaign: "architect-vic",
      content: "carousel-a",
      term: "tender",
      referrer: "l.facebook.com",
    });
    expect(fbclid).toBe("ABC123");
  });

  test("the landing page is a path, and the referrer a hostname", () => {
    // Neither may carry a query string. A referring URL with `?email=`
    // in it is exactly the disclosure the tracking audit closed.
    const { touch } = readTouch(
      "https://builderhq.com.au/verify-email?email=jo@example.com",
      "https://mail.google.com/mail/u/0/?jo@example.com",
      NOW,
    );
    expect(touch.landing).toBe("/verify-email");
    expect(touch.referrer).toBe("mail.google.com");
    expect(JSON.stringify(touch)).not.toContain("@");
  });

  test("our own pages are not a source of traffic to ourselves", () => {
    const { touch } = readTouch(
      "https://builderhq.com.au/signup",
      "https://builderhq.com.au/for/builders",
      NOW,
    );
    expect(touch.referrer).toBeUndefined();
  });

  test("a direct visit still records when and where it landed", () => {
    const { touch } = readTouch("https://builderhq.com.au/", "", NOW);
    expect(touch).toEqual({ at: NOW, landing: "/" });
    expect(isCampaignTouch(touch)).toBe(false);
  });

  test("junk in, nothing out", () => {
    expect(readTouch("not a url", "", NOW).touch).toEqual({ at: NOW });
  });
});

describe("first touch and last touch", () => {
  const adVisit = readTouch(
    "https://builderhq.com.au/for/architects?utm_source=meta&utm_campaign=architect-vic",
    "",
    NOW,
  ).touch;

  test("a first visit sets both, and mints an anonymous id", () => {
    const rec = mergeAttribution({}, adVisit, {}, id);
    expect(rec.aid).toBe("aid-fixed-0001");
    expect(rec.first).toEqual(adVisit);
    expect(rec.last).toEqual(adVisit);
  });

  test("a later direct return never overwrites the campaign that introduced them", () => {
    // The whole point. Somebody clicks the advertisement, leaves, and
    // comes back nine days later through a bookmark to sign up. Last
    // touch must not become "direct" and erase what paid for them.
    const first = mergeAttribution({}, adVisit, {}, id);
    const direct = readTouch("https://builderhq.com.au/signup", "", LATER).touch;
    const after = mergeAttribution(first, direct, {}, id);
    expect(after.first).toEqual(adVisit);
    expect(after.last).toEqual(adVisit);
    expect(after.aid).toBe("aid-fixed-0001");
  });

  test("a second campaign moves last touch and leaves first alone", () => {
    const first = mergeAttribution({}, adVisit, {}, id);
    const search = readTouch(
      "https://builderhq.com.au/?utm_source=google&utm_medium=cpc&utm_campaign=brand",
      "",
      LATER,
    ).touch;
    const after = mergeAttribution(first, search, {}, id);
    expect(after.first?.campaign).toBe("architect-vic");
    expect(after.last?.campaign).toBe("brand");
  });

  test("the anonymous id survives every later visit", () => {
    let rec: Attribution = mergeAttribution({}, adVisit, {}, id);
    for (let i = 0; i < 5; i += 1) {
      rec = mergeAttribution(rec, readTouch("https://builderhq.com.au/", "", LATER).touch, {}, () => "different");
    }
    expect(rec.aid).toBe("aid-fixed-0001");
  });

  test("click ids are kept when they appear", () => {
    const rec = mergeAttribution({}, adVisit, { fbclid: "ABC123" }, id);
    expect(rec.fbclid).toBe("ABC123");
    // And a later visit without one does not wipe it.
    const after = mergeAttribution(rec, readTouch("https://builderhq.com.au/", "", LATER).touch, {}, id);
    expect(after.fbclid).toBe("ABC123");
  });
});

describe("the cookie", () => {
  test("a full record round trips", () => {
    const rec = mergeAttribution(
      {},
      readTouch(
        "https://builderhq.com.au/for/builders?utm_source=meta&utm_medium=paid_social&utm_campaign=builder-vic&utm_content=v2&utm_term=t",
        "https://l.facebook.com/",
        NOW,
      ).touch,
      { fbclid: "XYZ" },
      id,
    );
    expect(decodeAttribution(encodeAttribution(rec))).toEqual(rec);
  });

  test("it is cookie-safe", () => {
    // Commas and quotes in a Set-Cookie header are how a working handoff
    // becomes an intermittent one behind a proxy.
    const value = encodeAttribution(mergeAttribution({}, { source: "meta, paid", at: NOW }, {}, id));
    expect(value).not.toContain(",");
    expect(value).not.toContain('"');
    expect(value).not.toContain(";");
  });

  test("it stays well inside the 4KB a cookie is allowed", () => {
    const long = "x".repeat(300);
    const rec = mergeAttribution(
      {},
      { source: long, medium: long, campaign: long, content: long, term: long, referrer: long, landing: long, at: NOW },
      { gclid: long, fbclid: long },
      id,
    );
    expect(encodeAttribution(rec).length).toBeLessThan(2000);
  });

  test("nothing malformed can stop a signup", () => {
    for (const junk of ["", "   ", "not json", "%%%", "[1,2,3]", "null", null, undefined]) {
      expect(decodeAttribution(junk as string), String(junk)).toEqual({});
    }
  });

  test("yesterday's two-field cookie is still readable", () => {
    // The live campaigns already put this cookie on real visitors. They
    // must not reset to direct when they come back to sign up.
    const legacy = encodeAttribution({} as Attribution).length > 0;
    expect(legacy).toBe(true);
    expect(decodeLegacyUtm(JSON.stringify({ s: "meta", c: "architect-vic" }))).toEqual({
      source: "meta",
      campaign: "architect-vic",
    });
    expect(decodeLegacyUtm("rubbish")).toBeUndefined();
  });
});

describe("the wiring", () => {
  test("the campaign keys are the five that exist", () => {
    expect([...UTM_KEYS]).toEqual([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]);
  });

  test("signup reads the cookie on the server and records the full record", () => {
    const action = read("../app/(auth)/signup/actions.ts");
    expect(action).toContain("decodeAttribution");
    expect(action).toContain("recordSignupAttribution");
    // Never from the form: this value lands in the database.
    expect(action).not.toContain('formData.get("signupSource")');
    // And the two long-standing columns keep carrying last touch.
    expect(action).toContain("signupSource");
    expect(action).toContain("signupCampaign");
  });

  test("attribution failure can never fail a signup", () => {
    const service = read("../modules/users/attribution.ts");
    expect(service).toContain("catch");
    expect(service).toContain("onConflictDoUpdate");
  });

  test("capture is mounted on the surfaces campaigns point at", () => {
    for (const rel of ["../app/(marketing)/layout.tsx", "../app/(auth)/layout.tsx"]) {
      expect(read(rel), rel).toContain("<AttributionCapture />");
    }
  });

  test("the advertising URL rule still takes its keys from here", () => {
    expect(read("./meta-url.ts")).toContain('from "./attribution"');
  });
});
