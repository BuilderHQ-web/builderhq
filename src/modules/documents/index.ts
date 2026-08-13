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
export { documents, documentStatusEnum, documentCategoryEnum } from "./schema";
export type { DocumentRow, DocumentInsert } from "./schema";

// Public types.
export type {
  Document,
  DocumentCategory,
  InitUploadInput,
  InitUploadResult,
} from "./types";

// Service.
export {
  initUpload,
  completeUpload,
  getDownloadUrl,
  getOwnedObject,
  listMyDocuments,
  listForProject,
  listActiveForProjectUnchecked,
  listActiveObjectsForProject,
  listForTenderUnchecked,
  getDownloadUrlForUnlocked,
  softDelete,
} from "./service";

// Policies (for callers that want to gate UI before calling service).
export { canUpload, canRead, canDelete } from "./policies";
export type { ActorContext } from "./policies";

// Storage primitives — R2 client + signed-URL helpers. Exported so
// other modules (profiles for builder logos, future media) can do
// direct uploads without re-instantiating an S3Client. Cross-module
// reach is the whole point of these — they're infrastructure, not
// document-specific behaviour.
export { r2, presignDownload, presignUpload, statObject, deleteObject, getObjectBytes } from "./storage";
