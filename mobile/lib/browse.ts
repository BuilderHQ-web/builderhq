/**
 * Browse-tab data hook.
 *
 * Bespoke because the dashboard's useDashboard pattern doesn't model
 * pagination or filter-driven refetches. This hook owns:
 *
 *   · The full filter state (search query, type, budgets, in-my-area
 *     toggle, exclude-full toggle).
 *   · Pagination — first page + infinite-scroll appends via loadMore().
 *   · Saved-set state — kept locally as a Set<string> so the heart
 *     icons can toggle optimistically. POST/DELETE /save reconciles
 *     server-side; if the request fails we roll back the local Set.
 *   · Search debounce — 300ms so typing doesn't fire a request per
 *     keystroke. The displayed query stays live so the input never
 *     feels laggy.
 *   · refresh() — pull-to-refresh entry point. Resets pagination.
 *
 * Two pieces of state separation worth calling out:
 *   - `queryDraft` is what the input shows; updates instantly.
 *   - `query` is what the network sees; updates 300ms after the last
 *     queryDraft change. Setting queryDraft to `""` clears immediately
 *     (no debounce on the empty-out path — clearing should feel
 *     responsive).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "./api";
import type {
  BrowseFilters,
  BrowseListItem,
  BrowsePayload,
} from "@/components/dashboard/types";

const PAGE_SIZE = 12;

type SaveState = "idle" | "saving";

interface BrowseHook {
  // Data
  items: BrowseListItem[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error: string | null;
  emptyReason: BrowsePayload["emptyReason"] | null;
  savedIds: Set<string>;
  mySavedCount: number;

  // Filter state (live)
  filters: BrowseFilters;
  queryDraft: string;
  setQueryDraft: (q: string) => void;
  setFilters: (next: BrowseFilters) => void;
  patchFilters: (patch: Partial<BrowseFilters>) => void;
  resetFilters: () => void;
  activeFilterCount: number;

  // Actions
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleSave: (slug: string, projectId: string) => Promise<void>;
}

export function useBrowse(): BrowseHook {
  const [queryDraft, setQueryDraftState] = useState("");
  const [filters, setFiltersState] = useState<BrowseFilters>({});

  const [items, setItems] = useState<BrowseListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] =
    useState<BrowsePayload["emptyReason"] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [mySavedCount, setMySavedCount] = useState(0);
  const [saveStates, setSaveStates] = useState<Map<string, SaveState>>(
    new Map(),
  );

  // Latest filters used to compose query strings — re-derived from
  // `filters` + `query` whenever either changes. Memo keeps the URL
  // stable so React doesn't re-fire identical loads.
  const queryString = useMemo(
    () => buildQueryString(filters),
    [filters],
  );

  const load = useCallback(
    async (variant: "first" | "refresh" | "more") => {
      const offset = variant === "more" && nextOffset != null ? nextOffset : 0;
      const sep = queryString ? "&" : "";
      const url = `/api/mobile/browse?limit=${PAGE_SIZE}&offset=${offset}${sep}${queryString}`;

      if (variant === "first") setIsLoading(true);
      if (variant === "refresh") setIsRefreshing(true);
      if (variant === "more") setIsLoadingMore(true);
      if (variant !== "more") setError(null);

      const r = await api.get<BrowsePayload>(url);

      if (r.ok) {
        setHasMore(r.value.hasMore);
        setNextOffset(r.value.nextOffset);
        setEmptyReason(r.value.emptyReason ?? null);
        setSavedIds(new Set(r.value.savedIds));
        setMySavedCount(r.value.mySavedCount);
        setItems((prev) =>
          variant === "more" ? prev.concat(r.value.items) : r.value.items,
        );
      } else {
        setError(r.error.message);
      }

      if (variant === "first") setIsLoading(false);
      if (variant === "refresh") setIsRefreshing(false);
      if (variant === "more") setIsLoadingMore(false);
    },
    [queryString, nextOffset],
  );

  // First load + reload on filters change. (Splitting the effect like
  // this means filters changes don't deps-chain into the loadMore
  // path that watches `nextOffset`.)
  useEffect(() => {
    void load("first");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // Debounce queryDraft → filters.q (300ms).
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setQueryDraft = useCallback((next: string) => {
    setQueryDraftState(next);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // Immediate-clear branch — empty draft cancels filter.q without
    // waiting for the 300ms beat.
    if (next === "") {
      setFiltersState((f) => {
        if (!f.q) return f;
        const { q: _, ...rest } = f;
        return rest;
      });
      return;
    }
    debounceTimer.current = setTimeout(() => {
      setFiltersState((f) => ({ ...f, q: next }));
    }, 300);
  }, []);

  const setFilters = useCallback((next: BrowseFilters) => {
    setFiltersState(next);
    setQueryDraftState(next.q ?? "");
  }, []);
  const patchFilters = useCallback((patch: Partial<BrowseFilters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
    if (patch.q !== undefined) setQueryDraftState(patch.q ?? "");
  }, []);
  const resetFilters = useCallback(() => {
    setFiltersState({});
    setQueryDraftState("");
  }, []);

  const refresh = useCallback(async () => {
    setNextOffset(null);
    await load("refresh");
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || nextOffset == null) return;
    await load("more");
  }, [hasMore, isLoadingMore, nextOffset, load]);

  /** Optimistic save toggle — flips the heart instantly, rolls back
   *  on server failure. Idempotent on both endpoints so retries are
   *  safe. */
  const toggleSave = useCallback(
    async (slug: string, projectId: string) => {
      const currentlySaved = savedIds.has(projectId);
      const nextSaved = !currentlySaved;
      const inflight = saveStates.get(projectId);
      if (inflight === "saving") return;

      // Optimistic update.
      setSaveStates((m) => new Map(m).set(projectId, "saving"));
      setSavedIds((s) => {
        const next = new Set(s);
        if (nextSaved) next.add(projectId);
        else next.delete(projectId);
        return next;
      });
      setMySavedCount((c) => Math.max(0, c + (nextSaved ? 1 : -1)));

      const url = `/api/mobile/projects/${encodeURIComponent(slug)}/save`;
      const r = nextSaved
        ? await api.post<{ ok: true; saved: true }>(url)
        : await api.del<{ ok: true; saved: false }>(url);

      // Roll back if server rejected.
      if (!r.ok) {
        setSavedIds((s) => {
          const next = new Set(s);
          if (currentlySaved) next.add(projectId);
          else next.delete(projectId);
          return next;
        });
        setMySavedCount((c) => Math.max(0, c + (currentlySaved ? 1 : -1)));
      }

      setSaveStates((m) => {
        const next = new Map(m);
        next.delete(projectId);
        return next;
      });
    },
    [savedIds, saveStates],
  );

  const activeFilterCount =
    (filters.type ? 1 : 0) +
    (filters.state ? 1 : 0) +
    (filters.budgets?.length ?? 0) +
    (filters.inMyArea ? 1 : 0) +
    (filters.excludeFull ? 1 : 0);

  return {
    items,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    emptyReason,
    savedIds,
    mySavedCount,
    filters,
    queryDraft,
    setQueryDraft,
    setFilters,
    patchFilters,
    resetFilters,
    activeFilterCount,
    refresh,
    loadMore,
    toggleSave,
  };
}

function buildQueryString(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.state) params.set("state", filters.state);
  if (filters.budgets && filters.budgets.length > 0) {
    params.set("budgets", filters.budgets.join(","));
  }
  if (filters.inMyArea) params.set("inMyArea", "1");
  if (filters.excludeFull) params.set("excludeFull", "1");
  return params.toString();
}
