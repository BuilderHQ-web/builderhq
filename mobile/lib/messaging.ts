/**
 * Messaging hooks — useInbox + useThread + send/markRead actions.
 *
 * Polling cadence matches the web app:
 *   · Inbox: every 15s while focused.
 *   · Thread: every 4s while focused (more aggressive — open thread
 *     is the live surface).
 * Both pause when the screen loses focus via expo-router's
 * useFocusEffect.
 *
 * Sends are optimistic — the temp message lands in state immediately
 * with `pending: true`, then we POST and reconcile with the real row.
 * On failure we keep the temp message but mark it `pending: false` +
 * `failed: true` so the UI can surface a retry (future).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { api } from "./api";
import type {
  InboxPayload,
  MobileMessage,
  MobileThreadPayload,
} from "@/components/messaging/types";

const INBOX_POLL_MS = 15_000;
const THREAD_POLL_MS = 4_000;

// ── Inbox ───────────────────────────────────────────────────────────

interface InboxHook {
  data: InboxPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useInbox(): InboxHook {
  const [data, setData] = useState<InboxPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setIsLoading(true);
      setError(null);
      const r = await api.get<InboxPayload>("/api/mobile/conversations");
      if (!mounted.current) return;
      if (r.ok) {
        setData(r.value);
      } else {
        setError(r.error.message);
      }
      if (showSpinner) setIsLoading(false);
    },
    [],
  );

  // First mount.
  useEffect(() => {
    mounted.current = true;
    void load(true);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Polling while focused — refresh inbox every INBOX_POLL_MS so unread
  // counts + last-message previews stay current.
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => {
        if (mounted.current) void load(false);
      }, INBOX_POLL_MS);
      return () => clearInterval(id);
    }, [load]),
  );

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

// ── Thread ──────────────────────────────────────────────────────────

interface ThreadHook {
  data: MobileThreadPayload | null;
  isLoading: boolean;
  error: string | null;
  /** Optimistically send a message. Caller receives the temp id so it
   *  can keep its own optimistic state in sync if needed. */
  send: (body: string) => Promise<{ ok: boolean; error?: string }>;
  /** Mark the whole thread read up to `now`. Called on mount + focus. */
  markRead: () => Promise<void>;
  /** Soft refresh from the server (drops any optimistic-only ids). */
  refresh: () => Promise<void>;
}

export function useThread(conversationId: string | null): ThreadHook {
  const [data, setData] = useState<MobileThreadPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  // Keep our optimistic temp ids around so the polling fetcher can
  // skip displacing them until the server roundtrip lands. Stored in
  // a ref to avoid re-creating the load callback per render.
  const pendingIds = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!conversationId) return;
      if (showSpinner) setIsLoading(true);
      setError(null);
      const r = await api.get<MobileThreadPayload>(
        `/api/mobile/conversations/${conversationId}`,
      );
      if (!mounted.current) return;
      if (r.ok) {
        // Merge server messages with any still-pending temps. The
        // pending set typically empties within a second of send, but
        // poll → POST race conditions otherwise drop a fresh send.
        setData((prev) => {
          if (pendingIds.current.size === 0) return r.value;
          const pendingMsgs =
            prev?.messages.filter(
              (m) => m.pending && pendingIds.current.has(m.id),
            ) ?? [];
          return {
            ...r.value,
            messages: [...r.value.messages, ...pendingMsgs],
          };
        });
      } else {
        setError(r.error.message);
      }
      if (showSpinner) setIsLoading(false);
    },
    [conversationId],
  );

  // Boot.
  useEffect(() => {
    mounted.current = true;
    if (conversationId) void load(true);
    return () => {
      mounted.current = false;
    };
  }, [conversationId, load]);

  // Poll on focus, pause off-focus.
  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      const id = setInterval(() => {
        if (mounted.current) void load(false);
      }, THREAD_POLL_MS);
      return () => clearInterval(id);
    }, [conversationId, load]),
  );

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !conversationId || !data) {
        return { ok: false, error: "Empty message." };
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pendingIds.current.add(tempId);

      // Optimistic message — senderId is a sentinel "self" so the
      // bubble renderer can put it on the right side. The bubble
      // logic treats `senderId !== conversation.other.id` as "mine",
      // which holds for any non-`other` value including "self".
      const tempMessage: MobileMessage = {
        id: tempId,
        conversationId,
        senderId: "self",
        kind: "user",
        body: trimmed,
        tenderId: null,
        createdAtIso: new Date().toISOString(),
        editedAtIso: null,
        pending: true,
      };

      // Append optimistic to state.
      setData((prev) =>
        prev ? { ...prev, messages: [...prev.messages, tempMessage] } : prev,
      );

      const r = await api.post<{ message: MobileMessage }>(
        `/api/mobile/conversations/${conversationId}/messages`,
        { body: trimmed },
      );

      // Reconcile.
      pendingIds.current.delete(tempId);
      if (!r.ok) {
        // Drop the optimistic message on hard failure.
        setData((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((m) => m.id !== tempId),
              }
            : prev,
        );
        return { ok: false, error: r.error.message };
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              // Replace the temp row with the real one.
              messages: prev.messages
                .filter((m) => m.id !== tempId)
                .concat(r.value.message),
              conversation: {
                ...prev.conversation,
                lastMessageAtIso: r.value.message.createdAtIso,
                lastMessagePreview: r.value.message.body.slice(0, 140),
              },
            }
          : prev,
      );
      return { ok: true };
    },
    [conversationId, data],
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    const r = await api.post<{ ok: true; myLastReadAtIso: string }>(
      `/api/mobile/conversations/${conversationId}/read`,
    );
    if (!r.ok) return;
    setData((prev) =>
      prev ? { ...prev, myLastReadAtIso: r.value.myLastReadAtIso } : prev,
    );
  }, [conversationId]);

  const refresh = useCallback(async () => {
    await load(false);
  }, [load]);

  return { data, isLoading, error, send, markRead, refresh };
}
