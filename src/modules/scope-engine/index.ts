/**
 * @module scope-engine
 *
 * Server-only: the documents-to-scope extraction pipeline and its
 * runs. The vocabulary it speaks lives in @/modules/scope (client-
 * safe); this module owns the Claude calls, the run lifecycle and
 * the ops review writes.
 */

export {
  requestPreparation,
  getOwnerReview,
  resolveGap,
  requestReread,
  listUnreadDocuments,
  listOpenConflictsForProject,
  completeOwnerReview,
  getProjectSchedule,
  getRoundContextForBuilders,
  packStatsForProjects,
  packPhaseForProjects,
  scopeModelReport,
  type ModelReport,
  type BuilderRoundContext,
  type RoundPackFacts,
  EMPTY_PACK_FACTS,
  packFactsForProject,
  getScheduleForRun,
  listAddenda,
  scopePhaseForProjects,
  bulkConfirmPending,
  bulkResolveOpen,
  type GapResolutionKind,
  type ProjectScopePhase,
  type OwnerScopeReview,
} from "./service";
export type { ScopeGapResolutionRow, ScopeAddendumRow } from "./schema";
export { SCOPE_CONFIDENCE_FLOOR } from "./floor";
export {
  startRun,
  reopenItem,
  reopenConflict,
  reopenCapture,
  processRunTick,
  retryFailedDocuments,
  tickQueuedRuns,
  TICK_BUDGET_MS,
  MIN_TICK_BUDGET_MS,
  listRuns,
  listAddendaForOps,
  getRunForReview,
  reviewItem,
  addItem,
  promoteCapture,
  dismissCapture,
  reviewConflict,
  approveRun,
  type ItemVerdictInput,
  type OpsAddendumRow,
} from "./service";
export {
  packReadiness,
  type PackReadiness,
  type NamedMissingRef,
} from "./analysis";
export {
  classifyDocument,
  extractDocument,
  synthesiseRun,
  ontologyDigest,
  estimateCostUsd,
  CLASSIFY_MODEL,
  EXTRACT_MODEL,
  SYNTHESIS_MODEL,
  type DocumentClassification,
  type DocumentFindings,
  type SynthesisResult,
  type SynthesisDocumentInput,
  type StageUsage,
} from "./pipeline";
export type {
  ScopeRunRow,
  ScopeRunDocumentRow,
  ScopeRunItemRow,
  ScopeRunConflictRow,
  ScopeRunCaptureRow,
  ScopeReviewEventRow,
} from "./schema";
