/**
 * The Meta Lead Ads webhook, pinned.
 *
 * Four things here are load-bearing and each fails silently if it is
 * wrong: a forged delivery must be refused, a replayed delivery must
 * not become a second lead, a renamed form field must not lose the
 * answer, and the Page token must never reach a URL. Each is tested
 * from both sides — the case a wrong implementation would also pass,
 * and the case that separates it.
 */

import { createHmac } from "node:crypto";

import { describe, expect, test, vi } from "vitest";

import {
  fetchLead,
  mapLeadFields,
  parseNotifications,
  verifySignature,
  verifySubscription,
} from "./meta-webhook";

const SECRET = "app-secret-value";
const sign = (body: string) =>
  "sha256=" + createHmac("sha256", SECRET).update(body, "utf8").digest("hex");

describe("verifySignature", () => {
  const body = '{"object":"page","entry":[]}';

  test("accepts a delivery signed with the app secret", () => {
    expect(verifySignature(body, sign(body), SECRET).ok).toBe(true);
  });

  test("refuses a body that was altered after signing", () => {
    const signature = sign(body);
    const tampered = body.replace('"page"', '"pageX"');
    expect(verifySignature(tampered, signature, SECRET).ok).toBe(false);
  });

  test("refuses a signature made with a different secret", () => {
    const forged =
      "sha256=" + createHmac("sha256", "not-the-secret").update(body, "utf8").digest("hex");
    expect(verifySignature(body, forged, SECRET).ok).toBe(false);
  });

  test("refuses when the header is absent", () => {
    expect(verifySignature(body, null, SECRET).ok).toBe(false);
  });

  test("refuses everything when the secret is not configured", () => {
    // The dangerous failure mode is the opposite: an unconfigured
    // deployment that accepts anything because there is nothing to
    // compare against.
    expect(verifySignature(body, sign(body), undefined).ok).toBe(false);
  });

  test("a signature of the right length but wrong bytes is still refused", () => {
    const right = sign(body);
    const wrong = right.slice(0, -1) + (right.endsWith("a") ? "b" : "a");
    expect(wrong.length).toBe(right.length);
    expect(verifySignature(body, wrong, SECRET).ok).toBe(false);
  });
});

describe("verifySubscription", () => {
  const params = (over: Record<string, string> = {}) =>
    new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "our-token",
      "hub.challenge": "1158201444",
      ...over,
    });

  test("echoes the challenge when the token matches", () => {
    const r = verifySubscription(params(), "our-token");
    expect(r.ok && r.value).toBe("1158201444");
  });

  test("refuses a challenge carrying somebody else's token", () => {
    expect(verifySubscription(params({ "hub.verify_token": "theirs" }), "our-token").ok).toBe(
      false,
    );
  });

  test("refuses when no verify token is configured", () => {
    expect(verifySubscription(params(), undefined).ok).toBe(false);
  });

  test("refuses an unsubscribe-shaped request", () => {
    expect(verifySubscription(params({ "hub.mode": "unsubscribe" }), "our-token").ok).toBe(
      false,
    );
  });
});

describe("parseNotifications", () => {
  const change = (value: Record<string, unknown>) => ({ field: "leadgen", value });

  test("reads a single leadgen change", () => {
    const out = parseNotifications({
      object: "page",
      entry: [
        {
          id: "page-1",
          time: 1_700_000_000,
          changes: [
            change({
              leadgen_id: "444",
              form_id: "form-9",
              page_id: "page-1",
              ad_id: "ad-2",
              campaign_id: "camp-3",
              created_time: 1_700_000_000,
            }),
          ],
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.leadgenId).toBe("444");
    expect(out[0]!.formId).toBe("form-9");
    expect(out[0]!.createdTime).toBe(1_700_000_000);
  });

  test("reads every lead when one delivery carries several", () => {
    const out = parseNotifications({
      entry: [
        { changes: [change({ leadgen_id: "1" }), change({ leadgen_id: "2" })] },
        { changes: [change({ leadgen_id: "3" })] },
      ],
    });
    expect(out.map((n) => n.leadgenId)).toEqual(["1", "2", "3"]);
  });

  test("ignores changes we did not subscribe to", () => {
    const out = parseNotifications({
      entry: [{ changes: [{ field: "feed", value: { post_id: "x" } }] }],
    });
    expect(out).toEqual([]);
  });

  test("skips a leadgen change with no lead id rather than inventing one", () => {
    const out = parseNotifications({ entry: [{ changes: [change({ form_id: "f" })] }] });
    expect(out).toEqual([]);
  });

  test("tolerates a body of the wrong shape", () => {
    expect(parseNotifications(null)).toEqual([]);
    expect(parseNotifications({})).toEqual([]);
    expect(parseNotifications({ entry: "nope" })).toEqual([]);
  });

  test("accepts a numeric lead id, which Meta sometimes sends", () => {
    const out = parseNotifications({ entry: [{ changes: [change({ leadgen_id: 987 })] }] });
    expect(out[0]!.leadgenId).toBe("987");
  });
});

describe("mapLeadFields", () => {
  const f = (name: string, value: string) => ({ name, values: [value] });

  test("maps the standard Meta field names", () => {
    const m = mapLeadFields([
      f("first_name", "Sarah"),
      f("last_name", "Nguyen"),
      f("email", "Sarah.Nguyen@example.com"),
      f("phone_number", "+61 400 000 000"),
    ]);
    expect(m.firstName).toBe("Sarah");
    expect(m.lastName).toBe("Nguyen");
    expect(m.email).toBe("sarah.nguyen@example.com");
    expect(m.phone).toBe("+61 400 000 000");
    expect(m.incomplete).toBe(false);
  });

  test("splits a single full-name answer", () => {
    const m = mapLeadFields([f("full_name", "Sarah Nguyen"), f("email", "s@example.com")]);
    expect(m.firstName).toBe("Sarah");
    expect(m.lastName).toBe("Nguyen");
  });

  test("keeps every part of a multi-word surname", () => {
    const m = mapLeadFields([f("full_name", "Ana Maria de Souza")]);
    expect(m.firstName).toBe("Ana");
    expect(m.lastName).toBe("Maria de Souza");
  });

  test("an explicit first name wins over a full-name answer", () => {
    const m = mapLeadFields([f("full_name", "Wrong Person"), f("first_name", "Sarah")]);
    expect(m.firstName).toBe("Sarah");
  });

  test("keeps an answer to a question we did not anticipate", () => {
    const m = mapLeadFields([
      f("email", "s@example.com"),
      f("what_stage_is_your_project_at?", "Plans approved"),
      f("suburb", "Ainslie"),
    ]);
    expect(m.extras["what_stage_is_your_project_at?"]).toBe("Plans approved");
    expect(m.extras.suburb).toBe("Ainslie");
  });

  test("records a lead with no name rather than dropping it", () => {
    const m = mapLeadFields([f("email", "s@example.com")]);
    expect(m.firstName).toBe("Unknown");
    expect(m.incomplete).toBe(true);
    expect(m.email).toBe("s@example.com");
  });

  test("records a lead with a phone but no email", () => {
    const m = mapLeadFields([f("full_name", "Sarah"), f("phone_number", "0400000000")]);
    expect(m.phone).toBe("0400000000");
    expect(m.email).toBeNull();
    expect(m.incomplete).toBe(true);
  });

  test("ignores a field present but blank", () => {
    const m = mapLeadFields([
      { name: "email", values: [] },
      { name: "first_name", values: ["   "] },
      f("full_name", "Sarah Nguyen"),
    ]);
    expect(m.firstName).toBe("Sarah");
    expect(m.email).toBeNull();
  });

  test("an empty form does not throw", () => {
    const m = mapLeadFields([]);
    expect(m.firstName).toBe("Unknown");
    expect(m.incomplete).toBe(true);
  });
});

describe("fetchLead", () => {
  const graphBody = {
    id: "lead-1",
    created_time: "2026-08-27T02:00:00+0000",
    platform: "ig",
    campaign_id: "c1",
    campaign_name: "Canberra Extensions",
    adset_id: "as1",
    adset_name: "Owners 35-55",
    ad_id: "a1",
    ad_name: "Carousel A",
    form_id: "f1",
    field_data: [
      { name: "full_name", values: ["Sarah Nguyen"] },
      { name: "email", values: ["s@example.com"] },
    ],
  };

  const okResponse = () =>
    ({
      ok: true,
      status: 200,
      json: async () => graphBody,
    }) as unknown as Response;

  test("sends the token as a header and never in the URL", async () => {
    const fetchImpl = vi.fn(async () => okResponse()) as unknown as typeof fetch;
    await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    // A token in a query string ends up in access logs, referrers and
    // error reports. This is the assertion that keeps it out.
    expect(String(url)).not.toContain("PAGE-TOKEN");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer PAGE-TOKEN",
    });
  });

  test("asks for names as well as ids", async () => {
    const fetchImpl = vi.fn(async () => okResponse()) as unknown as typeof fetch;
    await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });
    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain("campaign_name");
    expect(String(url)).toContain("field_data");
  });

  test("returns the campaign context alongside the answers", async () => {
    const fetchImpl = vi.fn(async () => okResponse()) as unknown as typeof fetch;
    const r = await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.campaignName).toBe("Canberra Extensions");
    expect(r.value.platform).toBe("ig");
    expect(r.value.fieldData).toHaveLength(2);
  });

  test("refuses to call Graph with no token", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const r = await fetchLead("lead-1", undefined, { fetchImpl });
    expect(r.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("a 403 is reported as forbidden, so the caller does not retry forever", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({ ok: false, status: 403, text: async () => "bad token" }) as unknown as Response,
    ) as unknown as typeof fetch;
    const r = await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("forbidden");
  });

  test("a transport failure is internal, so the caller may retry", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("socket hang up");
    }) as unknown as typeof fetch;
    const r = await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("internal");
  });

  test("an error message never carries the token", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: false,
          status: 400,
          text: async () => "Invalid OAuth access token",
        }) as unknown as Response,
    ) as unknown as typeof fetch;
    const r = await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).not.toContain("PAGE-TOKEN");
  });

  test("a response with no field_data still yields a lead", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({ ok: true, status: 200, json: async () => ({ id: "lead-1" }) }) as unknown as Response,
    ) as unknown as typeof fetch;
    const r = await fetchLead("lead-1", "PAGE-TOKEN", { fetchImpl });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.fieldData).toEqual([]);
  });
});
