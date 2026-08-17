/**
 * The Conversions API payload, pinned.
 *
 * Every failure this guards against is silent in production. A hash
 * computed over the wrong normalisation still sends, still returns 200,
 * and still reports a conversion; it simply matches nobody, so the ad
 * account quietly attributes less than it should. An event id that
 * differs from the browser's counts the same conversion twice and makes
 * the cost of acquiring a customer read at half its real value. Neither
 * shows up as an error anywhere, which is exactly why they are asserted
 * here rather than eyeballed once against Events Manager.
 */

import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { metaEventId, sendMetaConversion } from "./meta-capi";

const sha = (v: string) => createHash("sha256").update(v, "utf8").digest("hex");

const NO_CONTEXT = {
  ip: null,
  userAgent: null,
  fbp: null,
  fbc: null,
  sourceUrl: null,
};

/** Capture the body the client would have sent, without a network call. */
async function capturePayload(
  input: Parameters<typeof sendMetaConversion>[0],
): Promise<Record<string, unknown>> {
  // The parameters are declared so the captured call is typed as a
  // real fetch call; an inferred zero-arity mock hands back an empty
  // tuple and the body cannot be read off it.
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  await sendMetaConversion(input);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const init = fetchMock.mock.calls[0]![1];
  return JSON.parse(String(init?.body ?? "{}"));
}

function firstEvent(payload: Record<string, unknown>) {
  return (payload.data as Array<Record<string, unknown>>)[0]!;
}

describe("meta capi payload", () => {
  beforeEach(() => {
    // The module reads these once through env; the suite only runs the
    // send path when both are present.
    process.env.META_CAPI_ACCESS_TOKEN ||= "test-token";
    process.env.META_DATASET_ID ||= "1234567890";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("email is lowercased and trimmed before hashing", async () => {
    const payload = await capturePayload({
      eventName: "Lead",
      eventId: "lead.1",
      context: NO_CONTEXT,
      user: { email: "  Jo@Example.COM " },
    });
    const ud = firstEvent(payload).user_data as Record<string, string[]>;
    // The whole point: the messy form and the clean form must agree.
    expect(ud.em).toEqual([sha("jo@example.com")]);
  });

  test("an Australian mobile becomes country-code digits", async () => {
    const expected = [sha("61412345678")];
    for (const written of ["0412 345 678", "+61 412 345 678", "(04) 1234-5678".replace("(04) ", "04"), "61412345678"]) {
      const payload = await capturePayload({
        eventName: "Lead",
        eventId: "lead.1",
        context: NO_CONTEXT,
        user: { phone: written },
      });
      const ud = firstEvent(payload).user_data as Record<string, string[]>;
      expect(ud.ph, `phone written as "${written}"`).toEqual(expected);
    }
  });

  test("identifying values never travel in the clear", async () => {
    const payload = await capturePayload({
      eventName: "CompleteRegistration",
      eventId: "reg.u1",
      context: NO_CONTEXT,
      user: {
        email: "person@example.com",
        phone: "0412345678",
        firstName: "Jo",
        lastName: "Bloggs",
        externalId: "user-123",
      },
    });
    const raw = JSON.stringify(payload);
    for (const secret of ["person@example.com", "0412345678", "user-123"]) {
      expect(raw).not.toContain(secret);
    }
    expect(raw).toContain(sha("person@example.com"));
  });

  test("ip, user agent and the Meta cookies are sent unhashed", async () => {
    const payload = await capturePayload({
      eventName: "Lead",
      eventId: "lead.1",
      context: {
        ip: "203.0.113.10",
        userAgent: "Mozilla/5.0",
        fbp: "fb.1.123.456",
        fbc: "fb.1.123.abc",
        sourceUrl: "https://builderhq.com.au/",
      },
    });
    const ud = firstEvent(payload).user_data as Record<string, unknown>;
    // Meta specifies these as plain; hashing them would break matching.
    expect(ud.client_ip_address).toBe("203.0.113.10");
    expect(ud.client_user_agent).toBe("Mozilla/5.0");
    expect(ud.fbp).toBe("fb.1.123.456");
    expect(ud.fbc).toBe("fb.1.123.abc");
  });

  test("the event id survives to Meta so the browser pair deduplicates", async () => {
    const id = metaEventId("lead", "abc-123");
    expect(id).toBe("lead.abc-123");
    const payload = await capturePayload({
      eventName: "Lead",
      eventId: id,
      context: NO_CONTEXT,
      user: { email: "a@b.com" },
    });
    expect(firstEvent(payload).event_id).toBe(id);
    expect(firstEvent(payload).event_name).toBe("Lead");
    expect(firstEvent(payload).action_source).toBe("website");
  });

  test("absent user fields are omitted, not sent empty", async () => {
    const payload = await capturePayload({
      eventName: "Lead",
      eventId: "lead.1",
      context: NO_CONTEXT,
      user: { email: "a@b.com", phone: null, firstName: "" },
    });
    const ud = firstEvent(payload).user_data as Record<string, unknown>;
    expect(ud.em).toBeDefined();
    expect(ud).not.toHaveProperty("ph");
    expect(ud).not.toHaveProperty("fn");
  });

  test("a rejection is swallowed rather than thrown at the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{\"error\":{\"message\":\"bad\"}}", { status: 400 })),
    );
    // A marketing integration must never be able to break a signup.
    await expect(
      sendMetaConversion({
        eventName: "Lead",
        eventId: "lead.1",
        context: NO_CONTEXT,
        user: { email: "a@b.com" },
      }),
    ).resolves.toBeUndefined();
  });

  test("a network failure is swallowed too", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("socket hang up"); }));
    await expect(
      sendMetaConversion({
        eventName: "Lead",
        eventId: "lead.1",
        context: NO_CONTEXT,
        user: { email: "a@b.com" },
      }),
    ).resolves.toBeUndefined();
  });
});
