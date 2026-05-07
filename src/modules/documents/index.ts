/**
 * @module documents
 *
 * Public surface for the documents module. Anything outside this folder
 * MUST import from `@/modules/documents` (this file) — never reach into
 * `./service`, `./schema`, `./storage`, or `./policies` directly.
 * ESLint enforces it.
 *
 * Schema tables are re-exported here intentionally: db.ts needs them at
 * startup. They're "public" in the sense that the database setup needs
 * them — but the rule that no callsite outside this module may write a
 * Drizzle query against documents still applies. Use service functions.
 */

// Schema (DB-only consumers).
export { documents, documentStatusEnum } from "./schema";
export type { DocumentRow, DocumentInsert } from "./schema";

// Public types.
export type { Document, InitUploadInput, InitUploadResult } from "./types";

// Service.
export {
  initUpload,
  completeUpload,
  getDownloadUrl,
  listMyDocuments,
  softDelete,
} from "./service";

// Policies (for callers that want to gate UI before calling service).
export { canUpload, canRead, canDelete } from "./policies";
export type { ActorContext } from "./policies";
