/**
 * documents · R2 storage adapter (server-only).
 *
 * Wraps the S3-compatible Cloudflare R2 API behind a small surface:
 * one client, an object-key convention, and presigned-URL helpers
 * for direct browser upload + download. Files never proxy through
 * our server — owners and builders PUT/GET R2 directly with short-
 * lived signed URLs.
 *
 * Bucket layout:
 *   projects/{projectId}/{docId}/{version}/{filename}
 *
 *   - projectId scopes the file to its project (cheap prefix-list)
 *   - docId is our DB primary key for the document row
 *   - version lets us keep an immutable history (v1, v2, …)
 *   - filename preserves the original name for download Content-Disposition
 *
 * Signed URLs are constrained to 5 minutes. CORS on the bucket allows
 * GET/PUT/HEAD from app origins (see Cloudflare R2 → Settings).
 */

import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

// ── client ───────────────────────────────────────────────────────────────

/**
 * Singleton S3 client targeting Cloudflare R2.
 *
 * R2 ignores the `region` value but the AWS SDK requires one — "auto"
 * is the documented sentinel.
 */
export const r2 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// ── key convention ───────────────────────────────────────────────────────

/**
 * Build the canonical object key for a document version.
 *
 * Filename is sanitised (path components stripped, suspicious chars
 * replaced) so a malicious upload can't escape its prefix.
 */
export function buildObjectKey(args: {
  projectId: string;
  documentId: string;
  version: number;
  filename: string;
}): string {
  const safeName = sanitiseFilename(args.filename);
  return `projects/${args.projectId}/${args.documentId}/v${args.version}/${safeName}`;
}

function sanitiseFilename(name: string): string {
  // Strip directories, control chars, and anything that isn't a
  // letter, digit, dot, dash, underscore, or space. Collapse runs of
  // whitespace. Cap length so an absurd filename can't blow up the
  // key past R2's 1024-byte limit.
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, "")
    .replace(/[^A-Za-z0-9._\- ]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "file";
}

// ── signed URLs ──────────────────────────────────────────────────────────

const FIVE_MINUTES = 60 * 5;

/**
 * Short-lived URL the browser PUTs the file body to. Returned alongside
 * the headers the browser must send (Content-Type, Content-Length) so
 * the signature matches.
 */
export async function presignUpload(args: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ url: string; headers: Record<string, string> }> {
  const cmd = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: args.key,
    ContentType: args.contentType,
    ContentLength: args.contentLength,
  });

  const url = await getSignedUrl(r2, cmd, { expiresIn: FIVE_MINUTES });

  return {
    url,
    headers: {
      "Content-Type": args.contentType,
    },
  };
}

/**
 * Short-lived URL the browser GETs the file body from. Optionally
 * sets a download filename via Content-Disposition.
 */
export async function presignDownload(args: {
  key: string;
  filename?: string;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: args.key,
    ...(args.filename
      ? {
          ResponseContentDisposition: `attachment; filename="${sanitiseFilename(
            args.filename,
          )}"`,
        }
      : {}),
  });
  return getSignedUrl(r2, cmd, { expiresIn: FIVE_MINUTES });
}

/**
 * Confirm an object actually landed in the bucket — used by upload-
 * complete to defend against clients that lie about uploading. Returns
 * the actual size R2 reports, or null if the object doesn't exist.
 */
export async function statObject(key: string): Promise<{
  size: number;
  contentType: string | null;
} | null> {
  try {
    const res = await r2.send(
      new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
    );
    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType ?? null,
    };
  } catch (err: unknown) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

/**
 * Hard-delete an object. Used for cleanup when a DB write fails after
 * the upload succeeded, or for admin moderation.
 */
export async function deleteObject(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function isNotFoundError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e.name === "NotFound" || e.$metadata?.httpStatusCode === 404;
}
