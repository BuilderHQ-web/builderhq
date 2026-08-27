/**
 * The 2026-08-20 incident, pinned so it cannot recur.
 *
 * Every test here maps to a failure that happened in production on the
 * first multi-dwelling pack. None of them threw at the time; each one
 * showed up as silence, a wrong-looking button, or money spent on work
 * that was discarded.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { dedupeRegister } from "./analysis";
import {
  EXTRACT_MAX_TOKENS,
  RESIDUAL_MAX_TOKENS,
  SYNTHESIS_MAX_TOKENS,
} from "./pipeline";
import { LEASE_MS, TICK_BUDGET_MS, MIN_TICK_BUDGET_MS } from "./service";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const service = read("./service.ts");

describe("the ceilings", () => {
  test("synthesis holds real headroom over the largest run ever seen", () => {
    // The largest real single dwelling wrote 24k; the multi-dwelling
    // that failed needed ~35.5k. The ceiling must clear the observed
    // worst case with room for the next size up.
    expect(SYNTHESIS_MAX_TOKENS).toBeGreaterThanOrEqual(64_000);
    expect(RESIDUAL_MAX_TOKENS).toBeGreaterThanOrEqual(32_000);
    expect(EXTRACT_MAX_TOKENS).toBeGreaterThanOrEqual(24_000);
  });

  test("every long call reports its share of the ceiling", () => {
    const pipeline = read("./pipeline.ts");
    for (const stage of ['"extract"', '"synthesis"', '"residual"']) {
      expect(pipeline, stage).toContain(`logHeadroom(${stage}`);
    }
  });

  test("the tick budget fits inside the platform ceiling with margin", () => {
    // maxDuration is 800s on both execution surfaces; the budget must
    // leave real margin for the return path.
    expect(TICK_BUDGET_MS).toBeLessThanOrEqual(760_000);
    expect(TICK_BUDGET_MS).toBeGreaterThanOrEqual(600_000);
    expect(LEASE_MS).toBeGreaterThan(TICK_BUDGET_MS);
    expect(MIN_TICK_BUDGET_MS).toBeLessThan(TICK_BUDGET_MS);
    const cron = read("../../app/api/cron/scope-tick/route.ts");
    const page = read("../../app/(app)/admin/scope/[runId]/page.tsx");
    expect(cron).toContain("export const maxDuration = 800");
    expect(page).toContain("export const maxDuration = 800");
  });
});

describe("the lease", () => {
  test("claiming takes an explicit lease, not an inference from updated_at", () => {
    expect(service).toContain("leaseUntil: new Date(Date.now() + LEASE_MS)");
  });

  test("a clean yield releases the lease so the next tick can claim at once", () => {
    // A tick that finished its slice used to lock out its own successor
    // for the full lease. That was half of yesterday.
    expect(service).toContain("const release = async ()");
    expect(service).toContain('leaseUntil: null');
    for (const y of ['yieldWith("classifying")', 'yieldWith("extracting")']) {
      expect(service, y).toContain(y);
    }
  });

  test("a held lease is a distinct answer with a retry time", () => {
    expect(service).toContain("locked: true as const");
    expect(service).toContain("retryInSec");
  });

  test("every run-level terminal write hands the lease back", () => {
    // Each place a RUN is marked failed must release in the same write.
    // (Document rows fail separately and carry no lease.)
    for (const context of [
      "the run budget is",                      // page-budget failure
      "could not be read after retrying",       // failed-document gate
      "Every register row failed",              // empty register
      'event: "scope.run.failed"',              // the tick's own catch
    ]) {
      const at = service.indexOf(context);
      expect(at, context).toBeGreaterThan(-1);
      const window = service.slice(Math.max(0, at - 700), at + 700);
      expect(window, context).toContain("leaseUntil: null");
    }
    expect(service).toMatch(/status: "review"[\s\S]{0,400}?leaseUntil: null/);
  });

  test("the desk button waits out a lock instead of quietly stopping", () => {
    const button = read("../../app/(app)/admin/scope/[runId]/run-review.tsx");
    expect(button).toContain("r.value.locked");
    expect(button).toContain("retryInSec");
  });
});

describe("the checkpoint", () => {
  test("pass one persists the moment it returns", () => {
    expect(service).toContain("synthesisCheckpoint: {");
    expect(service).toContain("resumed_from_checkpoint");
  });

  test("it is keyed to the exact document set, so a changed register discards it", () => {
    expect(service).toContain("savedCp.key === checkpointKey");
  });

  test("completion clears it in the same write that announces review", () => {
    expect(service).toMatch(/status: "review"[\s\S]{0,400}?synthesisCheckpoint: null/);
  });

  test("failure keeps it: pass one's work is real whatever failed after", () => {
    const at = service.indexOf('event: "scope.run.failed"');
    expect(at).toBeGreaterThan(-1);
    const failWrite = service.slice(Math.max(0, at - 700), at);
    expect(failWrite).toContain('status: "failed"');
    expect(failWrite).not.toContain("synthesisCheckpoint: null");
  });
});

describe("failed documents", () => {
  test("extraction retries once before declaring a document unreadable", () => {
    expect(service).toContain('event: "scope.extract.retry"');
    expect(service).toContain("(after ${attempt} attempts)");
  });

  test("a failed document stops the run loudly, never a silent hole", () => {
    // Yesterday synthesis ran over 8 of 10 documents and would have
    // shipped a finished-looking scope missing the architectural set.
    expect(service).toContain("could not be read after retrying");
    const gate = service.indexOf("could not be read after retrying");
    const synth = service.indexOf("await synthesiseRun({");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(synth);
  });

  test("the desk has a rescue lever, not a SQL console", () => {
    expect(service).toContain("export async function retryFailedDocuments");
    const button = read("../../app/(app)/admin/scope/[runId]/run-review.tsx");
    expect(button).toContain("retryFailedDocumentsAction");
    expect(button).toContain("Retry failed documents");
  });
});

describe("the watchdog", () => {
  test("a run processing for two hours alerts ops, once", () => {
    expect(service).toContain('kind: "scope_run_stalled"');
    // Deduped by the outbox key, so repeated sweeps cannot re-send.
    const drainer = read("../../app/api/cron/notification-outbox/route.ts");
    expect(drainer).toContain('row.kind === "scope_run_stalled"');
  });
});

describe("the register dedupe", () => {
  test("identical bytes are one document", () => {
    const docs = [
      { documentId: "a", kind: "energy", docTitle: "NatHERS Certificate", pageCount: 10, sha256: "aaa" },
      { documentId: "b", kind: "energy", docTitle: "NatHERS Certificate", pageCount: 10, sha256: "aaa" },
    ];
    const r = dedupeRegister(docs);
    expect(r.keep).toHaveLength(1);
    expect(r.duplicates).toHaveLength(1);
  });

  test("per-unit documents with matching titles are NOT duplicates", () => {
    // The exact false positive from the incident: Unit 1 and Unit 2
    // energy certificates share a title and a page count and are
    // different files.
    const docs = [
      { documentId: "u1", kind: "energy", docTitle: "NatHERS Certificate", pageCount: 10, sha256: "unit-one" },
      { documentId: "u2", kind: "energy", docTitle: "NatHERS Certificate", pageCount: 10, sha256: "unit-two" },
    ];
    const r = dedupeRegister(docs);
    expect(r.keep).toHaveLength(2);
    expect(r.duplicates).toHaveLength(0);
  });

  test("legacy rows without a hash still dedupe by the old heuristic", () => {
    const docs = [
      { documentId: "a", kind: "soil", docTitle: "Soil Report", pageCount: 5, sha256: null },
      { documentId: "b", kind: "soil", docTitle: "Soil Report", pageCount: 5, sha256: null },
    ];
    const r = dedupeRegister(docs);
    expect(r.keep).toHaveLength(1);
  });

  test("the caller feeds the hash through", () => {
    expect(service).toContain("sha256: documents.sha256");
    expect(service).toContain("sha256: d.sha256");
  });
});

describe("honest errors", () => {
  test("the invalid-shape message describes the problem, not the stop reason", () => {
    const pipeline = read("./pipeline.ts");
    expect(pipeline).toContain("extraction returned an invalid shape");
    expect(pipeline).not.toContain("(stop: ${message.stop_reason})");
  });
});
