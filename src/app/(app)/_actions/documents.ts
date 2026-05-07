"use server";

/**
 * Server actions wrapping the documents module.
 *
 * The pattern: thin adapter — auth check, policy check, then call the
 * service. UI components import these (never the module directly) so
 * the network boundary stays in one place.
 */

import { auth } from "@/modules/auth";
import {
  initUpload,
  completeUpload,
  getDownloadUrl,
  listMyDocuments,
  softDelete,
  canUpload,
  type ActorContext,
} from "@/modules/documents";
import { fail, type Result } from "@/lib/result";
import type {
  Document,
  InitUploadInput,
  InitUploadResult,
} from "@/modules/documents";

async function requireActor(): Promise<Result<ActorContext>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return fail("forbidden", "Sign in required.");
  }
  return { ok: true, value: { id: user.id, role: user.role } };
}

export async function initUploadAction(
  input: InitUploadInput,
): Promise<Result<InitUploadResult>> {
  const a = await requireActor();
  if (!a.ok) return a;
  if (!canUpload(a.value)) return fail("forbidden", "Not allowed to upload.");
  return initUpload(a.value.id, input);
}

export async function completeUploadAction(
  documentId: string,
): Promise<Result<Document>> {
  const a = await requireActor();
  if (!a.ok) return a;
  return completeUpload(a.value.id, documentId);
}

export async function getDownloadUrlAction(
  documentId: string,
): Promise<Result<{ url: string; filename: string }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  return getDownloadUrl(a.value.id, documentId);
}

export async function listMyDocumentsAction(): Promise<Result<Document[]>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const docs = await listMyDocuments(a.value.id);
  return { ok: true, value: docs };
}

export async function softDeleteAction(
  documentId: string,
): Promise<Result<{ id: string }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  return softDelete(a.value.id, documentId);
}
