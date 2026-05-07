/**
 * documents · public types.
 *
 * Domain-level types exposed by the module. DB row types live in
 * schema.ts and are re-exported through index.ts.
 */

import type { DocumentRow } from "./schema";

/** Public-safe document shape — strips internal-only columns. */
export type Document = Pick<
  DocumentRow,
  | "id"
  | "ownerId"
  | "projectId"
  | "filename"
  | "contentType"
  | "sizeBytes"
  | "version"
  | "parentId"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

/** Inputs to start a new upload. The bytes haven't moved yet. */
export type InitUploadInput = {
  projectId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  /** Optional version chain — if set, this upload bumps version of parent. */
  parentId?: string;
};

/**
 * What the service hands back after kicking off an upload. The caller
 * (server action) forwards URL + headers to the browser; the browser
 * does the PUT directly to R2; then the caller invokes
 * completeUpload(documentId).
 */
export type InitUploadResult = {
  documentId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  objectKey: string;
};
