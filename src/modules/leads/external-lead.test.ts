/**
 * External leads, against the real database.
 *
 * The one claim worth proving here cannot be proved with a mock: that a
 * lead delivered twice becomes one row. Meta redelivers on any non-200
 * and replays a backlog after an outage, so this is the ordinary case
 * rather than the exotic one.
 *
 * It is proved two ways — sequentially, which a read-then-write would
 * also pass, and CONCURRENTLY, which a read-then-write would fail
 * because both callers would look, find nothing, and both insert. The
 * guarantee comes from the partial unique index in migration 0051, not
 * from application code, and this is what holds that index in place.
 */

import { afterEach, describe, expect, test } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { leads } from "./schema";
import { recordExternalLead } from "./service";

const SOURCE = "test_external_source";
const made: string[] = [];

const lead = (externalId: string, over: Record<string, unknown> = {}) => ({
  kind: "meta_instant_form" as const,
  externalSource: SOURCE,
  externalId,
  firstName: "Testcase",
  lastName: "Lead",
  email: `${externalId}@example.test`,
  phone: "+61400000000",
  meta: { campaign_name: "Test campaign" },
  ...over,
});

afterEach(async () => {
  if (made.length > 0) {
    await db.delete(leads).where(inArray(leads.externalId, made));
    made.length = 0;
  }
});

describe("recordExternalLead", () => {
  test("writes a lead the first time it is delivered", async () => {
    const id = `first-${Date.now()}`;
    made.push(id);

    const r = await recordExternalLead(lead(id));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.created).toBe(true);
    expect(r.value.lead?.email).toBe(`${id}@example.test`);
    expect(r.value.lead?.externalId).toBe(id);
  });

  test("a redelivery does not create a second row", async () => {
    const id = `replay-${Date.now()}`;
    made.push(id);

    const first = await recordExternalLead(lead(id));
    const second = await recordExternalLead(lead(id));

    expect(first.ok && first.value.created).toBe(true);
    expect(second.ok && second.value.created).toBe(false);

    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.externalSource, SOURCE), eq(leads.externalId, id)));
    expect(rows).toHaveLength(1);
  });

  test("a redelivery returns the existing row, so ops can still be told", async () => {
    // The first delivery may write the row and then fail to send the
    // notification. If the replay returned nothing, that lead would
    // never be mentioned to anyone.
    const id = `readback-${Date.now()}`;
    made.push(id);

    const first = await recordExternalLead(lead(id));
    const second = await recordExternalLead(lead(id));

    expect(second.ok && second.value.lead).not.toBeNull();
    if (!first.ok || !second.ok) return;
    expect(second.value.lead?.id).toBe(first.value.lead?.id);
    expect(second.value.lead?.opsNotifiedAt).toBeNull();
  });

  test("two simultaneous deliveries still produce one row", async () => {
    const id = `race-${Date.now()}`;
    made.push(id);

    // Warm two connections first. Without this the second call spends
    // its first ~100ms opening a WebSocket while the first has already
    // finished, and the calls never actually overlap — the test would
    // pass under an implementation that cannot survive a real race.
    await Promise.all([db.execute(sql`select 1`), db.execute(sql`select 1`)]);

    const [a, b] = await Promise.all([
      recordExternalLead(lead(id)),
      recordExternalLead(lead(id)),
    ]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    // Exactly one of them wrote. Which one does not matter.
    expect([a.value.created, b.value.created].filter(Boolean)).toHaveLength(1);

    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.externalSource, SOURCE), eq(leads.externalId, id)));
    expect(rows).toHaveLength(1);
  });

  test("the same id under a different source is a different lead", async () => {
    // The index is over the pair. A Google lead numbered 7 and a Meta
    // lead numbered 7 are two people.
    const id = `shared-${Date.now()}`;
    made.push(id);

    const a = await recordExternalLead(lead(id));
    const b = await recordExternalLead(lead(id, { externalSource: `${SOURCE}_two` }));
    expect(a.ok && a.value.created).toBe(true);
    expect(b.ok && b.value.created).toBe(true);

    const rows = await db.select().from(leads).where(eq(leads.externalId, id));
    expect(rows).toHaveLength(2);
  });

  test("records a lead whose email the form did not capture", async () => {
    const id = `noemail-${Date.now()}`;
    made.push(id);

    const r = await recordExternalLead(lead(id, { email: null, firstName: "Unknown" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.created).toBe(true);
    expect(r.value.lead?.phone).toBe("+61400000000");
  });

  test("honours the time Meta says the form was submitted", async () => {
    const id = `when-${Date.now()}`;
    made.push(id);

    const submitted = new Date("2026-08-20T01:23:45.000Z");
    const r = await recordExternalLead(lead(id, { createdAt: submitted }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lead?.createdAt.toISOString()).toBe(submitted.toISOString());
  });
});
