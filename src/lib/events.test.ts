/**
 * The first-party event pipeline, pinned.
 *
 * These guard two different kinds of failure. The first is silent data
 * loss: a call site that stops reporting, or a batch dropped on the way
 * out of a page, shows up as a funnel step that looks like it has no
 * traffic rather than as an error. The second is disclosure: this
 * endpoint writes to our own database, which makes it the easiest place
 * to accidentally start storing a query string that has somebody's
 * details in it.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { demoTarget } from "@/components/landing/v2/demo-cta";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("which demo a link opens", () => {
  test("each lens maps to its own demo", () => {
    expect(demoTarget("/demo")).toBe("homeowner");
    expect(demoTarget("/demo/builder")).toBe("builder");
    expect(demoTarget("/demo/architect")).toBe("architect");
  });

  test("a link that is not a demo reports nothing at all", () => {
    // trackDemoCta is called from shared buttons that do not know where
    // they point, so this is the guard that stops a signup click being
    // counted as a demo open.
    expect(demoTarget("/signup?role=owner")).toBeNull();
    expect(demoTarget("/partners")).toBeNull();
    expect(demoTarget("#how")).toBeNull();
    expect(demoTarget("")).toBeNull();
  });

  test("query strings and fragments do not hide a demo link", () => {
    expect(demoTarget("/demo/architect?ref=x")).toBe("architect");
    expect(demoTarget("/demo#top")).toBe("homeowner");
  });
});

describe("every route into a demo is instrumented", () => {
  test("the content file's demo links are the three we map", () => {
    const content = read("../components/landing/v2/content.ts");
    const hrefs = [...content.matchAll(/href:\s*"(\/demo[^"]*)"/g)].map((m) => m[1]!);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(demoTarget(href), `${href} has no destination`).not.toBeNull();
    }
  });

  test("every component that renders one reports it", () => {
    // hero: the "Watch the demo" button. spine: the journey step CTAs.
    // close: the final block. If a new surface starts linking to a demo
    // it must join this list.
    for (const rel of [
      "../components/landing/v2/hero.tsx",
      "../components/landing/v2/spine.tsx",
      "../components/landing/v2/close.tsx",
    ]) {
      expect(read(rel), rel).toContain("trackDemoCta");
    }
  });

  test("the event carries the three dimensions a report needs", () => {
    const src = read("../components/landing/v2/demo-cta.ts");
    expect(src).toContain("demo_cta_click");
    for (const dim of ["lens", "placement", "destination"]) {
      expect(src, dim).toContain(dim);
    }
  });
});

describe("the endpoint", () => {
  const route = read("../app/api/events/route.ts");

  test("identity and attribution are read from the request, never the payload", () => {
    // A browser that could name its own campaign could manufacture a
    // funnel. The cookie is the only source.
    expect(route).toContain("decodeAttribution");
    expect(route).toContain("ATTRIBUTION_COOKIE");
    expect(route).toContain("SESSION_COOKIE");
    expect(route).not.toMatch(/body\.\s*anonId|e\.anonId|e\.campaign/);
  });

  test("it is rate limited before it writes", () => {
    expect(route).toContain("limiters.events.limit");
    // The call site, not the import at the top of the file.
    const gate = route.indexOf("limiters.events.limit");
    const write = route.indexOf("after(() => recordEvents");
    expect(gate).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(write);
  });

  test("a path is stored without its query string", () => {
    // The one place a page address is written to our own database.
    expect(route).toContain("cleanPath");
    expect(route).toMatch(/split\(\/\[\?#\]\//);
  });

  test("the batch and the properties are bounded", () => {
    expect(route).toContain("MAX_BATCH");
    expect(route).toContain("MAX_PROP_KEYS");
    expect(route).toContain("MAX_PROP_LEN");
  });

  test("the visitor never waits for the database", () => {
    expect(route).toContain("after(() => recordEvents");
    expect(route).toContain("status: 204");
  });

  test("a write failure is swallowed, never surfaced", () => {
    const ingest = read("../modules/analytics/ingest.ts");
    expect(ingest).toContain("catch");
    expect(ingest).toContain("logger.warn");
  });
});

describe("the client", () => {
  const lib = read("./analytics.ts");

  test("events are batched and flushed on the way out of the page", () => {
    // A visitor who clicks a link and leaves takes the queue with them
    // unless the page flushes on pagehide.
    expect(lib).toContain("pagehide");
    expect(lib).toContain("visibilitychange");
    expect(lib).toContain("sendBeacon");
    expect(lib).toContain("keepalive");
  });

  test("nothing it does can throw into a page", () => {
    const bodies = lib.split("export function track")[1] ?? "";
    expect(bodies).toContain("catch");
  });

  test("the client batch cap matches the server's", () => {
    const clientCap = /MAX_BATCH = (\d+)/.exec(lib)?.[1];
    const serverCap = /MAX_BATCH = (\d+)/.exec(read("../modules/analytics/ingest.ts"))?.[1];
    expect(clientCap).toBe(serverCap);
  });
});

describe("Google Analytics is held to the same rule as the pixel", () => {
  const ga = read("../components/analytics/google-analytics.tsx");

  test("it decides before it boots", () => {
    // page_location carries the whole address, so a password reset token
    // would reach Google the first time somebody opened their email.
    expect(ga).toContain("isReportableTrackingUrl");
    const decision = ga.indexOf("isReportableTrackingUrl");
    const boot = ga.indexOf("bootGtag(measurementId)");
    expect(decision).toBeLessThan(boot);
  });

  test("Google's own automatic page view is turned off", () => {
    expect(ga).toContain("send_page_view: false");
  });

  test("the address it reports keeps only campaign parameters", () => {
    expect(ga).toContain('k.startsWith("utm_")');
  });

  test("it mounts on the public surfaces only", () => {
    for (const rel of ["../app/(marketing)/layout.tsx", "../app/(auth)/layout.tsx"]) {
      expect(read(rel), rel).toContain("<GoogleAnalytics />");
    }
    // Never the application. The app layout has no analytics mounts.
    const appLayout = read("../app/(app)/layout.tsx");
    expect(appLayout).not.toContain("GoogleAnalytics");
    expect(appLayout).not.toContain("MetaPixel");
  });
});
