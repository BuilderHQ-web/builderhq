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
  completeOwnerReview,
  getProjectSchedule,
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
  processRunTick,
  tickQueuedRuns,
  listRuns,
  listAddendaForOps,
  getRunForReview,
  reviewItem,
  addItem,
  reviewConflict,
  approveRun,
  type ItemVerdictInput,
  type OpsAddendumRow,
} from "./service";
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
  ScopeReviewEventRow,
} from "./schema";
