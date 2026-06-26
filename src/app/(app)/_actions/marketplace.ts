"use server";

/**
 * Builder-side server actions for the marketplace surface.
 *
 * Pattern: thin adapter — auth + policy check, then service call.
 * UI components import these (never the modules directly).
 */

import { auth } from "@/modules/auth";
import {
  unlockProject,
  saveProject,
  unsaveProject,
  isUnlocked,
  canUnlock,
  canSave,
  type ActorContext,
} from "@/modules/unlocks";
import {
  getMarketplacePreview,
  type MarketplacePreview,
} from "@/modules/projects";
import { getDownloadUrlForUnlocked } from "@/modules/documents";
import { createUnlockCheckout } from "@/modules/payments";
import { fail, ok, type Result } from "@/lib/result";

async function requireBuilder(): Promise<Result<ActorContext>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return fail("forbidden", "Sign in required.");
  }
  return ok({ id: user.id, role: user.role });
}

/**
 * Unlock a project. During the founding launch this is gated on FBA
 * credits — every onboarded builder gets an auto-grant at the founding
 * cohort cap. Paid pay-per-unlock via Stripe lands in v2 (the service
 * already returns a rate_limited Result when no credit is available;
 * the client points the user to /builder/access to claim a seat).
 */
export async function unlockProjectAction(
  projectId: string,
): Promise<Result<{ unlocked: true; preview: MarketplacePreview | null }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canUnlock(a.value)) {
    return fail("forbidden", "Only builders can unlock projects.");
  }

  // Default path: the service gates on FBA + falls through to the
  // paid CTA (returns rate_limited) when no credit is available. The
  // client surfaces that error inline.
  const r = await unlockProject(a.value.id, projectId);
  if (!r.ok) return r;

  // Caller will already have the slug; we don't re-resolve here.
  return ok({ unlocked: true as const, preview: null });
}

/**
 * Start a paid unlock checkout. Returns the hosted Stripe Checkout URL
 * for the client to redirect to (`window.location.href = url`), or a flag
 * that the builder already holds the unlock (client just reloads the
 * preview). All eligibility / cap gating happens in the service before any
 * Stripe call; the unlock itself is granted by the webhook on capture.
 */
export async function startUnlockCheckoutAction(
  slug: string,
): Promise<Result<{ url: string | null; alreadyUnlocked: boolean }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canUnlock(a.value)) {
    return fail("forbidden", "Only builders can unlock projects.");
  }
  const r = await createUnlockCheckout({ builderId: a.value.id, slug });
  if (!r.ok) return r;
  return ok({ url: r.value.url, alreadyUnlocked: r.value.alreadyUnlocked });
}

/**
 * Poll helper for the post-checkout return screen. The unlock is granted
 * asynchronously by the Stripe webhook (on payment capture), so the
 * success page polls this until it flips true.
 */
export async function amIUnlockedAction(
  projectId: string,
): Promise<Result<{ unlocked: boolean }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  return ok({ unlocked: await isUnlocked(a.value.id, projectId) });
}

export async function saveProjectAction(
  projectId: string,
): Promise<Result<{ saved: true }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canSave(a.value)) return fail("forbidden", "Only builders can save projects.");
  const r = await saveProject(a.value.id, projectId);
  if (!r.ok) return r;
  return ok({ saved: true as const });
}

export async function unsaveProjectAction(
  projectId: string,
): Promise<Result<{ removed: boolean }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  if (!canSave(a.value)) return fail("forbidden", "Only builders can save projects.");
  return unsaveProject(a.value.id, projectId);
}

/**
 * Helper for the project detail page so it can re-render the preview
 * data after an unlock/save/unsave without a full route reload.
 */
export async function reloadPreviewAction(
  slug: string,
): Promise<Result<MarketplacePreview>> {
  return getMarketplacePreview(slug);
}

/**
 * Builder-side document download. Confirms the requester has unlocked
 * the parent project before issuing a signed URL.
 */
export async function getBuilderDownloadUrlAction(
  documentId: string,
): Promise<Result<{ url: string; filename: string }>> {
  const a = await requireBuilder();
  if (!a.ok) return a;
  const r = await getDownloadUrlForUnlocked(documentId);
  if (!r.ok) return r;
  if (!r.value.projectId) return fail("not_found", "Document is orphaned.");
  const unlocked = await isUnlocked(a.value.id, r.value.projectId);
  if (!unlocked) {
    return fail("forbidden", "Unlock this project to download its documents.");
  }
  return ok({ url: r.value.url, filename: r.value.filename });
}
