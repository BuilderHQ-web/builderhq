/**
 * The ops email must say which kind of read it is.
 *
 * Two defects, both seen on 21 August 2026.
 *
 * A re-read produced no start email at all: only requestPreparation
 * dispatched, so ops heard nothing until the pack reached review, and a
 * second "Pack ready for review" for the same project read as a fault
 * rather than as a customer adding a document. Answering "why have I
 * got another review of that project" took a database investigation
 * that one line in an email would have replaced.
 *
 * And the started email reported its document count through a field
 * called `evidencedCount`, which is why the template's own row was
 * reading a documented-items number that was really a file count.
 *
 * These tests pin the rendered output rather than the internals,
 * because the template is a stack of four-way ternaries and those
 * compile perfectly while reading wrong.
 */

import { readFileSync } from "node:fs";

import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";

import { ScopeRunOpsEmail } from "@/emails/ScopeRunOpsEmail";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const base = {
  projectTitle: "Multi-dwelling · Port Melbourne, VIC",
  evidencedCount: 181,
  gapCount: 45,
  estimatedCostUsd: 1.31,
  error: null,
  deskUrl: "https://builderhq.com.au/admin/scope/abc",
};

const plain = (props: Parameters<typeof ScopeRunOpsEmail>[0]) =>
  render(ScopeRunOpsEmail(props), { plainText: true });

describe("a re-read announces itself", () => {
  test("the start email names it a re-read and the first read does not", async () => {
    const first = await plain({ ...base, kind: "started", isReread: false, documentCount: 10 });
    const again = await plain({ ...base, kind: "started", isReread: true, documentCount: 11 });

    expect(first).toContain("AN ANALYSIS RUN HAS STARTED");
    expect(first).not.toMatch(/re-read/i);

    expect(again).toContain("A RE-READ HAS STARTED");
    expect(again).toContain("asked for a fresh read");
  });

  test("the review email says the pack it supersedes", async () => {
    // This is the email whose absence caused the investigation.
    const again = await plain({ ...base, kind: "review", isReread: true, documentCount: 11 });
    expect(again).toContain("A RE-READ IS WAITING FOR REVIEW");
    expect(again).toContain("supersedes the pack you reviewed before");

    const first = await plain({ ...base, kind: "review", isReread: false, documentCount: 10 });
    expect(first).toContain("A PACK IS WAITING FOR REVIEW");
    expect(first).not.toMatch(/supersedes/i);
  });
});

describe("the documents are counted and the new ones named", () => {
  test("the started email reports the document count, not an items count", async () => {
    // evidencedCount is deliberately a large number here. If the
    // template ever reads it again for the started row, this fails.
    const out = await plain({
      ...base,
      kind: "started",
      isReread: false,
      documentCount: 10,
      evidencedCount: 181,
    });
    expect(out).toContain("Documents in10");
    expect(out).not.toContain("Documents in181");
  });

  test("added documents are named on both started and review", async () => {
    for (const kind of ["started", "review"] as const) {
      const out = await plain({
        ...base,
        kind,
        isReread: true,
        documentCount: 11,
        addedDocuments: ["Melbourne Water Response.pdf"],
      });
      expect(out, kind).toContain("Added since the last read");
      expect(out, kind).toContain("Melbourne Water Response.pdf");
    }
  });

  test("a first read names nothing as added", async () => {
    const out = await plain({
      ...base,
      kind: "started",
      isReread: false,
      documentCount: 10,
      addedDocuments: [],
    });
    expect(out).not.toContain("Added since the last read");
  });

  test("a bulk upload is capped rather than listed in full", async () => {
    const out = await plain({
      ...base,
      kind: "started",
      isReread: true,
      documentCount: 18,
      addedDocuments: ["a.pdf", "b.pdf", "c.pdf", "d.pdf", "e.pdf", "f.pdf", "g.pdf"],
    });
    expect(out).toContain("and 2 more");
    expect(out).not.toContain("g.pdf");
  });
});

describe("the wiring that makes any of it possible", () => {
  const service = read("./service.ts");

  test("a re-read dispatches a start email at all", () => {
    // requestReread called startRun and never dispatched, so ops heard
    // nothing until review. The dispatch must sit inside requestReread,
    // not only inside requestPreparation.
    const fn = service.slice(
      service.indexOf("export async function requestReread"),
      service.indexOf("export async function completeOwnerReview"),
    );
    expect(fn).toContain('dispatchScopeRunOps(run.value.id, "started")');
  });

  test("the re-read flag is derived from runs, never from the audit event", () => {
    // The audit row is written after the dispatch fires and not at all
    // on the idempotent in-flight return, so reading it here would race
    // a row that may not exist and misreport a real re-read.
    const start = service.indexOf("async function dispatchScopeRunOps");
    const end = service.indexOf("The queue driver.", start);
    expect(start, "dispatchScopeRunOps not found").toBeGreaterThan(-1);
    expect(end, "boundary marker not found").toBeGreaterThan(start);
    const fn = service.slice(start, end);
    expect(fn).toContain("const isReread = !!baseline");
    // Strip comments before asserting on absence: the function
    // deliberately EXPLAINS in prose why it does not read the audit
    // event, and that explanation must not fail its own test.
    const code = fn.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toContain("reread_requested");
    expect(code).not.toContain("projectAuditEvents");
    // Restricted to finished reads: startRun supersedes prior unfinished
    // runs before inserting, so an unrestricted baseline would land on a
    // run that read nothing and report nothing added.
    expect(fn).toContain('inArray(scopeRuns.status, ["review", "approved"])');
  });

  test("the stalled drainer still typechecks against the optional fields", () => {
    // The outbox cron builds this input by hand with no run context, so
    // the three new fields must stay optional.
    const svc = read("../email/service.ts");
    const iface = svc.slice(
      svc.indexOf("interface SendScopeRunOpsEmailInput"),
      svc.indexOf("/** The desk's push"),
    );
    for (const f of ["isReread?:", "documentCount?:", "addedDocuments?:"]) {
      expect(iface, f).toContain(f);
    }
  });

  test("the stall watchdog's literals are untouched", () => {
    // resilience.test.ts greps the source for these two strings; the
    // ops-email work must not reformat them.
    expect(service).toContain('kind: "scope_run_stalled"');
  });
});
