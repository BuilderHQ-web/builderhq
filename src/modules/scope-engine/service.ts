/**
 * scope-engine · run orchestration (server-only).
 *
 * A run walks: pending → classifying → extracting → synthesising →
 * review → approved. Processing is RESUMABLE: `processRunTick` does
 * up to `budgetMs` of work (one document stage at a time), persists
 * every result, and reports whether work remains. The tick route
 * self-chains until the run reaches review; a crash resumes from the
 * last persisted document. Failed documents don't fail the run — a
 * register row carries its own error and ops sees it plainly.
 *
 * Ops review: every verdict writes the scope_run_items row AND an
 * append-only scope_review_events row — the labelled training data,
 * captured from run one exactly as ratified.
 */

import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { projects } from "@/modules/projects";
import { documents, getObjectBytes } from "@/modules/documents";
import { getScopeItem, SCOPE_STANDARD_VERSION } from "@/modules/scope";
import { isExtractionEnabled } from "@/modules/extraction/client";

import {
  scopeRuns,
  scopeRunDocuments,
  scopeRunItems,
  scopeRunConflicts,
  scopeReviewEvents,
  type ScopeRunRow,
  type ScopeRunDocumentRow,
  type ScopeRunItemRow,
  type ScopeRunConflictRow,
} from "./schema";
import {
  classifyDocument,
  extractDocument,
  synthesiseRun,
  estimateCostUsd,
  MAX_PDF_BYTES,
  type DocumentFindings,
  type StageUsage,
  type SynthesisDocumentInput,
} from "./pipeline";

type ScopeProjectType =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension";

// ── starting a run ──────────────────────────────────────────────────────

export async function startRun(
  projectId: string,
  startedBy: string,
): Promise<Result<ScopeRunRow>> {
  if (!isExtractionEnabled()) {
    return fail("internal", "Extraction is not configured on this environment.");
  }
  const [project] = await db
    .select({ id: projects.id, type: projects.type })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return fail("not_found", "Project not found.");

  const docs = await db
    .select({ id: documents.id, contentType: documents.contentType })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        sql`${documents.tenderId} is null`,
        eq(documents.status, "active"),
        sql`${documents.deletedAt} is null`,
      ),
    );
  const pdfIds = docs
    .filter((d) => d.contentType.toLowerCase().includes("pdf"))
    .map((d) => d.id);
  if (pdfIds.length === 0) {
    return fail("validation", "This project has no active PDF documents to read.");
  }

  // Later runs supersede earlier ones still in flight or in review.
  await db
    .update(scopeRuns)
    .set({ status: "superseded", updatedAt: new Date() })
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        inArray(scopeRuns.status, [
          "pending",
          "classifying",
          "extracting",
          "synthesising",
          "review",
        ]),
      ),
    );

  const [run] = await db
    .insert(scopeRuns)
    .values({
      projectId,
      status: "pending",
      scopeVersion: SCOPE_STANDARD_VERSION,
      startedBy,
    })
    .returning();
  if (!run) return fail("internal", "Could not create the run.");

  await db
    .insert(scopeRunDocuments)
    .values(pdfIds.map((documentId) => ({ runId: run.id, documentId })));

  logger.info(
    { event: "scope.run.started", runId: run.id, projectId, documents: pdfIds.length },
    "scope extraction run started",
  );
  return ok(run);
}

// ── the tick ────────────────────────────────────────────────────────────

async function loadDocBytes(documentId: string): Promise<{
  bytes: Uint8Array;
  filename: string;
} | null> {
  const [doc] = await db
    .select({ objectKey: documents.objectKey, filename: documents.filename })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return null;
  const { bytes } = await getObjectBytes(doc.objectKey);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) {
    return null;
  }
  return { bytes, filename: doc.filename };
}

function addUsage(
  usage: Record<string, StageUsage>,
  stage: string,
  add: StageUsage,
): Record<string, StageUsage> {
  const prev = usage[stage] ?? { inputTokens: 0, outputTokens: 0 };
  return {
    ...usage,
    [stage]: {
      inputTokens: prev.inputTokens + add.inputTokens,
      outputTokens: prev.outputTokens + add.outputTokens,
    },
  };
}

/**
 * Advance a run by up to `budgetMs` of wall-clock work. Returns the
 * run's status after the tick and whether more ticks are needed.
 * Never throws for per-document failures — those land on the
 * document row; a stage-level crash marks the run failed with the
 * error preserved.
 */
export async function processRunTick(
  runId: string,
  budgetMs = 240_000,
): Promise<Result<{ status: string; moreWork: boolean }>> {
  const started = Date.now();
  const timeLeft = () => budgetMs - (Date.now() - started);

  const [run] = await db
    .select()
    .from(scopeRuns)
    .where(eq(scopeRuns.id, runId))
    .limit(1);
  if (!run) return fail("not_found", "Run not found.");
  if (["review", "approved", "failed", "superseded"].includes(run.status)) {
    return ok({ status: run.status, moreWork: false });
  }

  const [project] = await db
    .select({ type: projects.type })
    .from(projects)
    .where(eq(projects.id, run.projectId))
    .limit(1);
  if (!project) return fail("not_found", "Project vanished under the run.");
  const projectType = project.type as ScopeProjectType;

  let usage = (run.usage ?? {}) as Record<string, StageUsage>;
  const bump = async (status: string) => {
    await db
      .update(scopeRuns)
      .set({ status, usage, updatedAt: new Date() })
      .where(eq(scopeRuns.id, runId));
  };

  try {
    // Stage 1 — classify every pending document.
    if (run.status === "pending" || run.status === "classifying") {
      await bump("classifying");
      for (;;) {
        if (timeLeft() < 30_000) return ok({ status: "classifying", moreWork: true });
        const [next] = await db
          .select()
          .from(scopeRunDocuments)
          .where(
            and(eq(scopeRunDocuments.runId, runId), eq(scopeRunDocuments.status, "pending")),
          )
          .limit(1);
        if (!next) break;
        await classifyOne(next, usage, (u) => (usage = u));
      }
      await bump("extracting");
    }

    // Stage 2 — extract every classified document.
    {
      for (;;) {
        if (timeLeft() < 60_000) return ok({ status: "extracting", moreWork: true });
        const [next] = await db
          .select()
          .from(scopeRunDocuments)
          .where(
            and(
              eq(scopeRunDocuments.runId, runId),
              eq(scopeRunDocuments.status, "classified"),
            ),
          )
          .limit(1);
        if (!next) break;
        await extractOne(next, projectType, usage, (u) => (usage = u));
      }
    }

    // Stage 3 — synthesis over everything extracted.
    if (timeLeft() < 90_000) return ok({ status: "extracting", moreWork: true });
    await bump("synthesising");

    const docRows = await db
      .select({
        row: scopeRunDocuments,
        filename: documents.filename,
      })
      .from(scopeRunDocuments)
      .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, runId));
    const extracted: SynthesisDocumentInput[] = docRows
      .filter((d) => d.row.status === "extracted" && d.row.findings)
      .map((d) => ({
        documentId: d.row.documentId,
        filename: d.filename,
        kind: d.row.kind ?? "other",
        revision: d.row.revision,
        findings: d.row.findings as DocumentFindings,
      }));
    if (extracted.length === 0) {
      await db
        .update(scopeRuns)
        .set({
          status: "failed",
          error: "No document could be read. Every register row failed.",
          usage,
          updatedAt: new Date(),
        })
        .where(eq(scopeRuns.id, runId));
      return ok({ status: "failed", moreWork: false });
    }

    const { synthesis, usage: synthUsage } = await synthesiseRun({
      projectType,
      documents: extracted,
    });
    usage = addUsage(usage, "synthesis", synthUsage);

    // Persist the selection — revisions denormalised onto citations so
    // every claim reads (document, page, revision) forever.
    const revisionByDoc = new Map(
      docRows.map((d) => [d.row.documentId, d.row.revision]),
    );
    await db.delete(scopeRunItems).where(eq(scopeRunItems.runId, runId));
    await db.delete(scopeRunConflicts).where(eq(scopeRunConflicts.runId, runId));
    if (synthesis.items.length > 0) {
      await db.insert(scopeRunItems).values(
        synthesis.items.map((i) => ({
          runId,
          itemId: i.itemId,
          status: i.status,
          citations: i.citations.map((c) => ({
            documentId: c.documentId,
            page: c.page,
            revision: revisionByDoc.get(c.documentId) ?? null,
          })),
          note: i.note,
          confidence: i.confidence,
        })),
      );
    }
    if (synthesis.conflicts.length > 0) {
      await db.insert(scopeRunConflicts).values(
        synthesis.conflicts.map((c) => ({
          runId,
          summary: c.summary,
          citations: c.citations.map((x) => ({
            documentId: x.documentId,
            page: x.page,
            revision: revisionByDoc.get(x.documentId) ?? null,
          })),
          severity: c.severity,
        })),
      );
    }

    const cost = estimateCostUsd(usage);
    await db
      .update(scopeRuns)
      .set({
        status: "review",
        usage: { ...usage, estimatedCostUsd: cost } as object,
        updatedAt: new Date(),
      })
      .where(eq(scopeRuns.id, runId));
    logger.info(
      {
        event: "scope.run.ready_for_review",
        runId,
        items: synthesis.items.length,
        conflicts: synthesis.conflicts.length,
        estimatedCostUsd: cost,
      },
      "scope run synthesised and ready for ops review",
    );
    return ok({ status: "review", moreWork: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(scopeRuns)
      .set({ status: "failed", error: msg, usage, updatedAt: new Date() })
      .where(eq(scopeRuns.id, runId));
    logger.error({ event: "scope.run.failed", runId, msg }, "scope run failed");
    return ok({ status: "failed", moreWork: false });
  }
}

async function classifyOne(
  docRow: ScopeRunDocumentRow,
  usage: Record<string, StageUsage>,
  setUsage: (u: Record<string, StageUsage>) => void,
): Promise<void> {
  try {
    const loaded = await loadDocBytes(docRow.documentId);
    if (!loaded) {
      await db
        .update(scopeRunDocuments)
        .set({ status: "failed", error: "Document unreadable or too large.", updatedAt: new Date() })
        .where(eq(scopeRunDocuments.id, docRow.id));
      return;
    }
    const { classification, usage: u } = await classifyDocument(loaded);
    setUsage(addUsage(usage, "classify", u));
    await db
      .update(scopeRunDocuments)
      .set({
        status: "classified",
        kind: classification.kind,
        revision: classification.revision,
        docTitle: classification.title,
        pageCount: classification.pageCount,
        updatedAt: new Date(),
      })
      .where(eq(scopeRunDocuments.id, docRow.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(scopeRunDocuments)
      .set({ status: "failed", error: msg, updatedAt: new Date() })
      .where(eq(scopeRunDocuments.id, docRow.id));
  }
}

async function extractOne(
  docRow: ScopeRunDocumentRow,
  projectType: ScopeProjectType,
  usage: Record<string, StageUsage>,
  setUsage: (u: Record<string, StageUsage>) => void,
): Promise<void> {
  try {
    const loaded = await loadDocBytes(docRow.documentId);
    if (!loaded) {
      await db
        .update(scopeRunDocuments)
        .set({ status: "failed", error: "Document unreadable or too large.", updatedAt: new Date() })
        .where(eq(scopeRunDocuments.id, docRow.id));
      return;
    }
    const { findings, usage: u } = await extractDocument({
      ...loaded,
      kind: docRow.kind ?? "other",
      projectType,
    });
    setUsage(addUsage(usage, "extract", u));
    await db
      .update(scopeRunDocuments)
      .set({ status: "extracted", findings: findings as object, updatedAt: new Date() })
      .where(eq(scopeRunDocuments.id, docRow.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(scopeRunDocuments)
      .set({ status: "failed", error: msg, updatedAt: new Date() })
      .where(eq(scopeRunDocuments.id, docRow.id));
  }
}

// ── reads for the ops surface ───────────────────────────────────────────

export async function listRuns(limit = 40): Promise<
  Array<
    ScopeRunRow & {
      projectTitle: string;
      projectSlug: string;
      projectType: string;
      documentCount: number;
      itemCount: number;
    }
  >
> {
  const rows = await db
    .select({
      run: scopeRuns,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      projectType: projects.type,
      documentCount: sql<number>`(select count(*) from ${scopeRunDocuments} d where d."run_id" = ${scopeRuns.id})`.mapWith(Number),
      itemCount: sql<number>`(select count(*) from ${scopeRunItems} i where i."run_id" = ${scopeRuns.id})`.mapWith(Number),
    })
    .from(scopeRuns)
    .innerJoin(projects, eq(projects.id, scopeRuns.projectId))
    .orderBy(desc(scopeRuns.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.run, ...r }));
}

export async function getRunForReview(runId: string): Promise<Result<{
  run: ScopeRunRow;
  project: { id: string; slug: string; title: string; type: string };
  register: Array<ScopeRunDocumentRow & { filename: string }>;
  items: ScopeRunItemRow[];
  conflicts: ScopeRunConflictRow[];
}>> {
  const [row] = await db
    .select({
      run: scopeRuns,
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectType: projects.type,
    })
    .from(scopeRuns)
    .innerJoin(projects, eq(projects.id, scopeRuns.projectId))
    .where(eq(scopeRuns.id, runId))
    .limit(1);
  if (!row) return fail("not_found", "Run not found.");

  const [register, items, conflicts] = await Promise.all([
    db
      .select({ doc: scopeRunDocuments, filename: documents.filename })
      .from(scopeRunDocuments)
      .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, runId)),
    db
      .select()
      .from(scopeRunItems)
      .where(eq(scopeRunItems.runId, runId)),
    db
      .select()
      .from(scopeRunConflicts)
      .where(eq(scopeRunConflicts.runId, runId)),
  ]);
  return ok({
    run: row.run,
    project: {
      id: row.projectId,
      slug: row.projectSlug,
      title: row.projectTitle,
      type: row.projectType,
    },
    register: register.map((r) => ({ ...r.doc, filename: r.filename })),
    items,
    conflicts,
  });
}

// ── ops verdicts (every one is training data) ───────────────────────────

async function recordReview(
  runId: string,
  subject: string,
  action: string,
  actorId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await db.insert(scopeReviewEvents).values({
    runId,
    subject,
    action,
    actorId,
    before: (before ?? null) as object | null,
    after: (after ?? null) as object | null,
  });
}

export interface ItemVerdictInput {
  opsStatus: "confirmed" | "edited" | "removed";
  /** For edits: the corrected fields. */
  status?: "evidenced" | "gap" | "not_expected";
  note?: string | null;
  opsNote?: string | null;
}

export async function reviewItem(
  actorId: string,
  itemRowId: string,
  verdict: ItemVerdictInput,
): Promise<Result<ScopeRunItemRow>> {
  const [row] = await db
    .select()
    .from(scopeRunItems)
    .where(eq(scopeRunItems.id, itemRowId))
    .limit(1);
  if (!row) return fail("not_found", "Item not found.");

  const [updated] = await db
    .update(scopeRunItems)
    .set({
      opsStatus: verdict.opsStatus,
      ...(verdict.status ? { status: verdict.status } : {}),
      ...(verdict.note !== undefined ? { note: verdict.note } : {}),
      opsNote: verdict.opsNote ?? row.opsNote,
      editedBy: actorId,
      editedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scopeRunItems.id, itemRowId))
    .returning();
  if (!updated) return fail("internal", "Could not save the verdict.");
  await recordReview(
    row.runId,
    row.itemId,
    `item.${verdict.opsStatus}`,
    actorId,
    { status: row.status, note: row.note },
    { status: updated.status, note: updated.note, opsNote: updated.opsNote },
  );
  return ok(updated);
}

/** Ops adds an item the pipeline missed — the strongest training
 *  signal there is. */
export async function addItem(
  actorId: string,
  runId: string,
  input: {
    itemId: string;
    status: "evidenced" | "gap";
    note: string | null;
  },
): Promise<Result<ScopeRunItemRow>> {
  if (!getScopeItem(input.itemId)) {
    return fail("validation", "That id is not in the Scope Standard.");
  }
  const [existing] = await db
    .select({ id: scopeRunItems.id })
    .from(scopeRunItems)
    .where(and(eq(scopeRunItems.runId, runId), eq(scopeRunItems.itemId, input.itemId)))
    .limit(1);
  if (existing) return fail("conflict", "That item is already on the run.");

  const [row] = await db
    .insert(scopeRunItems)
    .values({
      runId,
      itemId: input.itemId,
      status: input.status,
      note: input.note,
      confidence: null,
      opsStatus: "added",
      editedBy: actorId,
      editedAt: new Date(),
    })
    .returning();
  if (!row) return fail("internal", "Could not add the item.");
  await recordReview(runId, input.itemId, "item.added", actorId, null, {
    status: input.status,
    note: input.note,
  });
  return ok(row);
}

export async function reviewConflict(
  actorId: string,
  conflictId: string,
  opsStatus: "resolved" | "dismissed",
  opsNote: string | null,
): Promise<Result<{ ok: true }>> {
  const [row] = await db
    .select()
    .from(scopeRunConflicts)
    .where(eq(scopeRunConflicts.id, conflictId))
    .limit(1);
  if (!row) return fail("not_found", "Conflict not found.");
  await db
    .update(scopeRunConflicts)
    .set({ opsStatus, opsNote, updatedAt: new Date() })
    .where(eq(scopeRunConflicts.id, conflictId));
  await recordReview(
    row.runId,
    `conflict:${row.id}`,
    `conflict.${opsStatus}`,
    actorId,
    { summary: row.summary },
    { opsNote },
  );
  return ok({ ok: true });
}

/** Approve the run: every item must carry a verdict first. */
export async function approveRun(
  actorId: string,
  runId: string,
): Promise<Result<{ ok: true }>> {
  const [run] = await db
    .select()
    .from(scopeRuns)
    .where(eq(scopeRuns.id, runId))
    .limit(1);
  if (!run) return fail("not_found", "Run not found.");
  if (run.status !== "review") {
    return fail("conflict", "Only runs in review can be approved.");
  }
  const [pending] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(scopeRunItems)
    .where(
      and(
        eq(scopeRunItems.runId, runId),
        eq(scopeRunItems.opsStatus, "pending"),
        ne(scopeRunItems.status, "not_expected"),
      ),
    );
  if ((pending?.n ?? 0) > 0) {
    return fail(
      "validation",
      `${pending!.n} item(s) still await a verdict. Review everything before approving.`,
    );
  }
  await db
    .update(scopeRuns)
    .set({
      status: "approved",
      approvedBy: actorId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scopeRuns.id, runId));
  await recordReview(runId, "run", "run.approved", actorId, null, null);
  logger.info({ event: "scope.run.approved", runId, actorId }, "scope run approved");
  return ok({ ok: true });
}
