/**
 * Owner tender review hooks.
 *
 * Two reads + one write:
 *   · useOwnerTenderList(slug)  — comparison list + analytics
 *   · useOwnerTenderDetail(id)  — single tender drill-in
 *   · decideTender(id, action)  — shortlist / award / reject / reopen
 *
 * Both reads expose a `refresh()` action so the screen can pull-to-
 * refresh and so decision writes can re-hydrate. No polling — tender
 * comparison isn't a live surface, and after each decision we get the
 * fresh row back inline.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "./api";
import type {
  OwnerTenderAction,
  OwnerTenderDecisionResponse,
  OwnerTenderDetailPayload,
  OwnerTenderListPayload,
} from "@/components/owner-tenders/types";

// ── List ────────────────────────────────────────────────────────────

interface ListHook {
  data: OwnerTenderListPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOwnerTenderList(projectSlug: string | null): ListHook {
  const [data, setData] = useState<OwnerTenderListPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!projectSlug) return;
      if (showSpinner) setIsLoading(true);
      setError(null);
      const r = await api.get<OwnerTenderListPayload>(
        `/api/mobile/projects/${encodeURIComponent(projectSlug)}/tenders`,
      );
      if (!mounted.current) return;
      if (r.ok) setData(r.value);
      else setError(r.error.message);
      if (showSpinner) setIsLoading(false);
    },
    [projectSlug],
  );

  useEffect(() => {
    mounted.current = true;
    if (projectSlug) void load(true);
    return () => {
      mounted.current = false;
    };
  }, [projectSlug, load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  return { data, isLoading, isRefreshing, error, refresh };
}

// ── Detail ──────────────────────────────────────────────────────────

interface DetailHook {
  data: OwnerTenderDetailPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * Apply a decision to the underlying tender. On success, the local
   * state is replaced with the fresh row from the server (so
   * status/decidedAtIso reflect the change immediately).
   *
   * Returns the server response so the caller can surface
   * award-cascade info (rejectedIds count).
   */
  decide: (
    action: OwnerTenderAction,
    options?: { rejectOthers?: boolean },
  ) => Promise<{ ok: true; value: OwnerTenderDecisionResponse } | { ok: false; error: string }>;
}

export function useOwnerTenderDetail(tenderId: string | null): DetailHook {
  const [data, setData] = useState<OwnerTenderDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!tenderId) return;
      if (showSpinner) setIsLoading(true);
      setError(null);
      const r = await api.get<OwnerTenderDetailPayload>(
        `/api/mobile/tenders/${tenderId}/owner`,
      );
      if (!mounted.current) return;
      if (r.ok) setData(r.value);
      else setError(r.error.message);
      if (showSpinner) setIsLoading(false);
    },
    [tenderId],
  );

  useEffect(() => {
    mounted.current = true;
    if (tenderId) void load(true);
    return () => {
      mounted.current = false;
    };
  }, [tenderId, load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const decide: DetailHook["decide"] = useCallback(
    async (action, options) => {
      if (!tenderId) return { ok: false, error: "No tender selected." };
      const r = await api.post<OwnerTenderDecisionResponse>(
        `/api/mobile/tenders/${tenderId}/decision`,
        { action, rejectOthers: options?.rejectOthers },
      );
      if (!r.ok) return { ok: false, error: r.error.message };
      if (mounted.current) {
        setData({ tender: r.value.tender });
      }
      return { ok: true, value: r.value };
    },
    [tenderId],
  );

  return { data, isLoading, isRefreshing, error, refresh, decide };
}
