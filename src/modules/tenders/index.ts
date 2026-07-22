/**
 * @module tenders
 *
 * Public surface. Outsiders MUST import from `@/modules/tenders` —
 * never reach into `./service`, `./schema`, or `./policies` directly.
 *
 * Trade catalogue is client-safe; client components import directly
 * from `@/modules/tenders/trades` to avoid pulling the server-only
 * service module into client bundles.
 */

// Schema (DB consumers).
export {
  tenders,
  tenderCostLines,
  tenderStatusEnum,
  tradeEnum,
} from "./schema";
export type {
  TenderRow,
  TenderInsert,
  TenderCostLineRow,
  TenderCostLineInsert,
} from "./schema";

// Public types.
export type {
  Tender,
  TenderAnalytics,
  TenderCostLine,
  TenderWithLines,
  TenderForOwner,
  UpdateTenderInput,
  CostLineInput,
  SubmissionReadiness,
} from "./types";

// Service.
export {
  // builder reads
  getActiveTenderForBuilder,
  getTenderForBuilder,
  listTendersForBuilder,
  // owner reads
  getTenderForOwner,
  listTendersForOwner,
  getProjectOwnerForTender,
  // public verification (the document seal)
  getTenderVerification,
  // readiness
  computeReadiness,
  // builder writes
  createDraft,
  adoptInstrumentForDraft,
  updateDraft,
  setCostLines,
  submit,
  withdraw,
  // owner decisions
  shortlist,
  award,
  reject,
  moveBackToSubmitted,
  // KPIs
  countTendersReceivedForOwner,
  countTendersForProject,
  countAwardedForBuilder,
  // Analytics roll-up helper
  computeTenderAnalytics,
  // Submission checklist
  checklistProgress,
  listResponsesForTender,
  listResponsesForProjectTenders,
  saveTenderResponses,
  // Builder invites (private/hybrid rounds)
  createBuilderInvite,
  listBuilderInvites,
  listInvitesForBuilder,
  listDraftTendersForBuilder,
  revokeBuilderInvite,
  getBuilderInviteByToken,
  markBuilderInviteJoined,
} from "./service";
export type { CreateBuilderInviteInput } from "./service";
export type { ChecklistProgress } from "./types";
export type { TenderBuilderInviteRow, TenderResponseRow } from "./schema";

// The structured submission instrument (question set + helpers).
export {
  INSTRUMENT_VERSION,
  INSTRUMENT_SECTIONS,
  INSTRUMENT_SECTIONS_V1,
  INSTRUMENT_SECTIONS_V2,
  sectionsFor,
  SCOPE_STATES,
  scopeMatrixRows,
  allQuestions,
  allQuestionsFor,
  getQuestion,
  requiredQuestionIds,
  isValidAnswerShape,
  isAnswerComplete,
  computeTenderMetrics,
} from "./instrument";
export type {
  InstrumentQuestion,
  InstrumentQuestionType,
  InstrumentSection,
  InstrumentOption,
  ScopeState,
  TenderMetrics,
} from "./instrument";

// Comparison derivation (pure — client-safe).
export {
  summariseInstrument,
  deriveExposure,
  deriveCoverage,
  deriveRiskFlags,
  formatAnswer,
  formatAud,
  answersDiffer,
} from "./comparison";
export type {
  TenderInstrumentSummary,
  RiskFlag,
  RiskSeverity,
  AllowanceExposure,
  CoverageSummary,
} from "./comparison";

// Policies.
export {
  canCreateTender,
  canEditTender,
  canWithdrawTender,
  canDecideOnTender,
  canReadTender,
} from "./policies";
export type { ActorContext } from "./policies";
