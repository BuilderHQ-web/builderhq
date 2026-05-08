"use client";

/**
 * MessagesShell — top-level messaging UI.
 *
 * Two-pane layout:
 *   ┌──────────────┬──────────────────────────────────────────┐
 *   │ list panel   │ thread (header / scrollback / composer)  │
 *   └──────────────┴──────────────────────────────────────────┘
 *
 * State machine:
 *   conversations  — server-loaded once, soft-refreshed every 20s
 *   activeId       — driven by URL (?c=<id>) so deep links + back
 *                    button work
 *   activeThread   — server-loaded on activeId change, polled while
 *                    visible at THREAD_POLL_MS
 *
 * Posting is optimistic: we append a temp message immediately, swap
 * for the real row when the server returns. Failed sends roll the
 * temp message back and show an error toast.
 *
 * The whole component is one file because the panes share enough state
 * (active id, optimistic queue, polling refs) that splitting them
 * makes prop-drilling annoying. Components inside are private — only
 * MessagesShell is exported.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CheckCheck,
  ExternalLink,
  Hammer,
  Inbox,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getThreadAction,
  getMessagesAction,
  listMyConversationsAction,
  markConversationReadAction,
  postMessageAction,
} from "@/app/(app)/_actions/messaging";
import type {
  ConversationListItem,
  Message,
} from "@/modules/messaging";

import {
  GROUP_WINDOW_MS,
  clockLabel,
  dayLabel,
  previewLabel,
} from "./utils";

const LIST_POLL_MS = 25_000;
const THREAD_POLL_MS = 6_000;

type RoleScope = "owner" | "builder";

interface Props {
  /** Caller-side role — used for sub-labels and the empty-state copy. */
  scope: RoleScope;
  initialConversations: ConversationListItem[];
  /** When the URL ?c=<id> matches an existing conversation, load it
   *  alongside the list to avoid a flash. */
  initialActiveId: string | null;
  initialActiveThread:
    | { conversation: ConversationListItem; messages: Message[] }
    | null;
  /** The signed-in user's id — needed to decide bubble alignment. */
  meId: string;
}

export function MessagesShell({
  scope,
  initialConversations,
  initialActiveId,
  initialActiveThread,
  meId,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();

  // ── conversations list ───────────────────────────────────────────────
  const [convs, setConvs] = useState(initialConversations);

  const refreshList = useCallback(async () => {
    const r = await listMyConversationsAction();
    if (r.ok) setConvs(r.value);
  }, []);

  // Soft poll the list — keeps unread counts + ordering fresh while the
  // user has the messages page open. Cheap query (single join + group).
  useEffect(() => {
    const id = setInterval(refreshList, LIST_POLL_MS);
    return () => clearInterval(id);
  }, [refreshList]);

  // ── active thread (driven by ?c=<id>) ────────────────────────────────
  const activeId = search.get("c") ?? initialActiveId;
  const [thread, setThread] = useState<
    { conversation: ConversationListItem; messages: Message[] } | null
  >(initialActiveThread);
  const [threadLoading, setThreadLoading] = useState(false);

  const setActive = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(search);
      if (id) params.set("c", id);
      else params.delete("c");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, search],
  );

  const loadThread = useCallback(async (id: string) => {
    const r = await getThreadAction(id);
    if (r.ok) setThread(r.value);
  }, []);

  // First load when activeId changes
  useEffect(() => {
    if (!activeId) {
      setThread(null);
      return;
    }
    if (thread?.conversation.id === activeId) return;
    setThreadLoading(true);
    loadThread(activeId).finally(() => setThreadLoading(false));
  }, [activeId, loadThread, thread?.conversation.id]);

  // Mark the active thread read whenever it loads or the user comes
  // back to the tab. Server clears the per-side last_read pointer.
  useEffect(() => {
    if (!activeId) return;
    void markConversationReadAction(activeId);
    // Optimistic local clear so the unread badge in the list flips
    // instantly — list refresh would correct it eventually anyway.
    setConvs((arr) =>
      arr.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
    );
  }, [activeId, thread?.messages.length]);

  // Poll the active thread for new messages
  useEffect(() => {
    if (!activeId) return;
    const tick = async () => {
      const r = await getMessagesAction(activeId);
      if (r.ok) {
        setThread((prev) =>
          prev && prev.conversation.id === activeId
            ? { ...prev, messages: r.value }
            : prev,
        );
      }
    };
    const id = setInterval(tick, THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [activeId]);

  // ── composer (managed up here so the thread pane can render the
  //    optimistic temp message inline) ───────────────────────────────────
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const tempIdRef = useRef(0);
  const onSend = useCallback(async () => {
    if (!activeId) return;
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);

    // Optimistic append
    const tempId = `temp-${++tempIdRef.current}`;
    const optimistic: Message = {
      id: tempId,
      conversationId: activeId,
      senderId: meId,
      kind: "user",
      body,
      tenderId: null,
      createdAt: new Date(),
      editedAt: null,
    } as Message;
    setThread((prev) =>
      prev && prev.conversation.id === activeId
        ? { ...prev, messages: [...prev.messages, optimistic] }
        : prev,
    );
    setDraft("");

    const r = await postMessageAction(activeId, body);
    if (r.ok) {
      // Reconcile: replace temp with real row
      setThread((prev) =>
        prev && prev.conversation.id === activeId
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === tempId ? r.value : m,
              ),
            }
          : prev,
      );
      // Update list preview optimistically
      setConvs((arr) =>
        arr
          .map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  lastMessageAt: r.value.createdAt,
                  lastMessagePreview: body.slice(0, 140),
                }
              : c,
          )
          .sort((a, b) => {
            const ta = a.lastMessageAt
              ? new Date(a.lastMessageAt).getTime()
              : 0;
            const tb = b.lastMessageAt
              ? new Date(b.lastMessageAt).getTime()
              : 0;
            return tb - ta;
          }),
      );
    } else {
      // Rollback temp + restore draft
      setThread((prev) =>
        prev && prev.conversation.id === activeId
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== tempId),
            }
          : prev,
      );
      setDraft(body);
      // eslint-disable-next-line no-alert
      alert(r.error.message);
    }
    setSending(false);
  }, [activeId, draft, sending, meId]);

  // ── render ───────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100dvh-3.5rem)] flex bg-bg">
      {/* Mobile: only show one pane at a time. Desktop: both. */}
      <ListPane
        scope={scope}
        items={convs}
        activeId={activeId}
        onSelect={setActive}
        className={cn(
          "border-r border-border-subtle bg-bg-deep/40",
          "w-full md:w-[360px] md:shrink-0",
          activeId ? "hidden md:flex" : "flex",
        )}
      />
      <ThreadPane
        scope={scope}
        meId={meId}
        thread={thread}
        loading={threadLoading}
        draft={draft}
        sending={sending}
        onDraftChange={setDraft}
        onSend={onSend}
        onBack={() => setActive(null)}
        className={cn(
          "flex-1 min-w-0",
          activeId ? "flex" : "hidden md:flex",
        )}
      />
    </div>
  );
}

// ── List pane ───────────────────────────────────────────────────────────

function ListPane({
  scope,
  items,
  activeId,
  onSelect,
  className,
}: {
  scope: RoleScope;
  items: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter(
      (c) =>
        c.other.displayName.toLowerCase().includes(needle) ||
        c.projectTitle.toLowerCase().includes(needle) ||
        (c.lastMessagePreview ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  const totalUnread = items.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <aside className={cn("flex-col min-h-0", className)}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-border-subtle">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
              <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
              Inbox
            </span>
            <h1 className="mt-1.5 font-display uppercase tracking-[-0.018em] text-[28px] leading-[0.95] text-text">
              Messages
            </h1>
          </div>
          {totalUnread > 0 ? (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-2 rounded-full bg-accent text-accent-contrast text-[11px] font-semibold tabular-nums">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          ) : null}
        </div>

        <div className="mt-4 relative">
          <Search className="size-3.5 text-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages"
            className={cn(
              "w-full h-9 pl-9 pr-3 rounded-md border border-border-subtle",
              "bg-[rgba(255,255,255,0.025)] text-[12.5px] text-text",
              "placeholder:text-text-dim/70",
              "focus:outline-none focus:border-border-accent focus:bg-[rgba(0,212,200,0.025)]",
              "transition-colors duration-[120ms]",
              "focus-visible:shadow-none",
            )}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <ListEmpty scope={scope} hasItems={items.length > 0} query={q} />
        ) : (
          filtered.map((c) => (
            <ListItem
              key={c.id}
              item={c}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ListItem({
  item,
  active,
  onClick,
}: {
  item: ConversationListItem;
  active: boolean;
  onClick: () => void;
}) {
  const unread = item.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left flex items-stretch gap-3 px-4 py-3.5 border-b border-border-subtle/40",
        "transition-colors duration-[140ms]",
        active
          ? "bg-[rgba(0,212,200,0.07)]"
          : "hover:bg-[rgba(255,255,255,0.022)]",
      )}
    >
      {/* Active accent bar */}
      <span
        aria-hidden
        className={cn(
          "w-[3px] -my-3.5 rounded-r-full transition-colors",
          active
            ? "bg-accent shadow-[0_0_10px_rgba(0,212,200,0.5)]"
            : "bg-transparent",
        )}
      />
      <Avatar initials={item.other.initials} unread={unread} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-[13.5px] tracking-[-0.005em]",
              unread || active
                ? "text-text font-medium"
                : "text-text-muted",
            )}
          >
            {item.other.displayName}
          </p>
          <span
            className={cn(
              "shrink-0 text-[10.5px] tracking-[0.04em]",
              unread ? "text-accent" : "text-text-faint",
            )}
          >
            {previewLabel(item.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "truncate text-[12px] leading-[1.45]",
              unread ? "text-text-muted" : "text-text-dim",
            )}
          >
            {item.lastMessagePreview ?? (
              <span className="text-text-faint italic">No messages yet</span>
            )}
          </p>
          {unread ? (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[10.5px] tracking-[0.04em] text-text-faint truncate inline-flex items-center gap-1">
          <Building2 className="size-3" />
          {item.projectTitle}
        </p>
      </div>
    </button>
  );
}

function ListEmpty({
  scope,
  hasItems,
  query,
}: {
  scope: RoleScope;
  hasItems: boolean;
  query: string;
}) {
  if (hasItems && query) {
    return (
      <div className="flex flex-col items-center text-center px-6 py-12 text-text-dim">
        <Search className="size-5 mb-2 text-text-faint" />
        <p className="text-[13px]">No conversations match "{query}".</p>
      </div>
    );
  }
  const hint =
    scope === "builder"
      ? "Unlock a project and you'll automatically connect with the owner here."
      : "Once a builder unlocks one of your projects, the conversation lands here.";
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="size-12 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.018)] flex items-center justify-center mb-4">
        <Inbox className="size-5 text-text-faint" />
      </div>
      <p className="text-[14px] text-text-muted">No conversations yet</p>
      <p className="mt-1 text-[12px] text-text-dim leading-[1.55] max-w-[260px]">
        {hint}
      </p>
    </div>
  );
}

// ── Thread pane ─────────────────────────────────────────────────────────

function ThreadPane({
  scope,
  meId,
  thread,
  loading,
  draft,
  sending,
  onDraftChange,
  onSend,
  onBack,
  className,
}: {
  scope: RoleScope;
  meId: string;
  thread:
    | { conversation: ConversationListItem; messages: Message[] }
    | null;
  loading: boolean;
  draft: string;
  sending: boolean;
  onDraftChange: (s: string) => void;
  onSend: () => void;
  onBack: () => void;
  className?: string;
}) {
  if (!thread && !loading) {
    return <ThreadEmpty scope={scope} className={className} />;
  }

  return (
    <section className={cn("flex-col min-h-0", className)}>
      {thread ? (
        <>
          <ThreadHeader
            conv={thread.conversation}
            scope={scope}
            onBack={onBack}
          />
          <MessageScroll messages={thread.messages} meId={meId} />
          <Composer
            value={draft}
            onChange={onDraftChange}
            onSend={onSend}
            sending={sending}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-dim">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </section>
  );
}

function ThreadEmpty({
  scope,
  className,
}: {
  scope: RoleScope;
  className?: string;
}) {
  return (
    <section
      className={cn("flex-col min-h-0 items-center justify-center", className)}
    >
      <div className="text-center px-6 max-w-[420px]">
        <div className="mx-auto size-14 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.018)] flex items-center justify-center mb-5">
          <MessageSquare className="size-6 text-accent" />
        </div>
        <h2 className="font-display uppercase tracking-[-0.012em] text-[24px] leading-[1.05] text-text">
          Pick a conversation
        </h2>
        <p className="mt-2 text-[13px] text-text-muted leading-[1.6]">
          {scope === "builder"
            ? "Each project you unlock starts a chat with the owner. Pick one from the left to keep talking."
            : "When a builder unlocks one of your projects, that thread lands on the left. Open it to chat."}
        </p>
      </div>
    </section>
  );
}

function ThreadHeader({
  conv,
  scope,
  onBack,
}: {
  conv: ConversationListItem;
  scope: RoleScope;
  onBack: () => void;
}) {
  // Owner viewing the thread → "Builder · Synergy"; builder viewing → "Owner · …"
  const otherRoleLabel =
    conv.other.role === "builder" ? (
      <span className="inline-flex items-center gap-1 text-[10.5px] tracking-[0.16em] uppercase text-text-dim">
        <Hammer className="size-3" />
        Builder
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10.5px] tracking-[0.16em] uppercase text-text-dim">
        <Building2 className="size-3" />
        Project owner
      </span>
    );
  const projectHref =
    scope === "builder"
      ? `/builder/projects/${conv.projectSlug}`
      : `/owner/projects/${conv.projectSlug}`;

  return (
    <header className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.5))]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to inbox"
        className="md:hidden size-8 rounded-md hover:bg-surface-1 flex items-center justify-center text-text-muted"
      >
        <ArrowUpRight className="size-4 -rotate-180" />
      </button>
      <Avatar initials={conv.other.initials} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-medium text-text">
            {conv.other.displayName}
          </p>
          {otherRoleLabel}
        </div>
        <Link
          href={projectHref}
          className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-text-dim hover:text-accent-light transition-colors"
        >
          <Building2 className="size-3" />
          <span className="truncate max-w-[40ch]">{conv.projectTitle}</span>
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </header>
  );
}

// ── Message scroll ──────────────────────────────────────────────────────

function MessageScroll({
  messages,
  meId,
}: {
  messages: Message[];
  meId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastCount = useRef(messages.length);

  // Stick to bottom when new messages arrive — but only if the user
  // wasn't scrolled up reading older messages. We detect "near
  // bottom" with a 80px threshold.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isFresh = messages.length > lastCount.current;
    lastCount.current = messages.length;
    const distFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (isFresh && distFromBottom < 80) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (!isFresh) {
      // Initial mount — jump to bottom with no smoothing.
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto px-4 sm:px-8 py-6"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(0,212,200,0.025), transparent 55%)",
      }}
    >
      <div className="mx-auto max-w-[760px] flex flex-col gap-1">
        {messages.length === 0 ? (
          <div className="text-center text-text-dim py-12">
            <p className="text-[13px]">Send the first message.</p>
          </div>
        ) : (
          renderMessages(messages, meId)
        )}
      </div>
    </div>
  );
}

/**
 * Render messages with date dividers and visual grouping. Pure
 * function — no state. Returns JSX nodes for the parent to spread.
 */
function renderMessages(messages: Message[], meId: string) {
  const out: React.ReactNode[] = [];
  let lastDayKey = "";
  let prev: Message | null = null;

  for (const m of messages) {
    const at = new Date(m.createdAt);
    const dayKey = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
    if (dayKey !== lastDayKey) {
      out.push(<DayDivider key={`d-${dayKey}`} label={dayLabel(at)} />);
      lastDayKey = dayKey;
      prev = null;
    }

    if (m.kind === "system") {
      out.push(<SystemPill key={m.id} message={m} />);
      prev = m;
      continue;
    }

    const sameRun =
      prev &&
      prev.kind === "user" &&
      prev.senderId === m.senderId &&
      at.getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;

    out.push(
      <UserBubble
        key={m.id}
        message={m}
        mine={m.senderId === meId}
        groupedTop={!!sameRun}
      />,
    );
    prev = m;
  }
  return out;
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="flex-1 h-px bg-border-subtle/60" />
      <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-medium">
        {label}
      </span>
      <span className="flex-1 h-px bg-border-subtle/60" />
    </div>
  );
}

function SystemPill({ message }: { message: Message }) {
  return (
    <div className="my-3 flex justify-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle bg-[rgba(0,212,200,0.06)] text-[11.5px] text-accent-light">
        <Sparkles className="size-3" />
        <span>{message.body}</span>
      </div>
    </div>
  );
}

function UserBubble({
  message,
  mine,
  groupedTop,
}: {
  message: Message;
  mine: boolean;
  groupedTop: boolean;
}) {
  const at = new Date(message.createdAt);
  const isTemp = String(message.id).startsWith("temp-");
  return (
    <div
      className={cn(
        "flex w-full",
        mine ? "justify-end" : "justify-start",
        groupedTop ? "mt-0.5" : "mt-2",
      )}
    >
      <div
        className={cn(
          "flex flex-col max-w-[78%] sm:max-w-[68%]",
          mine ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "px-3.5 py-2.5 text-[13.5px] leading-[1.5] tracking-[-0.005em]",
            "whitespace-pre-wrap break-words",
            mine
              ? "bg-accent text-accent-contrast"
              : "bg-surface-1 text-text border border-border-subtle/70",
            // Bubble corners — squared off on the grouped side so a
            // run reads as one unit.
            mine
              ? groupedTop
                ? "rounded-2xl rounded-tr-md"
                : "rounded-2xl rounded-br-md"
              : groupedTop
                ? "rounded-2xl rounded-tl-md"
                : "rounded-2xl rounded-bl-md",
            isTemp && "opacity-70",
          )}
        >
          {message.body}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 mt-1 px-1 text-[10px] tracking-[0.04em]",
            mine ? "text-text-dim" : "text-text-faint",
          )}
        >
          <span>{clockLabel(at)}</span>
          {mine ? (
            isTemp ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCheck className="size-3" />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Composer ────────────────────────────────────────────────────────────

function Composer({
  value,
  onChange,
  onSend,
  sending,
}: {
  value: string;
  onChange: (s: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to ~6 lines, then scroll inside the textarea.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const empty = value.trim().length === 0;
  return (
    <div className="border-t border-border-subtle bg-[linear-gradient(180deg,rgba(6,18,30,0.4),rgba(6,18,30,0.85))] backdrop-blur-sm">
      <div className="mx-auto max-w-[760px] px-4 sm:px-8 py-4">
        <div
          className={cn(
            "flex items-end gap-2.5 rounded-2xl border border-border-subtle bg-[rgba(255,255,255,0.025)] p-2",
            "focus-within:border-border-accent focus-within:bg-[rgba(0,212,200,0.04)]",
            "transition-colors duration-[160ms]",
          )}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent border-0 outline-none",
              "px-2 py-1.5 text-[13.5px] leading-[1.5] tracking-[-0.005em]",
              "text-text placeholder:text-text-dim/70",
              "max-h-[168px] overflow-y-auto",
              "focus-visible:shadow-none",
            )}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={empty || sending}
            aria-label="Send message"
            className={cn(
              "size-9 rounded-full flex items-center justify-center shrink-0",
              "transition-all duration-[140ms]",
              empty || sending
                ? "bg-surface-2 text-text-dim cursor-not-allowed"
                : "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_4px_16px_-6px_rgba(0,212,200,0.55)]",
            )}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[10px] tracking-[0.04em] text-text-faint flex items-center gap-3">
          <span>
            <kbd className="font-mono text-[10px]">Enter</kbd> to send ·
            <kbd className="font-mono text-[10px] ml-1">Shift+Enter</kbd> for
            new line
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Avatar primitive ────────────────────────────────────────────────────

function Avatar({
  initials,
  size = "sm",
  unread = false,
}: {
  initials: string;
  size?: "sm" | "md";
  unread?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full font-ui font-semibold tracking-[0.02em] flex items-center justify-center",
        size === "sm" ? "size-9 text-[12px]" : "size-10 text-[12.5px]",
        unread
          ? "bg-[linear-gradient(135deg,rgba(0,212,200,0.85),rgba(26,95,212,0.7))] text-accent-contrast shadow-[0_0_0_2px_rgba(0,212,200,0.3),_0_0_18px_rgba(0,212,200,0.35)]"
          : "bg-surface-1 text-text-muted border border-border-subtle/80",
      )}
    >
      <span>{initials}</span>
    </div>
  );
}

