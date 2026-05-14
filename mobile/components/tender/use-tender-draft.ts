/**
 * useTenderDraft — owns every piece of the tender composer state.
 *
 * Responsibilities:
 *   1. Bootstrap. On mount, POST /api/mobile/projects/[slug]/tender —
 *      idempotent, returns existing draft if any. State arrives in
 *      one roundtrip.
 *   2. Local state. Each editable field is mirrored locally so the
 *      input feels responsive — no waiting on the server before the
 *      character paints.
 *   3. Autosave. Local edits debounce (800ms) and patch the server.
 *      On success we accept the server's fresh payload (which carries
 *      the recomputed readiness + variance). On failure we keep the
 *      local edit and surface a banner — the user can retry by
 *      tapping a field again, which re-queues the patch.
 *   4. Cost lines. Mutated through replaceCostLines() which writes
 *      the whole set in one shot via PUT /cost-lines. Optimistic
 *      updates aren't worth the complexity here — line edits aren't
 *      per-keystroke.
 *   5. Submit. POST /submit; on success we flip status to "submitted"
 *      locally and surface the post-submit payload.
 *
 * Completeness: derived from the server's `readiness` field on every
 * payload. We expose a 0–100% number so the ring component doesn't
 * need to know the underlying field set.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import type {
  CostLineInput,
  TenderPatch,
  TenderPayload,
} from "./types";

const AUTOSAVE_DEBOUNCE_MS = 800;

interface UseTenderDraftReturn {
  // Loading / status
  tender: TenderPayload | null;
  isLoading: boolean;
  loadError: string | null;
  saveError: string | null;
  isSaving: boolean;
  isSubmitting: boolean;
  submitError: string | null;

  // Computed
  completenessPct: number;
  /** 0..1 — what fraction of the 7-field "polish" set is filled. */
  polishPct: number;
  /** All required fields present (price + duration + validity). */
  canSubmit: boolean;

  // Mutations
  patch: (patch: TenderPatch) => void;
  replaceCostLines: (lines: CostLineInput[]) => Promise<void>;
  submit: () => Promise<{ ok: boolean; message?: string }>;
}

export function useTenderDraft(projectSlug: string): UseTenderDraftReturn {
  const [tender, setTender] = useState<TenderPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Bootstrap.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      const r = await api.post<TenderPayload>(
        `/api/mobile/projects/${encodeURIComponent(projectSlug)}/tender`,
      );
      if (cancelled) return;
      if (r.ok) setTender(r.value);
      else setLoadError(r.error.message);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectSlug]);

  // 2 + 3. Autosave queue. We coalesce rapid field edits into a single
  // PATCH every AUTOSAVE_DEBOUNCE_MS. The queued patch is merged so
  // each field has the latest local value at flush time.
  const pendingRef = useRef<TenderPatch>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!tender) return;
    const patch = pendingRef.current;
    if (Object.keys(patch).length === 0) return;
    pendingRef.current = {};
    setIsSaving(true);
    setSaveError(null);
    const r = await api.patch<TenderPayload>(
      `/api/mobile/tenders/${tender.id}`,
      patch,
    );
    if (r.ok) {
      setTender(r.value);
    } else {
      setSaveError(r.error.message);
    }
    setIsSaving(false);
  }, [tender]);

  const patch = useCallback(
    (next: TenderPatch) => {
      // Merge into the pending patch + paint local state immediately
      // so the input feels responsive.
      pendingRef.current = { ...pendingRef.current, ...next };
      setTender((t) => (t ? { ...t, ...next } : t));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Final flush on unmount to avoid losing the last keystroke.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Best-effort — fire and forget. If the user backgrounded the
      // app, this might not complete; the next mount re-hydrates from
      // server state anyway.
      void flush();
    };
  }, [flush]);

  // 4. Cost lines.
  const replaceCostLines = useCallback(
    async (lines: CostLineInput[]) => {
      if (!tender) return;
      setIsSaving(true);
      setSaveError(null);
      const r = await api.put<TenderPayload>(
        `/api/mobile/tenders/${tender.id}/cost-lines`,
        { lines },
      );
      if (r.ok) setTender(r.value);
      else setSaveError(r.error.message);
      setIsSaving(false);
    },
    [tender],
  );

  // 5. Submit.
  const submit = useCallback(async (): Promise<{
    ok: boolean;
    message?: string;
  }> => {
    if (!tender) return { ok: false, message: "No draft loaded." };
    // Flush any pending autosave first so we don't submit stale state.
    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
    setIsSubmitting(true);
    setSubmitError(null);
    const r = await api.post<TenderPayload>(
      `/api/mobile/tenders/${tender.id}/submit`,
    );
    setIsSubmitting(false);
    if (r.ok) {
      setTender(r.value);
      return { ok: true };
    }
    setSubmitError(r.error.message);
    return { ok: false, message: r.error.message };
  }, [tender, flush]);

  // Computed
  const completenessPct = useMemo(() => {
    if (!tender) return 0;
    let filled = 0;
    let total = 0;
    // Required (weight 1 each)
    total += 3;
    if (tender.totalPriceAud && tender.totalPriceAud > 0) filled++;
    if (tender.durationWeeks && tender.durationWeeks > 0) filled++;
    if (tender.validityDays && tender.validityDays > 0) filled++;
    // Polish (weight 1 each)
    total += 4;
    if (tender.proposedStartMonth) filled++;
    if (tender.pitch && tender.pitch.trim().length > 0) filled++;
    if (tender.exclusions && tender.exclusions.length > 0) filled++;
    if (tender.costLines.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }, [tender]);

  const polishPct = useMemo(() => {
    if (!tender) return 0;
    let filled = 0;
    const total = 4;
    if (tender.proposedStartMonth) filled++;
    if (tender.pitch && tender.pitch.trim().length > 0) filled++;
    if (tender.exclusions && tender.exclusions.length > 0) filled++;
    if (tender.costLines.length > 0) filled++;
    return filled / total;
  }, [tender]);

  return {
    tender,
    isLoading,
    loadError,
    saveError,
    isSaving,
    isSubmitting,
    submitError,
    completenessPct,
    polishPct,
    canSubmit: tender?.readiness.canSubmit ?? false,
    patch,
    replaceCostLines,
    submit,
  };
}
