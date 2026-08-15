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
import { and, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";

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
  coveredSelectionPackages,
  selectionPackageKey,
  resolveRegisterNames,
} from "@/modules/scope";
import { isExtractionEnabled } from "@/modules/extraction/client";
import { SCOPE_CONFIDENCE_FLOOR } from "./floor";
import {
  enforceCitationConsistency,
  enforceConflictIntegrity,
  enforceSourceAuthority,
  enforceNoteGrounding,
  isPreliminaryDocument,
  residualPool,
  foldResiduals,
  coverageReport,
  dedupeRegister,
  baselineFindings,
  namedMissingDocuments,
  captureHygiene,
  packReadiness,
  type NamedMissingRef,
  type PackReadiness,
} from "./analysis";
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
  scopeRunCaptures,
  scopeVocabExtensions,
  scopeReviewEvents,
  type ScopeRunRow,
  type ScopeRunDocumentRow,
  type ScopeRunItemRow,
  type ScopeRunConflictRow,
  type ScopeRunCaptureRow,
  type ScopeVocabExtensionRow,
} from "./schema";
import {
  classifyDocument,
  recoverDocFacts,
  extractDocument,
  synthesiseRun,
  classifyResidualItems,
  estimateCostUsd,
  MAX_PDF_BYTES,
  SCOPE_PIPELINE_VERSION,
  type DocumentFindings,
  type ExtensionItem,
  type StageUsage,
  type SynthesisDocumentInput,
  type SynthesisOverview,
} from "./pipeline";

type ScopeProjectType =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension";

/** More PDFs than any real residential pack carries — a run this size
 *  is a mistake (bulk upload, duplicates) and must not start unseen. */
export const MAX_RUN_DOCUMENTS = 30;

/** Extraction page budget per run. A genuine pack sits far below it;
 *  over it, the run stops BEFORE the spend and ops decides. */
export const MAX_RUN_PAGES = 800;

/**
 * What each stage refuses to start below.
 *
 * These are floors, not estimates: a stage returns `moreWork: true`
 * rather than begin work it cannot finish inside the invocation. That
 * makes them SUCCESS returns, which is why a budget too small to clear
 * them fails silently — the caller sees ok, logs nothing, and the run
 * never moves. It is exactly how the production queue sat frozen while
 * every dev script (which passes 240_000) worked perfectly.
 */
const STAGE_FLOOR = {
  classify: 30_000,
  extract: 60_000,
  synthesise: 90_000,
} as const;

/**
 * The smallest budget that can carry a run through EVERY stage. Any
 * caller handing a tick less than this can, at best, classify.
 */
export const MIN_TICK_BUDGET_MS = STAGE_FLOOR.synthesise + 10_000;

/**
 * What real callers pass. Both the cron route and the admin desk run on
 * functions declared `maxDuration = 300`, so this leaves the platform
 * twenty seconds of headroom to return cleanly.
 */
export const TICK_BUDGET_MS = 280_000;

/**
 * How long one tick owns a run.
 *
 * MUST exceed TICK_BUDGET_MS, or a lease can expire while its own tick
 * is still working and a second tick will start the same stage. The
 * margin is the platform's shutdown grace.
 *
 * This exists because raising the tick budget to 280s made ticks longer
 * than the cron's own minute, so four or five invocations worked the
 * same run at once: each synthesised independently, each wrote its own
 * item set, and each emailed ops that the pack was ready. Four emails,
 * four different counts.
 */
export const LEASE_MS = TICK_BUDGET_MS + 40_000;

/** The shape stored beside extraction findings so later runs can
 *  prove the work is reusable: same pipeline version, same bytes. */
interface FindingsMeta {
  v: number;
  objectKey: string;
  salvaged?: number;
}

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
    .select({
      id: documents.id,
      contentType: documents.contentType,
      objectKey: documents.objectKey,
    })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        sql`${documents.tenderId} is null`,
        eq(documents.status, "active"),
        sql`${documents.deletedAt} is null`,
      ),
    );
  const pdfs = docs.filter((d) => d.contentType.toLowerCase().includes("pdf"));
  const pdfIds = pdfs.map((d) => d.id);
  if (pdfIds.length === 0) {
    return fail("validation", "This project has no active PDF documents to read.");
  }
  if (pdfIds.length > MAX_RUN_DOCUMENTS) {
    return fail(
      "validation",
      `This project has ${pdfIds.length} active PDFs; a run reads at most ${MAX_RUN_DOCUMENTS}. Remove duplicates or merge sets, then start again.`,
    );
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

  // ── extraction reuse ──────────────────────────────────────────────
  // Documents are immutable by id (a re-upload mints a new row), so a
  // prior run's extraction of the same document is the same work. An
  // addendum re-read of a 12-document pack used to pay the full
  // extraction bill again for one changed drawing; now unchanged
  // documents carry their findings forward and only new work is
  // bought. Reuse demands an exact match on pipeline version AND
  // objectKey — a prompt change or replaced bytes re-extracts.
  const keyByDoc = new Map(pdfs.map((d) => [d.id, d.objectKey]));
  const prior = await db
    .select({ doc: scopeRunDocuments })
    .from(scopeRunDocuments)
    .innerJoin(scopeRuns, eq(scopeRuns.id, scopeRunDocuments.runId))
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        ne(scopeRuns.id, run.id),
        inArray(scopeRunDocuments.documentId, pdfIds),
        eq(scopeRunDocuments.status, "extracted"),
      ),
    )
    .orderBy(desc(scopeRunDocuments.updatedAt));
  let reused = 0;
  const satisfied = new Set<string>();
  for (const { doc } of prior) {
    if (satisfied.has(doc.documentId)) continue;
    const findings = doc.findings as
      | ({ pages?: unknown[] } & { meta?: FindingsMeta })
      | null;
    const meta = findings?.meta;
    if (
      !meta ||
      meta.v !== SCOPE_PIPELINE_VERSION ||
      meta.objectKey !== keyByDoc.get(doc.documentId) ||
      !Array.isArray(findings?.pages)
    ) {
      continue;
    }
    await db
      .update(scopeRunDocuments)
      .set({
        status: "extracted",
        kind: doc.kind,
        revision: doc.revision,
        docTitle: doc.docTitle,
        pageCount: doc.pageCount,
        // Classification is skipped for a reused document, so every
        // classification-read fact must carry with the extraction.
        issueDate: doc.issueDate,
        clientName: doc.clientName,
        siteClass: doc.siteClass,
        energyStars: doc.energyStars,
        findings: doc.findings,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scopeRunDocuments.runId, run.id),
          eq(scopeRunDocuments.documentId, doc.documentId),
        ),
      );
    satisfied.add(doc.documentId);
    reused += 1;
  }
  if (reused > 0) {
    await db
      .update(scopeRuns)
      .set({
        usage: { analysis: { reusedExtractions: reused } },
        updatedAt: new Date(),
      })
      .where(eq(scopeRuns.id, run.id));
  }

  logger.info(
    {
      event: "scope.run.started",
      runId: run.id,
      projectId,
      documents: pdfIds.length,
      reusedExtractions: reused,
    },
    "scope extraction run started",
  );
  return ok(run);
}

// ── the tick ────────────────────────────────────────────────────────────

async function loadDocBytes(documentId: string): Promise<{
  bytes: Uint8Array;
  filename: string;
  objectKey: string;
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
  return { bytes, filename: doc.filename, objectKey: doc.objectKey };
}

/** The living vocabulary, loaded once per tick and threaded through
 *  every pipeline call so the digest, the validators and the capture
 *  matcher all speak the same learned language. */
async function loadVocabExtensions(projectType: string): Promise<{
  all: ExtensionItem[];
  rows: ScopeVocabExtensionRow[];
  coreIds: string[];
  plainById: Map<string, string>;
  labelById: Map<string, string>;
}> {
  const rows = await db
    .select()
    .from(scopeVocabExtensions)
    .where(ne(scopeVocabExtensions.status, "retired"));
  const isCore = (r: ScopeVocabExtensionRow) =>
    r.status === "core" &&
    Array.isArray(r.appliesTo) &&
    (r.appliesTo as string[]).includes(projectType);
  const all: ExtensionItem[] = rows.map((r) => ({
    id: r.key,
    label: r.label,
    division: r.divisionId,
    plain: r.plain,
    aliases: Array.isArray(r.aliases) ? (r.aliases as string[]) : [],
    core: isCore(r),
  }));
  return {
    all,
    rows,
    coreIds: rows.filter(isCore).map((r) => r.key),
    plainById: new Map(
      rows.filter((r) => r.plain).map((r) => [r.key, r.plain!]),
    ),
    labelById: new Map(rows.map((r) => [r.key, r.label])),
  };
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

  // Claim the run before touching it. One statement, so concurrent
  // ticks cannot both win: Postgres serialises the row, and the loser
  // re-evaluates the predicate against the winner's committed row.
  //
  //   · a `pending` run is claimed by advancing it to `classifying`,
  //     which is what makes the first claim single-winner;
  //   · a run already in flight is claimed only once its lease has
  //     expired, which is how a crashed tick self-heals;
  //   · a terminal run matches nothing and is left alone.
  const claimed = await db
    .update(scopeRuns)
    .set({
      status: sql`case when ${scopeRuns.status} = 'pending' then 'classifying' else ${scopeRuns.status} end`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scopeRuns.id, runId),
        inArray(scopeRuns.status, ["pending", "classifying", "extracting", "synthesising"]),
        or(
          eq(scopeRuns.status, "pending"),
          lt(scopeRuns.updatedAt, new Date(Date.now() - LEASE_MS)),
        ),
      ),
    )
    .returning({ id: scopeRuns.id });
  if (claimed.length === 0) {
    // Either another tick holds the lease, or the run is already done.
    const [current] = await db
      .select({ status: scopeRuns.status })
      .from(scopeRuns)
      .where(eq(scopeRuns.id, runId))
      .limit(1);
    if (!current) return fail("not_found", "Run not found.");
    return ok({ status: current.status, moreWork: false });
  }

  const [run] = await db
    .select()
    .from(scopeRuns)
    .where(eq(scopeRuns.id, runId))
    .limit(1);
  if (!run) return fail("not_found", "Run not found.");
  // A budget under the floor cannot advance past classification, and
  // says so cheerfully. Shout, so it can never rot quietly again.
  if (budgetMs < MIN_TICK_BUDGET_MS) {
    logger.error(
      { event: "scope.tick.budget_too_small", runId, budgetMs, needed: MIN_TICK_BUDGET_MS },
      "tick budget is below the synthesis floor — this run cannot finish",
    );
  }
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

  // The living vocabulary, once per tick: digest, validators and the
  // capture matcher all see the same learned items, with core tier
  // resolved against this project's type.
  const vocab = await loadVocabExtensions(projectType);

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
        if (timeLeft() < STAGE_FLOOR.classify) return ok({ status: "classifying", moreWork: true });
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
      // The page budget, checked BEFORE the spend: extraction is the
      // expensive stage, and a run carrying a freak page count (bulk
      // scans, wrong uploads) must stop while stopping is still free.
      // Reused extractions are already paid for and sit outside it.
      const [budget] = await db
        .select({
          pages: sql<number>`coalesce(sum(${scopeRunDocuments.pageCount}), 0)`.mapWith(Number),
        })
        .from(scopeRunDocuments)
        .where(
          and(
            eq(scopeRunDocuments.runId, runId),
            eq(scopeRunDocuments.status, "classified"),
          ),
        );
      if ((budget?.pages ?? 0) > MAX_RUN_PAGES) {
        await db
          .update(scopeRuns)
          .set({
            status: "failed",
            error: `This pack carries ${budget?.pages} pages to extract; the run budget is ${MAX_RUN_PAGES}. Remove or merge documents on the project, then start a fresh run.`,
            usage,
            updatedAt: new Date(),
          })
          .where(eq(scopeRuns.id, runId));
        await dispatchScopeRunOps(runId, "failed").catch(() => undefined);
        return ok({ status: "failed", moreWork: false });
      }
      for (;;) {
        if (timeLeft() < STAGE_FLOOR.extract) return ok({ status: "extracting", moreWork: true });
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
        await extractOne(next, projectType, vocab.all, usage, (u) => (usage = u));
      }
    }

    // Stage 3 — synthesis over everything extracted.
    if (timeLeft() < STAGE_FLOOR.synthesise) return ok({ status: "extracting", moreWork: true });
    await bump("synthesising");

    const docRows = await db
      .select({
        row: scopeRunDocuments,
        filename: documents.filename,
      })
      .from(scopeRunDocuments)
      .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, runId));
    // Register hygiene: the same document uploaded twice must not read
    // as twice the evidence.
    const deduped = dedupeRegister(
      docRows
        .filter((d) => d.row.status === "extracted" && d.row.findings)
        .map((d) => ({
          documentId: d.row.documentId,
          kind: d.row.kind,
          docTitle: d.row.docTitle,
          pageCount: d.row.pageCount,
          d,
        })),
    );
    if (deduped.duplicates.length > 0) {
      logger.warn(
        {
          event: "scope.synthesis.register_deduped",
          runId,
          duplicates: deduped.duplicates.map((x) => x.documentId),
        },
        "duplicate register rows excluded from synthesis",
      );
    }
    const extracted: SynthesisDocumentInput[] = deduped.keep.map(({ d }) => ({
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

    const {
      synthesis,
      usage: synthUsage,
      salvaged: synthesisSalvaged,
    } = await synthesiseRun({
      projectType,
      documents: extracted,
      extensions: vocab.all,
    });
    usage = addUsage(usage, "synthesis", synthUsage);

    // ── the deterministic half of accuracy ──────────────────────────
    // Capture hygiene runs FIRST so auto-mapped repeat discoveries
    // join the selection BEFORE the guards: an auto-mapped line obeys
    // the citation law, the material-authority law and note locality
    // exactly like a model-evidenced one. Dedup by extension key —
    // two captures matching one learned item are one line.
    const hygiene = captureHygiene(synthesis.captures, vocab.all);
    if (hygiene.mappedAway.length > 0) {
      logger.warn(
        {
          event: "scope.captures.mapped_away",
          runId,
          mapped: hygiene.mappedAway.slice(0, 10),
        },
        "captures matching existing Standard items dropped",
      );
    }
    const synthesisedIds = new Set(synthesis.items.map((i) => i.itemId));
    const autoByExt = new Map<string, (typeof hygiene.autoMapped)[number]>();
    for (const m of hygiene.autoMapped) {
      if (synthesisedIds.has(m.extensionId)) continue;
      const prior = autoByExt.get(m.extensionId);
      if (prior) {
        // Same learned work seen twice: one line, merged citations.
        prior.capture.citations = [
          ...prior.capture.citations,
          ...m.capture.citations,
        ].slice(0, 10);
      } else {
        autoByExt.set(m.extensionId, {
          ...m,
          capture: { ...m.capture, citations: [...m.capture.citations] },
        });
      }
    }
    const autoMappedCandidates = [...autoByExt.values()].map(
      ({ capture, extensionId }) => ({
        itemId: extensionId,
        status: "evidenced" as const,
        citations: capture.citations,
        note: capture.note,
        depth: null,
        remaining: null,
        confidence: capture.confidence,
      }),
    );

    // Citations checked against the extract stage's own findings;
    // demoted items rejoin the residual pool. Conflicts obey the same
    // law: a fabricated page drops the citation, an uncited conflict
    // drops entirely.
    const enforced = enforceCitationConsistency(
      [...synthesis.items, ...autoMappedCandidates],
      extracted,
    );
    // The drawn documents govern materials: report-only material
    // claims demote to the residual pool, and preliminary-only
    // sources grade partial with the reason stated.
    const prelimDocIds = new Set(
      docRows
        .filter((d) => isPreliminaryDocument(d.row.revision, d.row.docTitle))
        .map((d) => d.row.documentId),
    );
    const authority = enforceSourceAuthority(
      enforced.items,
      docRows.map((d) => ({
        documentId: d.row.documentId,
        kind: d.row.kind,
      })),
      prelimDocIds,
    );
    // Notes are local to their citations: an imported term (the
    // bluestone class) drops the line below the ops floor and tells
    // the reviewer which word to check.
    const grounding = enforceNoteGrounding(authority.items, extracted);
    if (authority.demoted.length > 0 || grounding.flagged.length > 0) {
      logger.warn(
        {
          event: "scope.synthesis.authority_grounding",
          runId,
          authorityDemoted: authority.demoted.slice(0, 10),
          noteImports: grounding.flagged.slice(0, 10),
        },
        "material claims demoted to the drawn documents' silence; imported note terms flagged",
      );
    }
    const conflictsEnforced = enforceConflictIntegrity(
      synthesis.conflicts,
      extracted,
    );
    // The complement is arithmetic: every relevant item the synthesis
    // did not account for goes to the closed-choice classifier. A
    // synthesis can no longer forget to sweep for gaps. Grounded
    // items are the post-guard truth: authority demotions rejoin the
    // pool here and get judged on the DRAWN documents' silence.
    // Auto-mapped candidates have now passed every guard alongside
    // the model's own items; the belt on the unique index is a final
    // dedupe by id before anything persists.
    const seenIds = new Set<string>();
    const selectedItems = grounding.items.filter((i) => {
      if (seenIds.has(i.itemId)) return false;
      seenIds.add(i.itemId);
      return true;
    });

    // Promoted lines carry forward BEFORE the complement runs: a
    // promotion is a project decision a re-read must not silently
    // un-make, and a carried core line must count as accounted so
    // the residual pool cannot mint a duplicate gap for it.
    const [priorApproved] = await db
      .select({ id: scopeRuns.id })
      .from(scopeRuns)
      .where(
        and(
          eq(scopeRuns.projectId, run.projectId),
          eq(scopeRuns.status, "approved"),
          ne(scopeRuns.id, runId),
        ),
      )
      .orderBy(desc(scopeRuns.createdAt))
      .limit(1);
    const carriedCustom: Array<{
      itemId: string;
      status: string;
      citations: unknown;
      note: string | null;
      label: string | null;
      confidence: number | null;
    }> = [];
    if (priorApproved) {
      const priorCustom = await db
        .select()
        .from(scopeRunItems)
        .where(
          and(
            eq(scopeRunItems.runId, priorApproved.id),
            or(
              sql`${scopeRunItems.itemId} like 'custom.%'`,
              sql`${scopeRunItems.itemId} like 'ext.%'`,
            ),
            ne(scopeRunItems.opsStatus, "removed"),
          ),
        );
      const freshIds = new Set(selectedItems.map((i) => i.itemId));
      for (const c of priorCustom) {
        if (freshIds.has(c.itemId)) continue;
        carriedCustom.push({
          itemId: c.itemId,
          status: c.status,
          citations: c.citations,
          note: c.note,
          label: c.label,
          confidence: c.confidence,
        });
      }
    }

    // Core-tier learned items join the expected pool: their absence
    // is judged like any authored item's from promotion on.
    const coreExtIds = vocab.coreIds;
    const residual = residualPool(
      projectType,
      [...selectedItems, ...carriedCustom.map((c) => ({ itemId: c.itemId }))],
      coreExtIds,
    );
    let residualVerdicts = new Map<
      string,
      { verdict: "gap" | "not_expected"; note: string | null }
    >();
    if (residual.length > 0) {
      await bump("synthesising");
      const evidencedIds = grounding.items
        .filter((i) => i.status === "evidenced")
        .map((i) => i.itemId);
      const { verdicts, usage: residualUsage } = await classifyResidualItems({
        projectType,
        overviewSummary: synthesis.overview?.summary ?? null,
        registerKinds: [
          ...new Set(extracted.map((d) => d.kind).filter(Boolean)),
        ],
        evidencedIds,
        residualIds: residual,
        extensions: vocab.all,
      });
      residualVerdicts = verdicts;
      usage = addUsage(usage, "residual", residualUsage);
    }

    const finalItems = [
      ...selectedItems,
      ...foldResiduals(residual, residualVerdicts, vocab.plainById),
    ];

    // The deterministic baseline check: dates and title-block names
    // cross-examined in code. Findings land beside the model's
    // conflicts, marked by source so the desk can tell judgement
    // from arithmetic.
    const baseline = baselineFindings(
      docRows.map((d) => ({
        documentId: d.row.documentId,
        kind: d.row.kind,
        docTitle: d.row.docTitle,
        revision: d.row.revision,
        issueDate: d.row.issueDate,
        clientName: d.row.clientName,
      })),
    );
    // The invariant this rework exists for, checked every run.
    const coverage = coverageReport(projectType, finalItems, {
      corePoolExtensionIds: coreExtIds,
      knownExtensionIds: vocab.all.map((e) => e.id),
    });
    if (coverage.missing.length > 0 || coverage.strays.length > 0) {
      logger.warn(
        {
          event: "scope.synthesis.coverage_gap",
          runId,
          missing: coverage.missing.slice(0, 10),
          strays: coverage.strays.slice(0, 10),
        },
        "synthesis coverage invariant violated",
      );
    }
    // Counters seeded at startRun (extraction reuse) merge with the
    // tick's own; per-document salvage sums off the stored meta.
    const seededAnalysis =
      (usage as Record<string, unknown>).analysis &&
      typeof (usage as Record<string, unknown>).analysis === "object"
        ? ((usage as Record<string, unknown>).analysis as Record<string, number>)
        : {};
    const extractSalvaged = docRows.reduce((n, d) => {
      const meta = (d.row.findings as { meta?: { salvaged?: number } } | null)
        ?.meta;
      return n + (meta?.salvaged ?? 0);
    }, 0);
    // The capture funnel's top: how much off-standard work extraction
    // saw, so a quiet capture list can be told apart from a quiet
    // extraction.
    const offStandardSeen = docRows.reduce((n, d) => {
      const pages = (d.row.findings as DocumentFindings | null)?.pages ?? [];
      return n + pages.reduce((m, p) => m + (p.offStandard?.length ?? 0), 0);
    }, 0);
    const analysis = {
      ...seededAnalysis,
      citationHardDropped: enforced.hardDropped,
      citationSoftFlagged: enforced.softFlagged,
      demotedToResidual: enforced.demoted.length,
      authorityDemoted: authority.demoted.length,
      authorityStripped: authority.strippedCitations,
      prelimOnlySources: authority.prelimOnly.length,
      noteImportsFlagged: grounding.flagged.length,
      conflictCitationsDropped: conflictsEnforced.droppedCitations,
      conflictsDropped: conflictsEnforced.droppedConflicts,
      schemaSalvaged: extractSalvaged + synthesisSalvaged,
      residualClassified: residualVerdicts.size,
      residualDefaulted: residual.length - residualVerdicts.size,
      registerDeduped: deduped.duplicates.length,
      offStandardSeen,
      capturesProposed: hygiene.kept.length,
      capturesMappedAway: hygiene.mappedAway.length,
      capturesAutoMapped: autoMappedCandidates.length,
      corePoolExtensions: coreExtIds.length,
      baselineFindings: baseline.length,
      customCarried: carriedCustom.length,
      poolSize: coverage.poolSize,
      covered: coverage.covered,
    };

    // Persist the selection — revisions denormalised onto citations so
    // every claim reads (document, page, revision) forever.
    const revisionByDoc = new Map(
      docRows.map((d) => [d.row.documentId, d.row.revision]),
    );
    await db.delete(scopeRunItems).where(eq(scopeRunItems.runId, runId));
    await db.delete(scopeRunConflicts).where(eq(scopeRunConflicts.runId, runId));
    await db.delete(scopeRunCaptures).where(eq(scopeRunCaptures.runId, runId));
    if (finalItems.length > 0) {
      await db.insert(scopeRunItems).values(
        finalItems.map((i) => ({
          runId,
          itemId: i.itemId,
          status: i.status,
          citations: i.citations.map((c) => ({
            documentId: c.documentId,
            page: c.page,
            revision: revisionByDoc.get(c.documentId) ?? null,
          })),
          note: i.note,
          // Learned items carry their label on the row: the authored
          // Standard cannot supply it, and clients render label-first.
          label: i.itemId.startsWith("ext.")
            ? vocab.labelById.get(i.itemId) ?? null
            : null,
          depth: i.depth,
          remaining: i.remaining,
          confidence: i.confidence,
        })),
      );
    }
    if (carriedCustom.length > 0) {
      await db.insert(scopeRunItems).values(
        carriedCustom.map((c) => ({
          runId,
          itemId: c.itemId,
          status: c.status,
          citations: c.citations as object[],
          note: c.note,
          label: c.label,
          confidence: c.confidence,
          opsStatus: "confirmed",
        })),
      );
    }
    if (hygiene.kept.length > 0) {
      await db.insert(scopeRunCaptures).values(
        hygiene.kept.map((c) => ({
          runId,
          label: c.label,
          divisionId: c.divisionId,
          citations: c.citations.map((x) => ({
            documentId: x.documentId,
            page: x.page,
            revision: revisionByDoc.get(x.documentId) ?? null,
          })),
          note: c.nearestItemId
            ? `${c.note ? `${c.note} · ` : ""}Nearest Standard item: ${
                getScopeItem(c.nearestItemId)?.label ?? c.nearestItemId
              }`
            : c.note,
          confidence: c.confidence,
        })),
      );
    }
    const conflictRows = [
      ...conflictsEnforced.conflicts.map((c) => ({
        runId,
        summary: c.summary,
        citations: c.citations.map((x) => ({
          documentId: x.documentId,
          page: x.page,
          revision: revisionByDoc.get(x.documentId) ?? null,
        })),
        severity: c.severity,
        source: "model",
      })),
      ...baseline.map((b) => ({
        runId,
        summary: b.summary,
        citations: b.citations.map((x) => ({
          documentId: x.documentId,
          page: x.page,
          revision: revisionByDoc.get(x.documentId) ?? null,
        })),
        severity: b.severity,
        source: "baseline",
      })),
    ];
    if (conflictRows.length > 0) {
      await db.insert(scopeRunConflicts).values(conflictRows);
    }

    const cost = estimateCostUsd(usage);
    // Conditional on purpose: only the tick that actually moves the run
    // INTO review may announce it. Belt and braces behind the lease —
    // an unconditional write here is what sent ops four "pack ready"
    // emails for one pack.
    const promoted = await db
      .update(scopeRuns)
      .set({
        status: "review",
        overview: synthesis.overview as object | null,
        usage: { ...usage, estimatedCostUsd: cost, analysis } as object,
        updatedAt: new Date(),
      })
      .where(and(eq(scopeRuns.id, runId), ne(scopeRuns.status, "review")))
      .returning({ id: scopeRuns.id });
    if (promoted.length === 0) {
      logger.warn(
        { event: "scope.run.review_already_announced", runId },
        "another tick reached review first — not re-announcing",
      );
      return ok({ status: "review", moreWork: false });
    }
    logger.info(
      {
        event: "scope.run.ready_for_review",
        runId,
        items: finalItems.length,
        analysis,
        conflicts: conflictsEnforced.conflicts.length,
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
  kind: "started" | "review" | "failed",
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

    let evidenced = 0;
    let gaps = 0;
    if (kind === "started") {
      // No items exist yet — the run has only just been born. The
      // heartbeat email carries the document count instead.
      const [docs] = await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(scopeRunDocuments)
        .where(eq(scopeRunDocuments.runId, runId));
      evidenced = docs?.n ?? 0;
    } else {
      const [tally] = await db
        .select({
          evidenced: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'evidenced')`.mapWith(Number),
          gaps: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'gap')`.mapWith(Number),
        })
        .from(scopeRunItems)
        .where(eq(scopeRunItems.runId, runId));
      evidenced = tally?.evidenced ?? 0;
      gaps = tally?.gaps ?? 0;
    }

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const usage = row.usage as { estimatedCostUsd?: number } | null;
    await sendScopeRunOpsEmail({
      kind,
      projectTitle: row.projectTitle,
      evidencedCount: evidenced,
      gapCount: gaps,
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
  if (budgetMs < MIN_TICK_BUDGET_MS) {
    logger.error(
      { event: "scope.queue.budget_too_small", budgetMs, needed: MIN_TICK_BUDGET_MS },
      "queue budget is below the synthesis floor — runs will not advance",
    );
  }

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
    // Stop before a slice too thin to clear the stage floors, rather
    // than burning the call on a run that will only bounce.
    if (timeLeft() < MIN_TICK_BUDGET_MS) break;
    const r = await processRunTick(run.id, timeLeft());
    if (!r.ok) {
      // A failed tick used to vanish here. It is the other half of why
      // a stuck queue looked healthy.
      logger.error(
        { event: "scope.queue.tick_failed", runId: run.id, error: r.error },
        "a run tick failed inside the queue",
      );
      continue;
    }
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
    // Accumulate through a local so the recovery add below builds on
    // this one instead of a stale snapshot.
    let acc = addUsage(usage, "classify", u);
    setUsage(acc);
    // The cover pages often stop short of a report's stated fact (a
    // geotech's AS 2870 class, an energy report's star rating). One
    // cheap deeper read recovers it; nulls that survive are honest.
    let siteClass = classification.siteClass;
    let energyStars = classification.energyStars;
    if (
      (classification.kind === "soil" && siteClass === null) ||
      (classification.kind === "energy" && energyStars === null)
    ) {
      try {
        const recovered = await recoverDocFacts({
          bytes: loaded.bytes,
          filename: loaded.filename,
          kind: classification.kind as "soil" | "energy",
        });
        acc = addUsage(acc, "classify", recovered.usage);
        setUsage(acc);
        siteClass = siteClass ?? recovered.siteClass;
        energyStars = energyStars ?? recovered.energyStars;
      } catch {
        // Recovery is best-effort; the confirm slide handles nulls.
      }
    }
    await db
      .update(scopeRunDocuments)
      .set({
        status: "classified",
        kind: classification.kind,
        revision: classification.revision,
        docTitle: classification.title,
        pageCount: classification.pageCount,
        issueDate: classification.issueDate,
        clientName: classification.clientName,
        siteClass,
        energyStars,
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
  extensions: ExtensionItem[],
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
    const { findings, usage: u, salvaged } = await extractDocument({
      bytes: loaded.bytes,
      filename: loaded.filename,
      kind: docRow.kind ?? "other",
      projectType,
      extensions,
    });
    setUsage(addUsage(usage, "extract", u));
    // The meta rides beside the pages: it is what proves, on a later
    // run, that this extraction covers the same bytes under the same
    // pipeline and can carry forward instead of being bought again.
    const meta: FindingsMeta = {
      v: SCOPE_PIPELINE_VERSION,
      objectKey: loaded.objectKey,
      ...(salvaged > 0 ? { salvaged } : {}),
    };
    await db
      .update(scopeRunDocuments)
      .set({
        status: "extracted",
        findings: { ...findings, meta } as object,
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
  captures: ScopeRunCaptureRow[];
  /** Documents the pack names that the pack does not contain. */
  namedMissing: NamedMissingRef[];
  /** The pack-level readiness call, derived from the counts above. */
  readiness: PackReadiness;
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

  const [register, items, conflicts, captures] = await Promise.all([
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
    db
      .select()
      .from(scopeRunCaptures)
      .where(eq(scopeRunCaptures.runId, runId)),
  ]);
  const namedMissing = namedMissingDocuments(
    register
      .filter((r) => r.doc.findings)
      .map((r) => ({
        documentId: r.doc.documentId,
        filename: r.filename,
        docTitle: r.doc.docTitle,
        kind: r.doc.kind,
        findings: r.doc.findings as DocumentFindings,
      })),
  );
  const readiness = packReadiness({
    items: items.map((i) => ({ status: i.status, depth: i.depth })),
    conflicts: conflicts
      .filter((c) => c.opsStatus !== "dismissed")
      .map((c) => ({ severity: c.severity })),
    namedMissingCount: namedMissing.length,
    registerKinds: [
      ...new Set(register.map((r) => r.doc.kind).filter((k): k is string => !!k)),
    ],
    projectType: row.projectType as ScopeProjectType,
  });
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
    captures,
    namedMissing,
    readiness,
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

/**
 * Promote an off-standard capture. Every promotion writes TWO things:
 * an evidenced line on this run, and an entry in the living
 * vocabulary — so the next project that shows the same work maps to
 * the SAME permanent key ("ext.<division>.<slug>") automatically,
 * with no ops click and full cross-project comparability.
 *
 * tier "extension" (the default door): in the list, evidenced when
 * shown, never a gap. tier "core": joins the expected pool for this
 * project's type — from now on its absence is judged like any
 * authored item's.
 */
export async function promoteCapture(
  actorId: string,
  captureId: string,
  tier: "extension" | "core" = "extension",
): Promise<Result<ScopeRunItemRow>> {
  const [capture] = await db
    .select()
    .from(scopeRunCaptures)
    .where(eq(scopeRunCaptures.id, captureId))
    .limit(1);
  if (!capture) return fail("not_found", "Capture not found.");
  if (capture.opsStatus !== "pending") {
    return fail("conflict", "This capture has already been decided.");
  }
  const [runRow] = await db
    .select({ projectId: scopeRuns.projectId })
    .from(scopeRuns)
    .where(eq(scopeRuns.id, capture.runId))
    .limit(1);
  const [proj] = runRow
    ? await db
        .select({ type: projects.type })
        .from(projects)
        .where(eq(projects.id, runRow.projectId))
        .limit(1)
    : [];

  // Work the authored Standard already names must not be canonised
  // twice: the promote door refuses and points at the real item.
  const standardCheck = captureHygiene(
    [
      {
        label: capture.label,
        divisionId: capture.divisionId,
        citations: [],
        note: capture.note,
        confidence: capture.confidence ?? 0.5,
      },
    ],
    [],
  );
  if (standardCheck.mappedAway.length > 0) {
    const matched = getScopeItem(standardCheck.mappedAway[0]!.matchedItemId);
    return fail(
      "conflict",
      `The Standard already names this work as "${matched?.label ?? standardCheck.mappedAway[0]!.matchedItemId}". Add that item to the run instead.`,
    );
  }

  const division = capture.divisionId ?? "external-works";
  const slug =
    capture.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "line";

  // Resolve the key BEFORE any write: reuse when the label matches an
  // existing entry (same work, permanent key); suffix when two
  // genuinely different works collide on a slug; refuse only when the
  // same work is already a line on this run.
  const runItemTaken = async (candidate: string) => {
    const [taken] = await db
      .select({ id: scopeRunItems.id })
      .from(scopeRunItems)
      .where(
        and(
          eq(scopeRunItems.runId, capture.runId),
          eq(scopeRunItems.itemId, candidate),
        ),
      )
      .limit(1);
    return Boolean(taken);
  };
  let key = `ext.${division}.${slug}`;
  let existing: ScopeVocabExtensionRow | undefined;
  for (const suffix of ["", "-2", "-3"]) {
    const candidate = `ext.${division}.${slug}${suffix}`;
    const [row] = await db
      .select()
      .from(scopeVocabExtensions)
      .where(eq(scopeVocabExtensions.key, candidate))
      .limit(1);
    if (!row) {
      key = candidate;
      existing = undefined;
      break;
    }
    const sameWork =
      row.label.trim().toLowerCase() === capture.label.trim().toLowerCase();
    if (sameWork) {
      key = candidate;
      existing = row;
      break;
    }
    // Different work colliding on the slug — try the next suffix.
    key = candidate;
    existing = row;
  }
  if (existing && existing.label.trim().toLowerCase() !== capture.label.trim().toLowerCase()) {
    return fail(
      "conflict",
      "Too many different works share this name. Rename the capture's work via Edit before promoting.",
    );
  }
  if (await runItemTaken(key)) {
    return fail("conflict", "This work is already a line on the run.");
  }

  // Only now, with every check passed, touch the vocabulary.
  if (!existing) {
    await db.insert(scopeVocabExtensions).values({
      key,
      divisionId: division,
      label: capture.label,
      plain: capture.note,
      aliases: [],
      status: tier,
      appliesTo: tier === "core" && proj?.type ? [proj.type] : [],
      sourceCaptureId: capture.id,
      createdBy: actorId,
    });
  } else {
    const appliesTo = new Set(
      Array.isArray(existing.appliesTo) ? (existing.appliesTo as string[]) : [],
    );
    if (tier === "core" && proj?.type) appliesTo.add(proj.type);
    const wantsUpdate =
      existing.status === "retired" ||
      (tier === "core" &&
        (existing.status !== "core" ||
          appliesTo.size !==
            (Array.isArray(existing.appliesTo)
              ? (existing.appliesTo as string[]).length
              : 0)));
    if (wantsUpdate) {
      await db
        .update(scopeVocabExtensions)
        .set({
          status: tier === "core" ? "core" : existing.status === "retired" ? "extension" : existing.status,
          appliesTo: [...appliesTo],
          updatedAt: new Date(),
        })
        .where(eq(scopeVocabExtensions.id, existing.id));
    }
  }
  const [row] = await db
    .insert(scopeRunItems)
    .values({
      runId: capture.runId,
      itemId: key,
      status: "evidenced",
      citations: capture.citations as object[],
      note: capture.note,
      label: capture.label,
      confidence: capture.confidence,
      opsStatus: "added",
      editedBy: actorId,
      editedAt: new Date(),
    })
    .returning();
  if (!row) return fail("internal", "Could not promote the capture.");
  await db
    .update(scopeRunCaptures)
    .set({ opsStatus: "promoted", promotedItemId: key, updatedAt: new Date() })
    .where(eq(scopeRunCaptures.id, captureId));
  await recordReview(capture.runId, key, "capture.promoted", actorId, null, {
    label: capture.label,
    divisionId: capture.divisionId,
    tier,
  });
  return ok(row);
}

/** Dismiss a capture: not real work, or not worth a line. The verdict
 *  is still a label — dismissals teach the capture lane restraint. */
export async function dismissCapture(
  actorId: string,
  captureId: string,
): Promise<Result<{ ok: true }>> {
  const [capture] = await db
    .select()
    .from(scopeRunCaptures)
    .where(eq(scopeRunCaptures.id, captureId))
    .limit(1);
  if (!capture) return fail("not_found", "Capture not found.");
  if (capture.opsStatus !== "pending") {
    return fail("conflict", "This capture has already been decided.");
  }
  await db
    .update(scopeRunCaptures)
    .set({ opsStatus: "dismissed", updatedAt: new Date() })
    .where(eq(scopeRunCaptures.id, captureId));
  await recordReview(capture.runId, capture.label, "capture.dismissed", actorId, null, null);
  return ok({ ok: true });
}

/**
 * The effective pack's unresolved conflicts, for the people the pack
 * belongs to. Ops sees every conflict on the desk; what leaves the
 * desk unresolved must not vanish — the owner and every builder
 * pricing the pack read the same three lines the documents disagree
 * on. Resolved and dismissed conflicts stay ops-only history.
 */
export async function listOpenConflictsForProject(
  projectId: string,
): Promise<
  Array<{ id: string; summary: string; severity: string }>
> {
  const [run] = await db
    .select({ id: scopeRuns.id })
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
  if (!run) return [];
  return db
    .select({
      id: scopeRunConflicts.id,
      summary: scopeRunConflicts.summary,
      severity: scopeRunConflicts.severity,
    })
    .from(scopeRunConflicts)
    .where(
      and(
        eq(scopeRunConflicts.runId, run.id),
        eq(scopeRunConflicts.opsStatus, "pending"),
      ),
    )
    .orderBy(scopeRunConflicts.createdAt);
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
 * builder-priced. Two rules, both pure: isOwnerAskableGap (structure,
 * services, preliminaries are the builders' ordinary work), and
 * coveredSelectionPackages (a provisional sum is never asked for work
 * the register already documents — an appliance schedule on file
 * means the builders price the appliances from it). Anything already
 * resolved (carried forward, or answered by hand on the desk's watch)
 * is left untouched.
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
  const register = await db
    .select({
      kind: scopeRunDocuments.kind,
      docTitle: scopeRunDocuments.docTitle,
      filename: documents.filename,
    })
    .from(scopeRunDocuments)
    .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
    .where(eq(scopeRunDocuments.runId, runId));
  const covered = coveredSelectionPackages(
    register.map((r) => ({
      kind: r.kind,
      title: r.docTitle,
      filename: r.filename,
    })),
  );
  const builderWork = gaps
    .map((g) => g.itemId)
    .filter((id) => {
      if (!isOwnerAskableGap(id)) return true;
      const pkg = selectionPackageKey(id);
      return pkg !== null && covered.has(pkg);
    });
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
 * For a set of projects, whether the latest run is still being read
 * or sits approved awaiting the runner's review. Dashboard-weight:
 * one query, newest run wins per project. Projects without a run
 * simply have no entry.
 */
export async function packPhaseForProjects(
  projectIds: string[],
): Promise<Record<string, "analysing" | "review">> {
  if (projectIds.length === 0) return {};
  const runs = await db
    .select({
      projectId: scopeRuns.projectId,
      status: scopeRuns.status,
    })
    .from(scopeRuns)
    .where(inArray(scopeRuns.projectId, projectIds))
    .orderBy(desc(scopeRuns.createdAt));
  const out: Record<string, "analysing" | "review"> = {};
  for (const r of runs) {
    if (out[r.projectId]) continue; // newest run wins
    out[r.projectId] = r.status === "approved" ? "review" : "analysing";
  }
  return out;
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

/* ── the model report ───────────────────────────────────────────────── */

export interface ModelReport {
  runs: Array<{
    runId: string;
    projectSlug: string | null;
    status: string;
    createdAtISO: string;
    items: number;
    gaps: number;
    costUsd: number | null;
    analysis: Record<string, number> | null;
  }>;
  /** Ops verdicts by confidence bucket: the calibration read. */
  calibration: Array<{
    bucket: string;
    confirmed: number;
    edited: number;
    removed: number;
    pending: number;
    /** confirmed / (confirmed + removed); null until verdicts exist. */
    precisionProxy: number | null;
  }>;
  /** Divisions ranked by how often ops removes the model's claims. */
  divisions: Array<{
    divisionId: string;
    confirmed: number;
    edited: number;
    removed: number;
    removalRate: number;
  }>;
  totals: { runs: number; costUsd: number; verdicts: number };
  /** The Standard's growth votes: recurring off-standard capture
   *  labels across runs, promoted counts alongside. The strongest
   *  become the next Standard release's items. */
  captureVotes: Array<{
    label: string;
    runs: number;
    promoted: number;
    dismissed: number;
  }>;
}

/**
 * Every ops verdict is a label. This report reads them back as the
 * model's report card: precision by confidence bucket (does the 0.65
 * floor sit where it should), removal rates by division (where does
 * the model over-claim), and each run's analysis counters (citation
 * violations, residual defaults, register dedupes). No golden set
 * required — this is the measurement we get for free from running
 * the desk, and the golden set will sharpen it, not replace it.
 */
export async function scopeModelReport(): Promise<ModelReport> {
  const runRows = await db
    .select({
      runId: scopeRuns.id,
      status: scopeRuns.status,
      createdAt: scopeRuns.createdAt,
      usage: scopeRuns.usage,
      projectSlug: projects.slug,
    })
    .from(scopeRuns)
    .innerJoin(projects, eq(projects.id, scopeRuns.projectId))
    .orderBy(desc(scopeRuns.createdAt))
    .limit(30);

  const counts = await db
    .select({
      runId: scopeRunItems.runId,
      items: sql<number>`count(*)::int`,
      gaps: sql<number>`count(*) filter (where ${scopeRunItems.status} = 'gap')::int`,
    })
    .from(scopeRunItems)
    .groupBy(scopeRunItems.runId);
  const countByRun = new Map(counts.map((c) => [c.runId, c]));

  const buckets = await db
    .select({
      bucket: sql<string>`case
        when coalesce(${scopeRunItems.confidence}, 0)::real < 0.5 then 'under 0.5'
        when coalesce(${scopeRunItems.confidence}, 0)::real < 0.65 then '0.5 to 0.65'
        when coalesce(${scopeRunItems.confidence}, 0)::real < 0.8 then '0.65 to 0.8'
        else '0.8 and up'
      end`,
      opsStatus: scopeRunItems.opsStatus,
      n: sql<number>`count(*)::int`,
    })
    .from(scopeRunItems)
    .groupBy(sql`1`, scopeRunItems.opsStatus);

  const BUCKET_ORDER = ["under 0.5", "0.5 to 0.65", "0.65 to 0.8", "0.8 and up"];
  const calibration = BUCKET_ORDER.map((bucket) => {
    const of = (status: string) =>
      buckets.find((b) => b.bucket === bucket && b.opsStatus === status)?.n ?? 0;
    const confirmed = of("confirmed");
    const edited = of("edited");
    const removed = of("removed");
    const judged = confirmed + removed;
    return {
      bucket,
      confirmed,
      edited,
      removed,
      pending: of("pending"),
      precisionProxy:
        judged > 0 ? Math.round((confirmed / judged) * 1000) / 1000 : null,
    };
  });

  const divisionRows = await db
    .select({
      divisionId: sql<string>`split_part(${scopeRunItems.itemId}, '.', 1)`,
      opsStatus: scopeRunItems.opsStatus,
      n: sql<number>`count(*)::int`,
    })
    .from(scopeRunItems)
    .where(ne(scopeRunItems.opsStatus, "pending"))
    .groupBy(sql`1`, scopeRunItems.opsStatus);
  const divisionIds = [...new Set(divisionRows.map((r) => r.divisionId))];
  const divisions = divisionIds
    .map((divisionId) => {
      const of = (status: string) =>
        divisionRows.find(
          (r) => r.divisionId === divisionId && r.opsStatus === status,
        )?.n ?? 0;
      const confirmed = of("confirmed");
      const edited = of("edited");
      const removed = of("removed");
      const judged = confirmed + edited + removed;
      return {
        divisionId,
        confirmed,
        edited,
        removed,
        removalRate: judged > 0 ? Math.round((removed / judged) * 1000) / 1000 : 0,
      };
    })
    .filter((d) => d.confirmed + d.edited + d.removed > 0)
    .sort((a, b) => b.removalRate - a.removalRate);

  const runs = runRows.map((r) => {
    const u = (r.usage ?? {}) as Record<string, unknown>;
    const c = countByRun.get(r.runId);
    return {
      runId: r.runId,
      projectSlug: r.projectSlug,
      status: r.status,
      createdAtISO: r.createdAt.toISOString(),
      items: c?.items ?? 0,
      gaps: c?.gaps ?? 0,
      costUsd:
        typeof u.estimatedCostUsd === "number" ? u.estimatedCostUsd : null,
      analysis:
        u.analysis && typeof u.analysis === "object"
          ? (u.analysis as Record<string, number>)
          : null,
    };
  });

  // The Standard's growth votes: every off-standard capture, grouped
  // by normalised label across all runs.
  const voteRows = await db
    .select({
      label: sql<string>`min(${scopeRunCaptures.label})`,
      runs: sql<number>`count(distinct ${scopeRunCaptures.runId})::int`,
      promoted: sql<number>`count(*) filter (where ${scopeRunCaptures.opsStatus} = 'promoted')::int`,
      dismissed: sql<number>`count(*) filter (where ${scopeRunCaptures.opsStatus} = 'dismissed')::int`,
    })
    .from(scopeRunCaptures)
    .groupBy(sql`lower(${scopeRunCaptures.label})`)
    .orderBy(sql`count(distinct ${scopeRunCaptures.runId}) desc`)
    .limit(30);

  return {
    runs,
    calibration,
    divisions,
    totals: {
      runs: runRows.length,
      costUsd:
        Math.round(
          runs.reduce((n, r) => n + (r.costUsd ?? 0), 0) * 100,
        ) / 100,
      verdicts: buckets
        .filter((b) => b.opsStatus !== "pending")
        .reduce((n, b) => n + b.n, 0),
    },
    captureVotes: voteRows,
  };
}

/* ── the round, read from the builder's side ─────────────────────── */

/**
 * Which key reports the round's register carries, plus the facts the
 * classifier read off them. The tender deck turns questions into
 * confirmations with these: a soil report on file means "priced to
 * class M" instead of "which class did you assume?".
 */
export interface RoundPackFacts {
  soil: { onFile: boolean; siteClass: string | null };
  structural: { onFile: boolean };
  energy: { onFile: boolean; stars: number | null };
}

export const EMPTY_PACK_FACTS: RoundPackFacts = {
  soil: { onFile: false, siteClass: null },
  structural: { onFile: false },
  energy: { onFile: false, stars: null },
};

export interface BuilderRoundContext {
  /** The client's brief as short labelled facts, builder order. */
  brief: Array<{ k: string; v: string }>;
  /** The reader's overview of the documents — post-unlock material. */
  overview: SynthesisOverview | null;
  /** What the register lacks — post-unlock pricing intelligence. */
  advisories: DocumentAdvice[];
  /** Which key reports are on file, with their read facts. */
  packFacts: RoundPackFacts;
}

/**
 * The lean read of RoundPackFacts alone — the submit gate's version.
 * Same facts getRoundContextForBuilders returns, without the brief,
 * overview or advisory queries.
 */
export async function packFactsForProject(
  projectId: string,
): Promise<RoundPackFacts> {
  const [run] = await db
    .select({ id: scopeRuns.id })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        eq(scopeRuns.status, "approved"),
        sql`${scopeRuns.effectiveAt} is not null`,
      ),
    )
    .limit(1);
  if (!run) return EMPTY_PACK_FACTS;
  const register = await db
    .select({
      kind: scopeRunDocuments.kind,
      siteClass: scopeRunDocuments.siteClass,
      energyStars: scopeRunDocuments.energyStars,
    })
    .from(scopeRunDocuments)
    .where(eq(scopeRunDocuments.runId, run.id));
  const soilDoc = register.find((r) => r.kind === "soil");
  const energyDoc = register.find((r) => r.kind === "energy");
  return {
    soil: { onFile: !!soilDoc, siteClass: soilDoc?.siteClass ?? null },
    structural: { onFile: register.some((r) => r.kind === "structural") },
    energy: { onFile: !!energyDoc, stars: energyDoc?.energyStars ?? null },
  };
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
    return {
      brief,
      overview: null,
      advisories: [],
      packFacts: EMPTY_PACK_FACTS,
    };
  }

  const [register, items] = await Promise.all([
    db
      .select({
        documentId: scopeRunDocuments.documentId,
        kind: scopeRunDocuments.kind,
        siteClass: scopeRunDocuments.siteClass,
        energyStars: scopeRunDocuments.energyStars,
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

  const soilDoc = register.find((r) => r.kind === "soil");
  const energyDoc = register.find((r) => r.kind === "energy");
  const packFacts: RoundPackFacts = {
    soil: {
      onFile: !!soilDoc,
      siteClass: soilDoc?.siteClass ?? null,
    },
    structural: {
      onFile: register.some((r) => r.kind === "structural"),
    },
    energy: {
      onFile: !!energyDoc,
      stars: energyDoc?.energyStars ?? null,
    },
  };

  return {
    brief,
    overview: (run.overview as SynthesisOverview | null) ?? null,
    advisories,
    packFacts,
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

  // The heartbeat: ops hears that a run has STARTED, so a review email
  // that never follows is a visible absence rather than pure silence.
  // Fire-and-forget — a mail hiccup must never block the submission.
  void dispatchScopeRunOps(run.value.id, "started").catch(() => undefined);

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
  /** Documents the pack names that it does not contain — the pack's
   *  own missing-document register. Ready phase only. */
  namedMissing?: NamedMissingRef[];
  /** The pack-level readiness call. Ready phase only. */
  readiness?: PackReadiness | null;
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
  const [items, resolutions, register, fullRegister, conflicts] =
    await Promise.all([
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
      db
        .select({
          documentId: scopeRunDocuments.documentId,
          filename: documents.filename,
          docTitle: scopeRunDocuments.docTitle,
          findings: scopeRunDocuments.findings,
        })
        .from(scopeRunDocuments)
        .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
        .where(eq(scopeRunDocuments.runId, run.id)),
      db
        .select({ severity: scopeRunConflicts.severity, opsStatus: scopeRunConflicts.opsStatus })
        .from(scopeRunConflicts)
        .where(eq(scopeRunConflicts.runId, run.id)),
    ]);
  const namedMissing = namedMissingDocuments(
    fullRegister
      .filter((r) => r.findings)
      .map((r) => ({
        documentId: r.documentId,
        filename: r.filename,
        docTitle: r.docTitle,
        kind: register.find((x) => x.documentId === r.documentId)?.kind ?? null,
        findings: r.findings as DocumentFindings,
      })),
  );
  const readiness = packReadiness({
    items: items.map((i) => ({ status: i.status, depth: i.depth })),
    conflicts: conflicts
      .filter((c) => c.opsStatus !== "dismissed")
      .map((c) => ({ severity: c.severity })),
    namedMissingCount: namedMissing.length,
    registerKinds: [
      ...new Set(register.map((r) => r.kind).filter((k): k is string => !!k)),
    ],
    projectType: (await db
      .select({ type: projects.type })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
      .then((r) => r[0]?.type ?? "single_dwelling")) as ScopeProjectType,
  });
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
    namedMissing,
    readiness,
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
/**
 * Project PDFs the given run has not read. The same diff requestReread
 * uses to refuse a pointless re-read, exported so the review page can
 * warn and the approval can refuse: a pack must never go to builders
 * with a document sitting beside it unread.
 */
export async function listUnreadDocuments(
  projectId: string,
  runId: string,
): Promise<Array<{ id: string; filename: string }>> {
  const [current, prior] = await Promise.all([
    db
      .select({ id: documents.id, filename: documents.filename })
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          sql`${documents.tenderId} is null`,
          eq(documents.status, "active"),
          sql`${documents.deletedAt} is null`,
          sql`lower(${documents.contentType}) like '%pdf%'`,
        ),
      ),
    db
      .select({ documentId: scopeRunDocuments.documentId })
      .from(scopeRunDocuments)
      .where(eq(scopeRunDocuments.runId, runId)),
  ]);
  const priorIds = new Set(prior.map((d) => d.documentId));
  return current.filter((d) => !priorIds.has(d.id));
}

export async function requestReread(
  projectId: string,
  runnerId: string,
): Promise<Result<{ runId: string }>> {
  const access = await getProjectAccess(projectId, runnerId);
  if (access?.kind !== "runner") {
    return fail("forbidden", "Only the project runner can request a re-read.");
  }
  // Idempotent under impatience: a run already reading this project is
  // THE re-read. Starting another would supersede it mid-flight and
  // buy the same work twice.
  const [inFlight] = await db
    .select({ id: scopeRuns.id })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        inArray(scopeRuns.status, [
          "pending",
          "classifying",
          "extracting",
          "synthesising",
        ]),
      ),
    )
    .limit(1);
  if (inFlight) return ok({ runId: inFlight.id });
  // Nothing changed, nothing to read: the same documents under the
  // same pipeline produce the same pack. Refuse the spend and say why.
  const [latest] = await db
    .select({ id: scopeRuns.id })
    .from(scopeRuns)
    .where(
      and(
        eq(scopeRuns.projectId, projectId),
        inArray(scopeRuns.status, ["review", "approved"]),
      ),
    )
    .orderBy(desc(scopeRuns.createdAt))
    .limit(1);
  if (latest) {
    const [current, prior] = await Promise.all([
      db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.projectId, projectId),
            sql`${documents.tenderId} is null`,
            eq(documents.status, "active"),
            sql`${documents.deletedAt} is null`,
            sql`lower(${documents.contentType}) like '%pdf%'`,
          ),
        ),
      db
        .select({ documentId: scopeRunDocuments.documentId })
        .from(scopeRunDocuments)
        .where(eq(scopeRunDocuments.runId, latest.id)),
    ]);
    const currentIds = new Set(current.map((d) => d.id));
    const priorIds = new Set(prior.map((d) => d.documentId));
    const unchanged =
      currentIds.size === priorIds.size &&
      [...currentIds].every((id) => priorIds.has(id));
    if (unchanged) {
      return fail(
        "conflict",
        "The current read already covers these exact documents. Add or replace a document, then request the re-read.",
      );
    }
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
  // A document added during the review but never read must not slip
  // out with the pack. The page warns as soon as one lands; this is
  // the same rule enforced where it cannot be scrolled past.
  const unread = await listUnreadDocuments(projectId, review.value.run.id);
  if (unread.length > 0) {
    return fail(
      "conflict",
      unread.length === 1
        ? `"${unread[0]!.filename}" was added after this read. Use "Documents added, read again" so it is in the pack before the round opens.`
        : `${unread.length} documents were added after this read. Use "Documents added, read again" so they are in the pack before the round opens.`,
    );
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
        kind: scopeRunDocuments.kind,
        docTitle: scopeRunDocuments.docTitle,
        filename: documents.filename,
      })
      .from(scopeRunDocuments)
      .leftJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
      .where(eq(scopeRunDocuments.runId, run.id)),
  ]);

  // Citations speak the standard naming convention everywhere a
  // schedule renders: "Structural Engineering p.34", never a raw
  // filename.
  const nameByDoc = resolveRegisterNames(
    docRows.map((d) => ({
      documentId: d.documentId,
      kind: d.kind,
      docTitle: d.docTitle,
      filename: d.filename ?? "",
    })),
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
      label: row.label ?? null,
      depth: (row.depth as "full" | "partial" | null) ?? null,
      remaining: row.remaining ?? null,
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
  opts: { includeLowConfidence?: boolean } = {},
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
  // The ordinary sweep confirms EVERYTHING — gaps and not-expected
  // lines included — except an evidenced line below the confidence
  // floor, which waits for a person because the model was unsure.
  //
  // `includeLowConfidence` is that person, deciding in one act instead
  // of sixty-seven. It is a separate call with its own button and its
  // own audit entry precisely so it can never happen by accident: the
  // ordinary sweep still refuses those lines.
  const holdsLowConfidence = !opts.includeLowConfidence;
  const updated = await db
    .update(scopeRunItems)
    .set({ opsStatus: "confirmed", editedBy: actorId, editedAt: new Date() })
    .where(
      and(
        eq(scopeRunItems.runId, runId),
        eq(scopeRunItems.opsStatus, "pending"),
        ...(holdsLowConfidence
          ? [
              or(
                ne(scopeRunItems.status, "evidenced"),
                // Both sides cast to real so the boundary resolves the
                // same way here, in the desk badge, and in any ad-hoc
                // query: a line AT the floor sweeps; strictly below it
                // waits.
                sql`coalesce(${scopeRunItems.confidence}, 0)::real >= ${SCOPE_CONFIDENCE_FLOOR}::real`,
              ),
            ]
          : []),
      ),
    )
    .returning({ id: scopeRunItems.id });
  await recordReview(runId, "run", "run.bulk_confirmed", actorId, null, {
    confirmed: updated.length,
    includedLowConfidence: opts.includeLowConfidence === true,
  });
  logger.info(
    {
      event: "scope.run.bulk_confirmed",
      runId,
      actorId,
      confirmed: updated.length,
      includedLowConfidence: opts.includeLowConfidence === true,
    },
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
