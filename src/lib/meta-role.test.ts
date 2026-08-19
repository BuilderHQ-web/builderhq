/**
 * The advertising role dimension, pinned.
 *
 * These are cheap tests guarding an expensive failure. A conversion
 * reported with the wrong role, or with a role on one half of the pair
 * and not the other, does not throw and does not show up in any log:
 * it shows up months later as a campaign optimised against a blended
 * number, or as an audience quietly split in two. The only place that
 * can be caught is here.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  isAdvertisableRole,
  isMetaViewEventId,
  isRegistrationEventId,
  metaAdRole,
  metaLensContentName,
  metaRegistrationParams,
} from "./meta-role";

describe("the advertising role", () => {
  test("every role a signup can create maps to an advertised value", () => {
    expect(metaAdRole("project_owner")).toBe("owner");
    expect(metaAdRole("builder")).toBe("builder");
    expect(metaAdRole("architect")).toBe("architect");
  });

  test("internal and unknown roles are never advertised", () => {
    expect(metaAdRole("admin")).toBeNull();
    expect(metaAdRole("")).toBeNull();
    expect(metaAdRole(null)).toBeNull();
    expect(metaAdRole(undefined)).toBeNull();
    expect(metaAdRole("owner")).toBeNull(); // already mapped, not a stored role
    expect(isAdvertisableRole("admin")).toBe(false);
    expect(isAdvertisableRole("architect")).toBe(true);
  });

  test("the stored roles match the database enum exactly", () => {
    // If a role is added to the product, this fails until somebody
    // decides what advertising should call it, rather than the role
    // silently reporting nothing.
    const schema = readFileSync(
      new URL("../modules/users/schema.ts", import.meta.url),
      "utf8",
    );
    const block = schema.slice(
      schema.indexOf('pgEnum("user_role"'),
      schema.indexOf("]);", schema.indexOf('pgEnum("user_role"')),
    );
    const stored = [...block.matchAll(/"([a-z_]+)"/g)]
      .map((m) => m[1]!)
      .filter((v) => v !== "user_role");
    for (const role of stored) {
      if (role === "admin") continue;
      expect(metaAdRole(role), `role "${role}" has no advertising value`).not.toBeNull();
    }
  });
});

describe("the registration parameters", () => {
  test("the signup path names the role in both parameters", () => {
    expect(metaRegistrationParams({ role: "project_owner" })).toEqual({
      content_name: "project_owner",
      role: "owner",
    });
    expect(metaRegistrationParams({ role: "architect" })).toEqual({
      content_name: "architect",
      role: "architect",
    });
  });

  test("a funnel can name itself and still carry the role", () => {
    expect(
      metaRegistrationParams({
        role: "project_owner",
        contentName: "ads_funnel",
        contentCategory: "renovation",
      }),
    ).toEqual({
      content_name: "ads_funnel",
      content_category: "renovation",
      role: "owner",
    });
  });

  test("an unadvertisable role produces no role parameter at all", () => {
    // Absent rather than empty: a blank value would become its own row
    // in a breakdown, which reads as a real audience and is not one.
    expect(metaRegistrationParams({ role: "admin" })).toEqual({
      content_name: "admin",
    });
  });

  test("both halves of a conversion build the same object", () => {
    // The browser and the server each call this with the stored role,
    // so identical input must give identical output. Deduplication
    // matches on the event id; this is what keeps the surviving report
    // carrying the same breakdown whichever half Meta keeps.
    const server = metaRegistrationParams({ role: "builder" });
    const browser = metaRegistrationParams({ role: "builder" });
    expect(browser).toEqual(server);
  });
});

describe("the lens names Meta sees", () => {
  test("the homeowner lens reports as owner, matching the role value", () => {
    expect(metaLensContentName("homeowner")).toBe("owner_lens");
    expect(metaLensContentName("architect")).toBe("architect_lens");
    expect(metaLensContentName("builder")).toBe("builder_lens");
  });

  test("a lens view id is accepted only in the shape the page mints", () => {
    expect(isMetaViewEventId("view.0f8b7c2e-4a1d-4b7e-9c3a-2f5e6d7a8b9c")).toBe(true);
    expect(isMetaViewEventId("reg.0f8b7c2e-4a1d-4b7e-9c3a-2f5e6d7a8b9c")).toBe(false);
    expect(isMetaViewEventId("view.")).toBe(false);
    expect(isMetaViewEventId(null)).toBe(false);
  });
});

describe("the registration event id gate", () => {
  test("accepts the id the server actually produces", () => {
    // metaEventId("reg", userId) with a real uuid: hyphens and all.
    expect(isRegistrationEventId("reg.0f8b7c2e-4a1d-4b7e-9c3a-2f5e6d7a8b9c")).toBe(true);
    expect(isRegistrationEventId("reg.cku1x9z0a0001qwer")).toBe(true);
  });

  test("rejects anything a stranger could type", () => {
    expect(isRegistrationEventId("")).toBe(false);
    expect(isRegistrationEventId(null)).toBe(false);
    expect(isRegistrationEventId(undefined)).toBe(false);
    expect(isRegistrationEventId("reg.")).toBe(false);
    expect(isRegistrationEventId("lead.0f8b7c2e-4a1d")).toBe(false);
    expect(isRegistrationEventId("reg.short")).toBe(false);
    expect(isRegistrationEventId(`reg.${"x".repeat(65)}`)).toBe(false);
    expect(isRegistrationEventId("reg.<script>alert(1)</script>")).toBe(false);
  });
});

describe("the call sites stay wired", () => {
  const read = (rel: string) =>
    readFileSync(new URL(rel, import.meta.url), "utf8");

  test("both registration paths report through the shared builder", () => {
    const signup = read("../app/(auth)/signup/actions.ts");
    const quiz = read("../app/api/start/q/submit/route.ts");
    for (const [name, src] of [
      ["signup", signup],
      ["ads funnel", quiz],
    ] as const) {
      expect(src, `${name} builds its own parameters`).toContain(
        "metaRegistrationParams",
      );
    }
  });

  test("the signup conversion has a browser half under the same id", () => {
    const action = read("../app/(auth)/signup/actions.ts");
    // The id is built once and used for both the server report and the
    // redirect that lets the browser send its half.
    expect(action).toContain("const eventId = metaEventId(\"reg\", userId)");
    expect(action).toContain("mev=");
    const pixel = read("../app/(auth)/verify-email/registration-pixel.tsx");
    expect(pixel).toContain("CompleteRegistration");
    expect(pixel).toContain("metaRegistrationParams");
  });

  test("the ads funnel returns its id only when it registered someone", () => {
    const quiz = read("../app/api/start/q/submit/route.ts");
    expect(quiz).toContain("userWasCreated");
    expect(quiz).toContain("meta: { eventId: metaEvent, params: metaParams }");
  });

  test("each landing lens reports itself, browser and server", () => {
    const lens = read("../components/landing/v2/lens-view.tsx");
    expect(lens).toContain("ViewContent");
    // Through the wrapper, never a raw fbq call.
    expect(lens).toContain("trackMetaEvent");
    expect(lens).not.toContain("window.fbq");
    // And the server half, under the id the browser just used.
    expect(lens).toContain("/api/meta/lens-view");
    expect(lens).toContain("eventId");

    const route = read("../app/api/meta/lens-view/route.ts");
    expect(route).toContain("ViewContent");
    expect(route).toContain("sendMetaConversion");
    // Public endpoint: shape checked and rate limited before it reports.
    expect(route).toContain("isMetaViewEventId");
    expect(route).toContain("metaLensView.limit");
  });

  test("the served lens is what gets reported, not the selected one", () => {
    // A visitor toggling the selector must not manufacture views of a
    // lens they are not: the architect campaign optimises on this.
    const lens = read("../components/landing/v2/lens-view.tsx");
    expect(lens).not.toContain("useRole");
    const landing = read("../components/landing/v2/landing.tsx");
    expect(landing).toContain("<LensView lens={initialRole} />");
  });
});
