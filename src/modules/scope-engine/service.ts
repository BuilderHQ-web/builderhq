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
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import { projects, briefForBuilders } from "@/modules/projects";
import { documents, getObjectBytes } from "@/modules/documents";
import {
  getScopeItem,
  adviseMissingDocuments,
  type DocumentAdvice,
  SCOPE_ITEMS,
  SCOPE_STANDARD_VERSION,
  ownerAllowanceEligible,
  isOwnerAskableGap,
  isOwnerDocGap,
} from "@/modules/scope";
import { isExtractionEnabled } from "@/modules/extraction/client";
import { SCOPE_CONFIDENCE_FLOOR } from "./floor";
import { users } from "@/modules/users";
import { unlocks } from "@/modules/unlocks";
import {
  toScheduleItem,
  diffSchedules,
  summariseDiff,
  type ScheduleDiff,
  type ScheduleItemKind,
  type TenderSchedule,
  type TenderScheduleItem,
} from "@/modules/tenders/schedule";

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
  type SynthesisOverview,
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
        overview: synthesis.overview as object | null,
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
    // The desk is a pull surface; this is the push. Ops hears the
    // moment a pack is waiting, not when someone happens to look.
    await dispatchScopeRunOps(runId, "review").catch(() => undefined);
    return ok({ status: "review", moreWork: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(scopeRuns)
      .set({ status: "failed", error: msg, usage, updatedAt: new Date() })
      .where(eq(scopeRuns.id, runId));
    logger.error({ event: "scope.run.failed", runId, msg }, "scope run failed");
    // A stalled pack is a runner waiting on a promise the platform
    // made. Ops must hear about failures before the client does.
    await dispatchScopeRunOps(runId, "failed").catch(() => undefined);
    return ok({ status: "failed", moreWork: false });
  }
}

/** Bell-free ops push: the pack needs eyes (or the run needs rescue). */
async function dispatchScopeRunOps(
  runId: string,
  kind: "review" | "failed",
): Promise<void> {
  try {
    const { sendScopeRunOpsEmail } = await import("@/modules/email");
    const { env } = await import("@/lib/env");

    const [row] = await db
      .select({
        projectTitle: projects.title,
        error: scopeRuns.error,
        usage: scopeRuns.usage,
      })
      .from(scopeRuns)
      .innerJoin(projects, eq(projects.id, scopeRuns.projectId))
      .where(eq(scopeRuns.id, runId))
      .limit(1);
    if (!row) return;

    const [tally] = await db
      .select({
        evidenced: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'evidenced')`.mapWith(Number),
        gaps: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'gap')`.mapWith(Number),
      })
      .from(scopeRunItems)
      .where(eq(scopeRunItems.runId, runId));

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const usage = row.usage as { estimatedCostUsd?: number } | null;
    await sendScopeRunOpsEmail({
      kind,
      projectTitle: row.projectTitle,
      evidencedCount: tally?.evidenced ?? 0,
      gapCount: tally?.gaps ?? 0,
      estimatedCostUsd: usage?.estimatedCostUsd ?? null,
      error: row.error,
      deskUrl: `${base}/admin/scope/${runId}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "scope.ops_dispatch_failed", runId, kind, msg },
      "scope ops dispatch failed",
    );
  }
}

/**
 * The queue driver. Advances every in-flight run, oldest first, within
 * one wall-clock budget — called by the scope-tick cron (and by the
 * local dev watcher). processRunTick is resumable and persists after
 * every document, so a budget cutoff mid-run costs nothing: the next
 * beat picks up exactly where this one stopped.
 */
export async function tickQueuedRuns(budgetMs = 50_000): Promise<{
  ticked: number;
  reachedReview: number;
  failed: number;
}> {
  const started = Date.now();
  const timeLeft = () => budgetMs - (Date.now() - started);

  const queued = await db
    .select({ id: scopeRuns.id })
    .from(scopeRuns)
    .where(
      inArray(scopeRuns.status, [
        "pending",
        "classifying",
        "extracting",
        "synthesising",
      ]),
    )
    .orderBy(scopeRuns.createdAt);

  let ticked = 0;
  let reachedReview = 0;
  let failed = 0;
  for (const run of queued) {
    // A tick needs room to finish at least one model call; below the
    // floor we stop and leave the rest to the next beat.
    if (timeLeft() < 20_000) break;
    const r = await processRunTick(run.id, timeLeft());
    if (!r.ok) continue;
    ticked++;
    if (r.value.status === "review") reachedReview++;
    if (r.value.status === "failed") failed++;
  }
  if (ticked > 0) {
    logger.info(
      { event: "scope.queue.ticked", queued: queued.length, ticked, reachedReview, failed },
      "scope queue advanced",
    );
  }
  return { ticked, reachedReview, failed };
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
      /** The addendum this run was issued as, when it was one. */
      addendumNumber: number | null;
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
      addendumNumber: sql<number | null>`(select a."number" from ${scopeAddenda} a where a."run_id" = ${scopeRuns.id})`,
    })
    .from(scopeRuns)
    .innerJoin(projects, eq(projects.id, scopeRuns.projectId))
    .orderBy(desc(scopeRuns.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.run, ...r }));
}

export interface OpsAddendumRow {
  id: string;
  number: number;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  runId: string;
  prevRunId: string | null;
  issuedAt: Date;
  issuedByName: string | null;
  diff: ScheduleDiff;
  /** Builders who were told, counted at read time. */
  notifiedCount: number;
}

/**
 * Every addendum issued across the platform, newest first — the ops
 * record of scope changes on live rounds. Ops never issues these (only
 * a runner can), so this is a watch surface: what moved, on whose
 * round, and how many builders were told.
 */
export async function listAddendaForOps(
  limit = 50,
): Promise<OpsAddendumRow[]> {
  const rows = await db
    .select({
      addendum: scopeAddenda,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      issuedByName: users.name,
      notifiedCount: sql<number>`(select count(*) from ${unlocks} u where u."project_id" = ${scopeAddenda.projectId})`.mapWith(Number),
    })
    .from(scopeAddenda)
    .innerJoin(projects, eq(projects.id, scopeAddenda.projectId))
    .leftJoin(users, eq(users.id, scopeAddenda.issuedBy))
    .orderBy(desc(scopeAddenda.issuedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.addendum.id,
    number: r.addendum.number,
    projectId: r.addendum.projectId,
    projectTitle: r.projectTitle,
    projectSlug: r.projectSlug,
    runId: r.addendum.runId,
    prevRunId: r.addendum.prevRunId,
    issuedAt: r.addendum.issuedAt,
    issuedByName: r.issuedByName,
    diff: r.addendum.diff as ScheduleDiff,
    notifiedCount: r.notifiedCount,
  }));
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

  // Re-reads carry the client's prior answers forward: a gap they
  // already resolved on the effective pack keeps its resolution, so
  // only what CHANGED asks again. upload_later never carries — the
  // re-read exists because those documents arrived.
  const carried = await carryForwardResolutions(run.projectId, runId);
  if (carried > 0) {
    logger.info(
      { event: "scope.run.resolutions_carried", runId, carried },
      "prior gap resolutions carried onto the new run",
    );
  }

  // The client is asked ONLY what is genuinely theirs: cosmetic
  // allowances, missing documents, the demolition question. Every
  // other gap — preliminaries, earthworks, services, structure — is
  // the builders' ordinary work and resolves to builder-priced here,
  // at approval, before the client ever sees the pack. It reaches
  // them as information in the scope of works, never as a task.
  const auto = await autoResolveBuilderWork(runId);
  if (auto > 0) {
    logger.info(
      { event: "scope.run.auto_resolved", runId, auto },
      "non-client gaps resolved to builder-priced",
    );
  }

  logger.info({ event: "scope.run.approved", runId, actorId }, "scope run approved");
  // The runner hears their pack is ready — bell and letter. Failures
  // never fail the approval; the desk shows the state regardless.
  await dispatchScopeReady(runId).catch(() => undefined);
  return ok({ ok: true });
}

/**
 * Resolve every gap the client should never be asked about to
 * builder-priced. The predicate is the pure isOwnerAskableGap rule;
 * anything already resolved (carried forward, or answered by hand on
 * the desk's watch) is left untouched.
 */
async function autoResolveBuilderWork(runId: string): Promise<number> {
  const gaps = await db
    .select({ itemId: scopeRunItems.itemId })
    .from(scopeRunItems)
    .where(
      and(
        eq(scopeRunItems.runId, runId),
        eq(scopeRunItems.status, "gap"),
        ne(scopeRunItems.opsStatus, "removed"),
      ),
    );
  const builderWork = gaps
    .map((g) => g.itemId)
    .filter((id) => !isOwnerAskableGap(id));
  // A documents-to-come answer only means something on a document the
  // client can supply. Today's interface offers it nowhere else, but
  // packs answered under the earlier interface may still hold one on
  // builders' ordinary work; its honest meaning there is that the
  // builders price the line.
  const promises = await db
    .select({
      id: scopeGapResolutions.id,
      itemId: scopeGapResolutions.itemId,
    })
    .from(scopeGapResolutions)
    .where(
      and(
        eq(scopeGapResolutions.runId, runId),
        eq(scopeGapResolutions.resolution, "upload_later"),
      ),
    );
  const stale = promises.filter((r) => !isOwnerDocGap(r.itemId));
  if (stale.length > 0) {
    await db
      .update(scopeGapResolutions)
      .set({ resolution: "builder_priced", amountAud: null })
      .where(
        inArray(
          scopeGapResolutions.id,
          stale.map((r) => r.id),
        ),
      );
  }
  if (builderWork.length === 0) return 0;
  // Query builder, not raw SQL: the sql template splats a JS array
  // into a row tuple, which no ::text[] cast survives.
  const inserted = await db
    .insert(scopeGapResolutions)
    .values(
      builderWork.map((itemId) => ({
        runId,
        itemId,
        resolution: "builder_priced",
      })),
    )
    .onConflictDoNothing()
    .returning({ id: scopeGapResolutions.id });
  return inserted.length;
}

/**
 * Card-weight pack stats for a set of projects: how much was read and
 * how many lines the pack carries, keyed by project. Marketplace
 * surfaces print these as the trust line; projects without an
 * effective pack simply have no entry. Three small grouped queries,
 * nothing clever.
 */
export async function packStatsForProjects(
  projectIds: string[],
): Promise<
  Record<string, { documents: number; pages: number; lines: number }>
> {
  if (projectIds.length === 0) return {};
  const runs = await db
    .select({ id: scopeRuns.id, projectId: scopeRuns.projectId })
    .from(scopeRuns)
    .where(
      and(
        inArray(scopeRuns.projectId, projectIds),
        sql`${scopeRuns.effectiveAt} is not null`,
      ),
    );
  if (runs.length === 0) return {};
  const runIds = runs.map((r) => r.id);
  const [docAgg, itemAgg] = await Promise.all([
    db
      .select({
        runId: scopeRunDocuments.runId,
        documents: sql<number>`count(*)::int`,
        pages: sql<number>`coalesce(sum(${scopeRunDocuments.pageCount}), 0)::int`,
      })
      .from(scopeRunDocuments)
      .where(inArray(scopeRunDocuments.runId, runIds))
      .groupBy(scopeRunDocuments.runId),
    db
      .select({
        runId: scopeRunItems.runId,
        lines: sql<number>`count(*)::int`,
      })
      .from(scopeRunItems)
      .where(
        and(
          inArray(scopeRunItems.runId, runIds),
          ne(scopeRunItems.opsStatus, "removed"),
        ),
      )
      .groupBy(scopeRunItems.runId),
  ]);
  const docsByRun = new Map(docAgg.map((r) => [r.runId, r]));
  const linesByRun = new Map(itemAgg.map((r) => [r.runId, r.lines]));
  const out: Record<
    string,
    { documents: number; pages: number; lines: number }
  > = {};
  for (const run of runs) {
    const d = docsByRun.get(run.id);
    out[run.projectId] = {
      documents: Number(d?.documents ?? 0),
      pages: Number(d?.pages ?? 0),
      lines: Number(linesByRun.get(run.id) ?? 0),
    };
  }
  return out;
}

/* ── the round, read from the builder's side ─────────────────────── */

export interface BuilderRoundContext {
  /** The client's brief as short labelled facts, builder order. */
  brief: Array<{ k: string; v: string }>;
  /** The reader's overview of the documents — post-unlock material. */
  overview: SynthesisOverview | null;
  /** What the register lacks — post-unlock pricing intelligence. */
  advisories: DocumentAdvice[];
}

/**
 * Everything the analysis learned that helps a builder weigh and then
 * price the round, in one read. The caller decides what travels to an
 * un-unlocked viewer: the BRIEF is qualification data and safe
 * everywhere; the overview and advisories quote and judge the
 * documents, so they stay behind the unlock.
 */
export async function getRoundContextForBuilders(
  projectId: string,
): Promise<BuilderRoundContext> {
  const [project] = await db
    .select({ ownerBrief: projects.ownerBrief, type: projects.type })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const brief = briefForBuilders(project?.ownerBrief ?? null);

  const [run] = await db
    .select({ id: scopeRuns.id, overview: scopeRuns.overview })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        eq(scopeRuns.status, "approved"),
        sql`${scopeRuns.effectiveAt} is not null`,
      ),
    )
    .limit(1);
  if (!run || !project) {
    return { brief, overview: null, advisories: [] };
  }

  const [register, items] = await Promise.all([
    db
      .select({
        documentId: scopeRunDocuments.documentId,
        kind: scopeRunDocuments.kind,
      })
      .from(scopeRunDocuments)
      .where(eq(scopeRunDocuments.runId, run.id)),
    db
      .select({
        itemId: scopeRunItems.itemId,
        status: scopeRunItems.status,
        citations: scopeRunItems.citations,
      })
      .from(scopeRunItems)
      .where(
        and(
          eq(scopeRunItems.runId, run.id),
          ne(scopeRunItems.opsStatus, "removed"),
        ),
      ),
  ]);

  const kindByDoc = new Map<string, string>();
  for (const r of register) {
    if (r.kind) kindByDoc.set(r.documentId, r.kind);
  }
  const divisionSources: Record<string, string[]> = {};
  const evidencedDivisions = new Set<string>();
  for (const i of items) {
    if (i.status !== "evidenced") continue;
    const div = getScopeItem(i.itemId)?.division;
    if (!div) continue;
    evidencedDivisions.add(div);
    const kinds = new Set(divisionSources[div] ?? []);
    for (const c of (i.citations ?? []) as Array<{ documentId: string }>) {
      const k = kindByDoc.get(c.documentId);
      if (k) kinds.add(k);
    }
    divisionSources[div] = [...kinds];
  }
  const advisories = adviseMissingDocuments({
    registerKinds: register
      .map((r) => r.kind)
      .filter((k): k is string => !!k),
    evidencedDivisions: [...evidencedDivisions],
    divisionSources,
    projectType: project.type,
  });

  return {
    brief,
    overview: (run.overview as SynthesisOverview | null) ?? null,
    advisories,
  };
}

/** Copy still-relevant gap resolutions from the effective run. */
async function carryForwardResolutions(
  projectId: string,
  newRunId: string,
): Promise<number> {
  const [prev] = await db
    .select({ id: scopeRuns.id })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        eq(scopeRuns.status, "approved"),
        sql`${scopeRuns.effectiveAt} is not null`,
        ne(scopeRuns.id, newRunId),
      ),
    )
    .orderBy(desc(scopeRuns.effectiveAt))
    .limit(1);
  if (!prev) return 0;

  const rows = await db.execute(sql`
    insert into scope_gap_resolutions
      (run_id, item_id, resolution, amount_aud, note, created_by)
    select ${newRunId}, r.item_id, r.resolution, r.amount_aud, r.note, r.created_by
    from scope_gap_resolutions r
    where r.run_id = ${prev.id}
      and r.resolution <> 'upload_later'
      and exists (
        select 1 from scope_run_items i
        where i.run_id = ${newRunId}
          and i.item_id = r.item_id
          and i.status = 'gap'
          and i.ops_status <> 'removed'
      )
    on conflict (run_id, item_id) do nothing
    returning id
  `);
  return Array.isArray(rows) ? rows.length : (rows.rows?.length ?? 0);
}

/** Bell + letter to the runner when ops approves their pack. */
async function dispatchScopeReady(runId: string): Promise<void> {
  try {
    const { create: createNotification } = await import("@/modules/notifications");
    const { sendScopeReadyEmail } = await import("@/modules/email");
    const { env } = await import("@/lib/env");

    const [row] = await db
      .select({
        projectId: projects.id,
        projectSlug: projects.slug,
        projectTitle: projects.title,
        runnerId: projects.ownerId,
        runnerEmail: users.email,
        runnerFirstName: users.firstName,
        runnerRole: users.role,
      })
      .from(scopeRuns)
      .innerJoin(projects, eq(projects.id, scopeRuns.projectId))
      .innerJoin(users, eq(users.id, projects.ownerId))
      .where(eq(scopeRuns.id, runId))
      .limit(1);
    if (!row) return;

    const [tally] = await db
      .select({
        evidenced: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'evidenced' and ${scopeRunItems.opsStatus} <> 'removed')`.mapWith(Number),
        gaps: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'gap' and ${scopeRunItems.opsStatus} <> 'removed')`.mapWith(Number),
      })
      .from(scopeRunItems)
      .where(eq(scopeRunItems.runId, runId));

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const reviewUrl = `${base}${row.runnerRole === "architect" ? "/architect" : "/owner"}/projects/${row.projectSlug}/scope`;

    await Promise.allSettled([
      createNotification({
        userId: row.runnerId,
        kind: "scope_ready",
        title: `Your tender pack for ${row.projectTitle} is ready`,
        body: `${tally?.evidenced ?? 0} items documented · ${tally?.gaps ?? 0} need your answer.`,
        actionUrl: reviewUrl,
        projectId: row.projectId,
      }),
      sendScopeReadyEmail({
        to: row.runnerEmail,
        runnerFirstName: row.runnerFirstName,
        projectTitle: row.projectTitle,
        evidencedCount: tally?.evidenced ?? 0,
        gapCount: tally?.gaps ?? 0,
        reviewUrl,
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "scope.ready.dispatch_failed", runId, msg }, "scope ready dispatch failed");
  }
}

// ── S2 · the publish gate and the owner review ──────────────────────────

import {
  publish as publishProject,
  checkPublishability,
  getProjectAccess,
  recordProjectEvent,
} from "@/modules/projects";
import {
  scopeGapResolutions,
  scopeAddenda,
  type ScopeGapResolutionRow,
  type ScopeAddendumRow,
} from "./schema";

/**
 * The four answers a runner can give an open question:
 *   allowance      — a locked sum every builder prices against equally
 *   builder_priced — the line stays on the schedule; each builder
 *                    prices it within their quote (the everyday answer:
 *                    skip bins, temporary fencing, a hundred small
 *                    things no owner should have to cost themselves)
 *   excluded       — outside this contract entirely
 *   upload_later   — the documents are coming; re-read before going out
 */
export type GapResolutionKind =
  | "allowance"
  | "builder_priced"
  | "excluded"
  | "upload_later";

/**
 * The runner submits for preparation. Publishability is validated
 * NOW, with the same rules the real publish enforces, so nobody
 * waits a day to learn their draft was missing an address. Status
 * stays draft; the run starts; ops hears through the desk.
 */
export async function requestPreparation(
  projectId: string,
  runnerId: string,
): Promise<Result<{ runId: string }>> {
  const report = await checkPublishability(runnerId, projectId);
  if (!report.ok) return report;
  if (!report.value.canPublish) {
    return fail("validation", "Project isn't ready to submit yet.", {
      missing: report.value.missing,
      reasons: report.value.reasons,
    });
  }
  const run = await startRun(projectId, runnerId);
  if (!run.ok) return run;

  await db
    .update(projects)
    .set({ publishRequestedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, runnerId)));
  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "scope.preparation_requested",
    subjectId: run.value.id,
    summary: "Submitted the project for tender pack preparation.",
  });
  return ok({ runId: run.value.id });
}

export interface OwnerScopeReview {
  phase: "reading" | "ready" | "none";
  run: ScopeRunRow | null;
  /** docId → display name, for citation rendering. */
  documentNames: Record<string, string>;
  /** The document register: what was read, as the reader saw it. */
  register: Array<{
    documentId: string;
    filename: string;
    docTitle: string | null;
    kind: string | null;
    pageCount: number | null;
  }>;
  items: ScopeRunItemRow[];
  resolutions: ScopeGapResolutionRow[];
  /** Runner may act; seats read. */
  canResolve: boolean;
  /**
   * The acceptance this review ends in. "publish" opens the round;
   * "addendum" re-issues a live round's pack; "record" means the
   * shown pack is already the round's effective schedule — nothing
   * left to accept, only a re-read to request.
   */
  mode: "publish" | "addendum" | "record";
  /** The round's addendum register, newest first. */
  addenda: ScopeAddendumRow[];
}

/**
 * The owner-facing read: seat-aware (the runner and every joined
 * participant see it; only the runner resolves). Before ops approval
 * the owner sees only that reading is under way — never a half-
 * reviewed pack.
 */
export async function getOwnerReview(
  projectId: string,
  userId: string,
): Promise<Result<OwnerScopeReview>> {
  const access = await getProjectAccess(projectId, userId);
  if (!access) return fail("forbidden", "Not your project.");

  const [[run], [project], addenda] = await Promise.all([
    db
      .select()
      .from(scopeRuns)
      .where(
        and(
          eq(scopeRuns.projectId, projectId),
          inArray(scopeRuns.status, [
            "pending",
            "classifying",
            "extracting",
            "synthesising",
            "review",
            "approved",
          ]),
        ),
      )
      .orderBy(desc(scopeRuns.createdAt))
      .limit(1),
    db
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1),
    listAddenda(projectId),
  ]);
  const live =
    project?.status === "published" || project?.status === "tendering";
  const mode: OwnerScopeReview["mode"] =
    run?.status === "approved" && run.effectiveAt
      ? "record"
      : live
        ? "addendum"
        : "publish";
  if (!run) {
    return ok({
      phase: "none",
      run: null,
      documentNames: {},
      register: [],
      items: [],
      resolutions: [],
      canResolve: access.kind === "runner",
      mode,
      addenda,
    });
  }
  if (run.status !== "approved") {
    const readingRegister = await db
      .select({
        documentId: scopeRunDocuments.documentId,
        filename: documents.filename,
        docTitle: scopeRunDocuments.docTitle,
        kind: scopeRunDocuments.kind,
        pageCount: scopeRunDocuments.pageCount,
      })
      .from(scopeRunDocuments)
      .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, run.id));
    return ok({
      phase: "reading",
      run,
      documentNames: {},
      register: readingRegister,
      items: [],
      resolutions: [],
      canResolve: access.kind === "runner",
      mode,
      addenda,
    });
  }
  const [items, resolutions, register] = await Promise.all([
    db
      .select()
      .from(scopeRunItems)
      .where(
        and(eq(scopeRunItems.runId, run.id), ne(scopeRunItems.opsStatus, "removed")),
      ),
    db
      .select()
      .from(scopeGapResolutions)
      .where(eq(scopeGapResolutions.runId, run.id)),
    db
      .select({
        documentId: scopeRunDocuments.documentId,
        filename: documents.filename,
        docTitle: scopeRunDocuments.docTitle,
        kind: scopeRunDocuments.kind,
        pageCount: scopeRunDocuments.pageCount,
      })
      .from(scopeRunDocuments)
      .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, run.id)),
  ]);
  return ok({
    phase: "ready",
    run,
    documentNames: Object.fromEntries(register.map((r) => [r.documentId, r.filename])),
    register,
    items,
    resolutions,
    canResolve: access.kind === "runner",
    mode,
    addenda,
  });
}

/** The runner answers one gap. Allowances demand a positive amount —
 *  a locked sum every builder prices against equally. */
export async function resolveGap(
  runnerId: string,
  projectId: string,
  itemId: string,
  input: { resolution: GapResolutionKind; amountAud?: number | null; note?: string | null },
): Promise<Result<ScopeGapResolutionRow>> {
  const access = await getProjectAccess(projectId, runnerId);
  if (access?.kind !== "runner") {
    return fail("forbidden", "Only the project runner resolves the scope.");
  }
  const [run] = await db
    .select({
      id: scopeRuns.id,
      status: scopeRuns.status,
      effectiveAt: scopeRuns.effectiveAt,
    })
    .from(scopeRuns)
    .where(and(eq(scopeRuns.projectId, projectId), eq(scopeRuns.status, "approved")))
    .orderBy(desc(scopeRuns.createdAt))
    .limit(1);
  if (!run) return fail("conflict", "No approved tender pack to resolve against.");
  // A pack that is live for builders never changes in place — answers
  // move only through a re-read and a numbered addendum.
  if (run.effectiveAt) {
    return fail(
      "conflict",
      "This pack is already live for the round. Add documents and request a re-read to change it.",
    );
  }

  const [item] = await db
    .select({ id: scopeRunItems.id, status: scopeRunItems.status })
    .from(scopeRunItems)
    .where(and(eq(scopeRunItems.runId, run.id), eq(scopeRunItems.itemId, itemId)))
    .limit(1);
  if (!item || item.status !== "gap") {
    return fail("validation", "That line is not an open gap on this pack.");
  }
  if (input.resolution === "allowance") {
    if (!Number.isInteger(input.amountAud) || (input.amountAud ?? 0) <= 0) {
      return fail("validation", "An allowance needs a whole-dollar amount above zero.");
    }
    // Client allowances belong on selections and cosmetic works only.
    // A client-locked figure on structure or ground works would
    // distort every quote on the round — the builders price those.
    if (!ownerAllowanceEligible(itemId)) {
      return fail(
        "validation",
        "This line is priced by the builders, not by an allowance. Leave it to them, or exclude it from the contract.",
      );
    }
  }

  const values = {
    runId: run.id,
    itemId,
    resolution: input.resolution,
    amountAud: input.resolution === "allowance" ? input.amountAud! : null,
    note: input.note?.trim() || null,
    createdBy: runnerId,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(scopeGapResolutions)
    .values(values)
    .onConflictDoUpdate({
      target: [scopeGapResolutions.runId, scopeGapResolutions.itemId],
      set: values,
    })
    .returning();
  if (!row) return fail("internal", "Could not save the resolution.");
  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "scope.gap_resolved",
    subjectId: row.id,
    summary:
      input.resolution === "allowance"
        ? `Set an allowance of $${input.amountAud} for ${itemId}.`
        : input.resolution === "builder_priced"
          ? `Left ${itemId} to the builders to price.`
          : input.resolution === "excluded"
            ? `Excluded ${itemId} from this tender.`
            : `Marked ${itemId} as documents to come.`,
  });
  return ok(row);
}

/** Documents arrived after 'upload_later' answers — read again. A new
 *  run supersedes the old; its resolutions die with it by design. */
export async function requestReread(
  projectId: string,
  runnerId: string,
): Promise<Result<{ runId: string }>> {
  const access = await getProjectAccess(projectId, runnerId);
  if (access?.kind !== "runner") {
    return fail("forbidden", "Only the project runner can request a re-read.");
  }
  const run = await startRun(projectId, runnerId);
  if (!run.ok) return run;
  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "scope.reread_requested",
    subjectId: run.value.id,
    summary: "Requested a fresh read after adding documents.",
  });
  return ok({ runId: run.value.id });
}

/**
 * The gate opens: every gap carries an allowance or an exclusion. On a
 * draft the round goes live through the EXISTING publish path —
 * validation, fan-out, celebration all unchanged. On a round already
 * live, the same acceptance ISSUES AN ADDENDUM instead: the new pack
 * becomes effective, the change is diffed and numbered, and every
 * builder on the round is told formally.
 */
export async function completeOwnerReview(
  projectId: string,
  runnerId: string,
): Promise<
  Result<
    | { published: true; slug: string }
    | { addendum: number; summary: string }
  >
> {
  const review = await getOwnerReview(projectId, runnerId);
  if (!review.ok) return review;
  if (review.value.phase !== "ready" || !review.value.run) {
    return fail("conflict", "The tender pack is not ready yet.");
  }
  if (!review.value.canResolve) {
    return fail("forbidden", "Only the project runner can complete the review.");
  }
  if (review.value.run.effectiveAt) {
    return fail("conflict", "This pack is already live for the round.");
  }
  // Safety net before judging: materialise builder-priced rows for
  // every builders'-work gap and flip stale document promises. Runs
  // approved before auto-resolve existed arrive here without either,
  // and neither is the client's to fix. Idempotent, so the normal
  // path pays one cheap no-op.
  await autoResolveBuilderWork(review.value.run.id);
  const healed = await db
    .select({
      itemId: scopeGapResolutions.itemId,
      resolution: scopeGapResolutions.resolution,
    })
    .from(scopeGapResolutions)
    .where(eq(scopeGapResolutions.runId, review.value.run.id));
  const resolutionByItem = new Map(healed.map((r) => [r.itemId, r]));
  const gaps = review.value.items.filter((i) => i.status === "gap");
  const unresolved = gaps.filter((g) => !resolutionByItem.has(g.itemId));
  if (unresolved.length > 0) {
    return fail(
      "validation",
      unresolved.length === 1
        ? "1 answer is still needed before the pack can go out."
        : `${unresolved.length} answers are still needed before the pack can go out.`,
    );
  }
  const waitingOnDocs = gaps.filter(
    (g) => resolutionByItem.get(g.itemId)?.resolution === "upload_later",
  );
  if (waitingOnDocs.length > 0) {
    return fail(
      "validation",
      waitingOnDocs.length === 1
        ? "1 answer promises documents. Add them and request a re-read, or answer it another way."
        : `${waitingOnDocs.length} answers promise documents. Add them and request a re-read, or answer them another way.`,
    );
  }

  const [project] = await db
    .select({ status: projects.status, ownerBriefAt: projects.ownerBriefAt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return fail("not_found", "Project not found.");
  // Builders answer seventy questions before pricing; the client
  // answers six before going to market. The round does not open on a
  // one-way street.
  if (!project.ownerBriefAt) {
    return fail(
      "validation",
      "Answer your brief for the builders first. It takes under a minute.",
    );
  }

  // ── a live round: issue the addendum ────────────────────────────────
  if (project.status === "published" || project.status === "tendering") {
    return issueAddendum(projectId, runnerId, review.value.run.id);
  }

  // ── a draft: the one true publish path ──────────────────────────────
  const published = await publishProject(runnerId, projectId);
  if (!published.ok) return published;
  await db
    .update(scopeRuns)
    .set({ effectiveAt: new Date(), updatedAt: new Date() })
    .where(eq(scopeRuns.id, review.value.run.id));
  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "scope.accepted",
    subjectId: review.value.run.id,
    summary: "Accepted the tender pack. The round went live.",
  });
  logger.info(
    { event: "scope.owner_review.completed", projectId, runId: review.value.run.id },
    "owner review completed and project published",
  );
  // Publishing REGENERATES the slug, so the caller cannot route from
  // the URL it is standing on. Hand back the new one.
  return ok({ published: true as const, slug: published.value.slug });
}

/**
 * The formal re-issue: diff the accepted pack against the round's
 * effective one, number it, flip effectiveness, retire the old run,
 * record it, and tell every builder on the round. One transaction of
 * meaning — a round's scope never changes quietly.
 */
async function issueAddendum(
  projectId: string,
  runnerId: string,
  newRunId: string,
): Promise<Result<{ addendum: number; summary: string }>> {
  const [prev] = await db
    .select({ id: scopeRuns.id })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        eq(scopeRuns.status, "approved"),
        sql`${scopeRuns.effectiveAt} is not null`,
        ne(scopeRuns.id, newRunId),
      ),
    )
    .orderBy(desc(scopeRuns.effectiveAt))
    .limit(1);
  if (!prev) {
    return fail("conflict", "No effective pack to issue an addendum against.");
  }

  const [prevSchedule, nextSchedule] = await Promise.all([
    getScheduleForRun(prev.id),
    getScheduleForRun(newRunId),
  ]);
  if (!prevSchedule || !nextSchedule) {
    return fail("internal", "Could not resolve the packs to compare.");
  }
  const diff = diffSchedules(prevSchedule, nextSchedule);
  const summary = summariseDiff(diff);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(scopeAddenda)
    .where(eq(scopeAddenda.projectId, projectId));
  const number = (countRow?.n ?? 0) + 1;

  const now = new Date();
  const [row] = await db
    .insert(scopeAddenda)
    .values({
      projectId,
      runId: newRunId,
      prevRunId: prev.id,
      number,
      diff,
      issuedBy: runnerId,
    })
    .returning();
  if (!row) return fail("internal", "Could not record the addendum.");

  await db
    .update(scopeRuns)
    .set({ effectiveAt: now, updatedAt: now })
    .where(eq(scopeRuns.id, newRunId));
  // The old pack stops being effective the instant the new one starts.
  // effective_at therefore means exactly one thing — "this run IS the
  // round's live schedule" — with at most one per project. When it was
  // effective stays on record via the addendum's prevRunId + issuedAt.
  await db
    .update(scopeRuns)
    .set({ status: "superseded", effectiveAt: null, updatedAt: now })
    .where(eq(scopeRuns.id, prev.id));

  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "scope.addendum_issued",
    subjectId: row.id,
    summary: `Issued Addendum ${String(number).padStart(2, "0")}. ${summary}.`,
  });
  logger.info(
    { event: "scope.addendum.issued", projectId, runId: newRunId, number },
    "scope addendum issued",
  );
  await dispatchAddendum(projectId, number, summary).catch(() => undefined);
  return ok({ addendum: number, summary });
}

/** The addendum register, newest first. */
export async function listAddenda(
  projectId: string,
): Promise<ScopeAddendumRow[]> {
  return db
    .select()
    .from(scopeAddenda)
    .where(eq(scopeAddenda.projectId, projectId))
    .orderBy(desc(scopeAddenda.number));
}

/**
 * Bell and letter to every builder on the round — unlocked, invited
 * through an unlock, drafting or submitted. A scope change is exactly
 * the news a tenderer must never miss.
 */
async function dispatchAddendum(
  projectId: string,
  number: number,
  summary: string,
): Promise<void> {
  try {
    const { tenders } = await import("@/modules/tenders/schema");
    const { create: createNotification } = await import(
      "@/modules/notifications"
    );
    const { sendScopeAddendumEmail } = await import("@/modules/email");
    const { env } = await import("@/lib/env");

    const [project] = await db
      .select({ slug: projects.slug, title: projects.title })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) return;

    const audience = await db
      .selectDistinct({
        builderId: unlocks.builderId,
        email: users.email,
        firstName: users.firstName,
      })
      .from(unlocks)
      .innerJoin(users, eq(users.id, unlocks.builderId))
      .where(eq(unlocks.projectId, projectId));

    const holders = await db
      .select({ builderId: tenders.builderId, status: tenders.status })
      .from(tenders)
      .where(
        and(
          eq(tenders.projectId, projectId),
          inArray(tenders.status, ["draft", "submitted", "shortlisted"]),
        ),
      );
    const holding = new Set(holders.map((h) => h.builderId));

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const label = `Addendum ${String(number).padStart(2, "0")}`;
    await Promise.allSettled(
      audience.flatMap((b) => {
        const hasTender = holding.has(b.builderId);
        const url = `${base}/builder/projects/${project.slug}${hasTender ? "/tender" : ""}`;
        return [
          createNotification({
            userId: b.builderId,
            kind: "scope_addendum",
            title: `${label} issued — ${project.title}`,
            body: `${summary}. ${hasTender ? "Review your tender against the revised schedule." : "The tender schedule was re-issued."}`,
            actionUrl: url,
            projectId,
          }),
          sendScopeAddendumEmail({
            to: b.email,
            builderFirstName: b.firstName,
            projectTitle: project.title,
            addendumLabel: label,
            summary,
            hasTender,
            actionUrl: url,
          }),
        ];
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "scope.addendum.dispatch_failed", projectId, msg },
      "addendum dispatch failed",
    );
  }
}

// ── the tender schedule ─────────────────────────────────────────────────

/**
 * Resolve the project's TENDER SCHEDULE — the EFFECTIVE pack shaped
 * for tendering. Null when the project has no effective run (the round
 * runs the legacy instrument). A re-read that ops has approved but the
 * runner has not issued stays invisible here: the round's truth moves
 * only when the addendum does. Lines:
 *   evidenced items (ops kept)      → "evidenced", with citations
 *   gaps the client set a figure on → "owner_allowance"
 *   gaps the client excluded        → "owner_excluded" (context, never priced)
 * Ordered by the Scope Standard's build order.
 */
export async function getProjectSchedule(
  projectId: string,
): Promise<TenderSchedule | null> {
  const [run] = await db
    .select({ id: scopeRuns.id, scopeVersion: scopeRuns.scopeVersion })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        eq(scopeRuns.status, "approved"),
        sql`${scopeRuns.effectiveAt} is not null`,
      ),
    )
    .orderBy(desc(scopeRuns.effectiveAt))
    .limit(1);
  if (!run) return null;
  return scheduleForRun(run.id, run.scopeVersion);
}

/**
 * The schedule a SPECIFIC run resolves to, regardless of whether it is
 * still the round's effective pack. A sealed tender renders against
 * the pack it was priced on (its pinned run) forever — an addendum
 * must never silently rewrite a submitted document.
 */
export async function getScheduleForRun(
  runId: string,
): Promise<TenderSchedule | null> {
  const [run] = await db
    .select({ id: scopeRuns.id, scopeVersion: scopeRuns.scopeVersion })
    .from(scopeRuns)
    .where(eq(scopeRuns.id, runId))
    .limit(1);
  if (!run) return null;
  return scheduleForRun(run.id, run.scopeVersion);
}

async function scheduleForRun(
  runId: string,
  scopeVersion: string,
): Promise<TenderSchedule | null> {
  const run = { id: runId, scopeVersion };
  const [items, resolutions, docRows] = await Promise.all([
    db
      .select()
      .from(scopeRunItems)
      .where(
        and(
          eq(scopeRunItems.runId, run.id),
          ne(scopeRunItems.status, "not_expected"),
          ne(scopeRunItems.opsStatus, "removed"),
        ),
      ),
    db
      .select()
      .from(scopeGapResolutions)
      .where(eq(scopeGapResolutions.runId, run.id)),
    db
      .select({
        documentId: scopeRunDocuments.documentId,
        docTitle: scopeRunDocuments.docTitle,
        filename: documents.filename,
      })
      .from(scopeRunDocuments)
      .leftJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, run.id)),
  ]);

  const nameByDoc = new Map(
    docRows.map((d) => [d.documentId, d.docTitle ?? d.filename ?? null]),
  );
  const resolutionByItem = new Map(resolutions.map((r) => [r.itemId, r]));

  const out: TenderScheduleItem[] = [];
  for (const row of items) {
    const citations = (Array.isArray(row.citations) ? row.citations : [])
      .filter(
        (c): c is { documentId: string; page: number; revision: string | null } =>
          !!c &&
          typeof c === "object" &&
          typeof (c as { page?: unknown }).page === "number",
      )
      .map((c) => ({
        documentName: nameByDoc.get(c.documentId) ?? null,
        page: c.page,
        revision: c.revision ?? null,
      }));

    let kind: ScheduleItemKind;
    let ownerAmountAud: number | null = null;
    if (row.status === "evidenced") {
      kind = "evidenced";
    } else {
      // A gap on an approved, published pack always carries the
      // client's answer; an unresolved or documents-to-come line can
      // never survive completeOwnerReview. Skip defensively if one
      // somehow does — a schedule must not invent a scope line.
      const r = resolutionByItem.get(row.itemId);
      if (!r || r.resolution === "upload_later") continue;
      if (r.resolution === "allowance") {
        kind = "owner_allowance";
        ownerAmountAud = r.amountAud ?? null;
      } else if (r.resolution === "builder_priced") {
        kind = "owner_open";
      } else {
        kind = "owner_excluded";
      }
    }

    const item = toScheduleItem({
      itemId: row.itemId,
      kind,
      ownerAmountAud,
      citations,
      note: row.note ?? null,
    });
    if (item) out.push(item);
  }

  const rank = new Map(SCOPE_ITEMS.map((i, n) => [i.id, n]));
  out.sort(
    (a, b) => (rank.get(a.itemId) ?? 9999) - (rank.get(b.itemId) ?? 9999),
  );

  return { runId: run.id, standardVersion: run.scopeVersion, items: out };
}

// ── list-surface phase + the desk's bulk verdict ────────────────────────

export type ProjectScopePhase = "analysing" | "pack_ready";

/**
 * The scope phase of many projects in one query, for list surfaces:
 * "analysing" while the pipeline or the ops desk holds the pack,
 * "pack_ready" once it awaits the runner's answers. Projects with no
 * live preparation are simply absent from the map.
 */
export async function scopePhaseForProjects(
  projectIds: string[],
): Promise<Map<string, ProjectScopePhase>> {
  if (projectIds.length === 0) return new Map();
  const rows = await db
    .select({
      projectId: scopeRuns.projectId,
      status: scopeRuns.status,
      effectiveAt: scopeRuns.effectiveAt,
      createdAt: scopeRuns.createdAt,
    })
    .from(scopeRuns)
    .where(
      and(
        inArray(scopeRuns.projectId, projectIds),
        inArray(scopeRuns.status, [
          "pending",
          "classifying",
          "extracting",
          "synthesising",
          "review",
          "approved",
        ]),
      ),
    )
    .orderBy(desc(scopeRuns.createdAt));
  const out = new Map<string, ProjectScopePhase>();
  for (const r of rows) {
    if (out.has(r.projectId)) continue; // newest run wins
    if (r.status === "approved" && !r.effectiveAt) {
      out.set(r.projectId, "pack_ready");
    } else if (r.status !== "approved") {
      out.set(r.projectId, "analysing");
    }
    // approved + effective = the round's live pack; the project's own
    // status tells that story, so no phase chip.
  }
  return out;
}

/**
 * The desk's sweep: confirm every line still awaiting a verdict. One
 * review event records the sweep with its count — a bulk confirm is a
 * weaker label than a considered one, and the training data should
 * say so honestly.
 */
export async function bulkConfirmPending(
  actorId: string,
  runId: string,
): Promise<Result<{ confirmed: number }>> {
  const [run] = await db
    .select({ id: scopeRuns.id, status: scopeRuns.status })
    .from(scopeRuns)
    .where(eq(scopeRuns.id, runId))
    .limit(1);
  if (!run) return fail("not_found", "Run not found.");
  if (run.status !== "review") {
    return fail("conflict", "Only runs in review can be swept.");
  }
  // The sweep never launders doubt: an evidenced line below the
  // confidence floor stays pending until a person looks at it, and
  // approval stays blocked until they do.
  const updated = await db
    .update(scopeRunItems)
    .set({ opsStatus: "confirmed", editedBy: actorId, editedAt: new Date() })
    .where(
      and(
        eq(scopeRunItems.runId, runId),
        eq(scopeRunItems.opsStatus, "pending"),
        ne(scopeRunItems.status, "not_expected"),
        or(
          ne(scopeRunItems.status, "evidenced"),
          // Both sides cast to real so the boundary resolves the same
          // way here, in the desk badge, and in any ad-hoc query: a
          // line AT the floor sweeps; strictly below it waits.
          sql`coalesce(${scopeRunItems.confidence}, 0)::real >= ${SCOPE_CONFIDENCE_FLOOR}::real`,
        ),
      ),
    )
    .returning({ id: scopeRunItems.id });
  await recordReview(runId, "run", "run.bulk_confirmed", actorId, null, {
    confirmed: updated.length,
  });
  logger.info(
    { event: "scope.run.bulk_confirmed", runId, actorId, confirmed: updated.length },
    "remaining verdicts bulk-confirmed",
  );
  return ok({ confirmed: updated.length });
}

/**
 * The one-act sweep of the review desk's counterpart: every question
 * still open goes to the builders to price — the ordinary answer in
 * ordinary tendering. One insert, one audit line, nothing overwritten:
 * answers the runner already gave stand untouched.
 */
export async function bulkResolveOpen(
  runnerId: string,
  projectId: string,
): Promise<Result<{ resolved: number }>> {
  const access = await getProjectAccess(projectId, runnerId);
  if (access?.kind !== "runner") {
    return fail("forbidden", "Only the project runner resolves the scope.");
  }
  const [run] = await db
    .select({ id: scopeRuns.id, effectiveAt: scopeRuns.effectiveAt })
    .from(scopeRuns)
    .where(and(eq(scopeRuns.projectId, projectId), eq(scopeRuns.status, "approved")))
    .orderBy(desc(scopeRuns.createdAt))
    .limit(1);
  if (!run) return fail("conflict", "No approved tender pack to resolve against.");
  if (run.effectiveAt) {
    return fail(
      "conflict",
      "This pack is already live for the round. Add documents and request a re-read to change it.",
    );
  }

  const result = await db.execute(sql`
    insert into scope_gap_resolutions (run_id, item_id, resolution, created_by)
    select i.run_id, i.item_id, 'builder_priced', ${runnerId}
    from scope_run_items i
    where i.run_id = ${run.id}
      and i.status = 'gap'
      and i.ops_status <> 'removed'
      and not exists (
        select 1 from scope_gap_resolutions r
        where r.run_id = i.run_id and r.item_id = i.item_id
      )
    returning id
  `);
  const resolved = Array.isArray(result)
    ? result.length
    : (result.rows?.length ?? 0);

  if (resolved > 0) {
    await recordProjectEvent({
      projectId,
      actorId: runnerId,
      kind: "scope.gap_resolved",
      subjectId: run.id,
      summary: `Left ${resolved} open line${resolved === 1 ? "" : "s"} to the builders to price.`,
    });
  }
  return ok({ resolved });
}
