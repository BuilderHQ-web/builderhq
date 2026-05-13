/**
 * Dashboard data hooks — fetch + cache + refresh state for the role-
 * specific home screens.
 *
 * Why bespoke instead of swr / react-query: we ship a single fetch
 * per screen, the refresh story is pull-to-refresh + screen-focus
 * (not background revalidation), and we want zero extra runtime cost
 * on cold boot. A tiny useState + useCallback hook covers it.
 *
 * The hook exposes the four pieces every dashboard screen needs:
 *   · data       — the JSON payload (null until first success)
 *   · isLoading  — true on first load; false on subsequent refetches
 *                  (use `refreshing` flag from RefreshControl for the
 *                  pull-to-refresh spinner instead)
 *   · error      — human-readable message; null when fine
 *   · refetch()  — re-run the fetch; resolves when the network settles
 *
 * Auto-refresh on focus: when the user returns to a dashboard screen
 * (after viewing a project, sending a message, etc.) we re-fetch
 * silently so counters reflect any changes. Implemented via expo-
 * router's useFocusEffect — fires once per focus, not on every render.
 */
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { api } from "./api";
import type {
  OwnerDashboardPayload,
  ProjectDetailPayload,
} from "@/components/dashboard/types";

interface DashboardState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useDashboard<T>(path: string): DashboardState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showSpinner: boolean) => {
      // Empty path = "no resource yet" — common during expo-router
      // param settling. Skip the fetch but don't tear down state.
      if (!path) {
        if (showSpinner) setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      setError(null);
      const r = await api.get<T>(path);
      if (r.ok) {
        setData(r.value);
      } else {
        // 403 means the user's role doesn't match this dashboard. Surface
        // the message; the calling screen decides whether to swap to the
        // other dashboard or show the error.
        setError(r.error.message);
      }
      if (showSpinner) setLoading(false);
    },
    [path],
  );

  // First mount.
  useEffect(() => {
    void load(true);
  }, [load]);

  // Silent refresh whenever the screen regains focus — e.g. user
  // visited a project detail and is now back on the dashboard.
  useFocusEffect(
    useCallback(() => {
      // Skip first focus (load already running from useEffect).
      let cancelled = false;
      const t = setTimeout(() => {
        if (!cancelled && data !== null) void load(false);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const refetch = useCallback(async () => {
    await load(false);
  }, [load]);

  return { data, isLoading, error, refetch };
}

export function useOwnerDashboard() {
  return useDashboard<OwnerDashboardPayload>("/api/mobile/dashboard/owner");
}

export function useProjectDetail(slug: string | null) {
  // Empty slug → null path keeps the hook a no-op while expo-router is
  // settling params on first frame.
  return useDashboard<ProjectDetailPayload>(
    slug ? `/api/mobile/projects/${encodeURIComponent(slug)}` : "",
  );
}
