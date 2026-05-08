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
  // readiness
  computeReadiness,
  // builder writes
  createDraft,
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
} from "./service";

// Policies.
export {
  canCreateTender,
  canEditTender,
  canWithdrawTender,
  canDecideOnTender,
  canReadTender,
} from "./policies";
export type { ActorContext } from "./policies";
