"use client";

/**
 * ProjectMessagingPanel — the inline messaging surface used on project
 * detail pages. A trimmed-down sibling of <MessagesShell> that knows
 * about one specific project rather than the full inbox.
 *
 * Behaviour shapes around who's looking:
 *
 *   - Builder side: there's exactly one conversation per (project,
 *     builder). The panel renders that thread directly with no list.
 *   - Owner side: 0..N conversations (one per builder who's unlocked
 *     the project). A horizontal picker at the top of the panel lets
 *     the owner switch between builders without leaving the project
 *     page.
 *   - Empty state: friendly hint per role. Builder sees it when they
 *     haven't unlocked yet (in practice this panel won't even mount).
 *     Owner sees it when no builder has unlocked, with a nudge to
 *     share the project link.
 *
 * Reuses the same server actions as the inbox shell — getThreadAction,
 * getMessagesAction, postMessageAction, markConversationReadAction,
 * listProjectConversationsAction. Polls the message tail every 6s
 * while the panel is mounted. Optimistic sends + reconcile + rollback
 * on failure, same as the inbox.
 *
 * Rendering is a tighter version of MessagesShell's thread pane:
 * header / scrollback / composer, no list pane, no mobile back stack.
 * Visual language (system pills, user bubbles, day dividers, jump-to-
 * latest) matches the inbox so users feel they're in the same product.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDown,
  ArrowUpRight,
  Building2,
  CheckCheck,
  Hammer,
  Inbox,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { playSendSound } from "@/lib/sound";
import {
  getThreadAction,
  getMessagesAction,
  listProjectConversationsAction,
  markConversationReadAction,
  postMessageAction,
} from "@/app/(app)/_actions/messaging";
import type {
  ConversationListItem,
  Message,
} from "@/modules/messaging";

import { GROUP_WINDOW_MS, clockLabel, dayLabel } from "./utils";

const LIST_POLL_MS = 25_000;
const THREAD_POLL_MS = 6_000;

type RoleScope = "owner" | "builder";

interface Props {
  /** The project this panel is scoped to. */
  projectId: string;
  /** Whether the viewer is the project owner or a builder on the
   *  project. Drives the empty state copy + list/no-list layout. */
  scope: RoleScope;
  /** The signed-in user's id — needed for bubble alignment. */
  meId: string;
  /** Server-loaded conversation list for this project. The panel
   *  takes ownership and refreshes via polling. */
  initialConversations: ConversationListItem[];
  /** Inbox link surfaced on the empty/full state so users can jump
   *  to the full inbox when they need it. Per-role. */
  inboxHref: string;
  /** Subtle compact layout — slightly smaller paddings + a 420px
   *  message scroll height. Used when the panel sits inside an
   *  existing card column (builder detail right rail). */
  compact?: boolean;
}

export function ProjectMessagingPanel({
  projectId,
  scope,
  meId,
  initialConversations,
  inboxHref,
  compact = false,
}: Props) {
  const [convs, setConvs] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );

  // Poll the per-project conversation list every 25s so unread badges
  // stay fresh while the user is on the project page.
  const refreshList = useCallback(async () => {
    const r = await listProjectConversationsAction(projectId);
    if (r.ok) {
      setConvs(r.value);
      // If we lost the active conversation (deleted, hidden), fall
      // back to the most recent one.
      if (activeId && !r.value.find((c) => c.id === activeId)) {
        setActiveId(r.value[0]?.id ?? null);
      }
      // First conversation appeared after a builder unlocked while
      // the owner had the page open — auto-select it.
      if (!activeId && r.value.length > 0) {
        setActiveId(r.value[0]!.id);
      }
    }
  }, [projectId, activeId]);

  useEffect(() => {
    const id = setInterval(refreshList, LIST_POLL_MS);
    return () => clearInterval(id);
  }, [refreshList]);

  if (convs.length === 0) {
    return <EmptyPanel scope={scope} inboxHref={inboxHref} compact={compact} />;
  }

  return (
    <PanelShell compact={compact}>
      {scope === "owner" && convs.length > 1 ? (
        <BuilderPicker
          conversations={convs}
          activeId={activeId}
          onSelect={setActiveId}
        />
      ) : null}
      {activeId ? (
        <ThreadView
          conversationId={activeId}
          conversations={convs}
          setConvs={setConvs}
          meId={meId}
          scope={scope}
          inboxHref={inboxHref}
          compact={compact}
        />
      ) : null}
    </PanelShell>
  );
}

// ── shell ───────────────────────────────────────────────────────────────

function PanelShell({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-md border border-border-subtle",
        "bg-surface-1 card-elev",
        "shadow-[0_12px_32px_-18px_rgba(15,23,32,0.19)]",
        compact ? "min-h-[440px]" : "min-h-[520px]",
      )}
    >
      <div className="flex flex-col h-full min-h-inherit">{children}</div>
    </section>
  );
}

// ── builder picker (owner side, when multiple builders) ────────────────

function BuilderPicker({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-border-subtle/60 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-fit">
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium shrink-0">
          Builder
        </span>
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border transition-colors duration-[140ms]",
              c.id === activeId
                ? "border-border-accent bg-accent-muted/40 text-accent-light"
                : "border-border-subtle bg-[rgba(24,34,44,0.035)] text-text-muted hover:text-text hover:border-border",
            )}
          >
            <span
              className="size-6 rounded-full flex items-center justify-center text-[9.5px] font-bold border border-border-accent text-accent-light"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
              }}
            >
              {c.other.initials}
            </span>
            <span className="text-[12px] truncate max-w-[160px]">
              {c.other.displayName}
            </span>
            {c.unreadCount > 0 ? (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums">
                {c.unreadCount > 99 ? "99+" : c.unreadCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── thread view (header + scroll + composer) ───────────────────────────

function ThreadView({
  conversationId,
  conversations,
  setConvs,
  meId,
  scope,
  inboxHref,
  compact,
}: {
  conversationId: string;
  conversations: ConversationListItem[];
  setConvs: React.Dispatch<React.SetStateAction<ConversationListItem[]>>;
  meId: string;
  scope: RoleScope;
  inboxHref: string;
  compact: boolean;
}) {
  const active = conversations.find((c) => c.id === conversationId);

  const [thread, setThread] = useState<{
    conversation: ConversationListItem;
    messages: Message[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load thread + reload on conversation switch.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const r = await getThreadAction(conversationId);
      if (!cancelled && r.ok) setThread(r.value);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Poll the tail.
  useEffect(() => {
    const tick = async () => {
      const r = await getMessagesAction(conversationId);
      if (r.ok) {
        setThread((prev) =>
          prev && prev.conversation.id === conversationId
            ? { ...prev, messages: r.value }
            : prev,
        );
      }
    };
    const id = setInterval(tick, THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [conversationId]);

  // Mark read whenever we land on or refresh the thread.
  useEffect(() => {
    void markConversationReadAction(conversationId);
    setConvs((arr) =>
      arr.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }, [conversationId, thread?.messages.length, setConvs]);

  // Composer state
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const tempIdRef = useRef(0);

  const onSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);

    const tempId = `temp-${++tempIdRef.current}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      senderId: meId,
      kind: "user",
      body,
      tenderId: null,
      createdAt: new Date(),
      editedAt: null,
    } as Message;

    setThread((prev) =>
      prev && prev.conversation.id === conversationId
        ? { ...prev, messages: [...prev.messages, optimistic] }
        : prev,
    );
    setDraft("");

    const r = await postMessageAction(conversationId, body);
    if (r.ok) {
      playSendSound();
      setThread((prev) =>
        prev && prev.conversation.id === conversationId
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === tempId ? r.value : m,
              ),
            }
          : prev,
      );
      // Bubble the new preview/timestamp into the parent conversation
      // list so the builder picker stays in sync without a reload.
      setConvs((arr) =>
        arr.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessageAt: r.value.createdAt,
                lastMessagePreview: body.slice(0, 140),
              }
            : c,
        ),
      );
    } else {
      setThread((prev) =>
        prev && prev.conversation.id === conversationId
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== tempId),
            }
          : prev,
      );
      setDraft(body);
      toast.error("Couldn't send", r.error.message);
    }
    setSending(false);
  }, [conversationId, draft, meId, sending, setConvs]);

  return (
    <>
      <ThreadHeader conv={active ?? null} scope={scope} inboxHref={inboxHref} />
      <MessageScroll
        messages={thread?.messages ?? []}
        meId={meId}
        loading={loading}
        compact={compact}
      />
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={onSend}
        sending={sending}
      />
    </>
  );
}

// ── header ──────────────────────────────────────────────────────────────

function ThreadHeader({
  conv,
  scope,
  inboxHref,
}: {
  conv: ConversationListItem | null;
  scope: RoleScope;
  inboxHref: string;
}) {
  if (!conv) {
    return (
      <header className="px-5 py-3.5 border-b border-border-subtle bg-surface-2">
        <div className="flex items-center gap-2 text-text-dim">
          <MessageSquare className="size-3.5" />
          <span className="text-[12px]">Messaging</span>
        </div>
      </header>
    );
  }
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
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-surface-2">
      <span
        className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {conv.other.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13.5px] font-medium text-text">
            {conv.other.displayName}
          </p>
          {otherRoleLabel}
        </div>
        <p className="text-[10.5px] text-text-dim mt-0.5 inline-flex items-center gap-1">
          <Building2 className="size-3" />
          <span className="truncate max-w-[40ch]">{conv.projectTitle}</span>
        </p>
      </div>
      <Link
        href={inboxHref}
        className="inline-flex items-center gap-1 text-[11px] text-text-dim hover:text-accent-light transition-colors shrink-0"
        title="Open full inbox"
        // scope param is surfaced for future role-aware behaviour
        // (e.g. archive button only on owner side); intentionally
        // unused in this render path today.
        data-scope={scope}
      >
        Inbox
        <ArrowUpRight className="size-3" />
      </Link>
    </header>
  );
}

// ── scroll ──────────────────────────────────────────────────────────────

function MessageScroll({
  messages,
  meId,
  loading,
  compact,
}: {
  messages: Message[];
  meId: string;
  loading: boolean;
  compact: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastCount = useRef(messages.length);
  const [showJump, setShowJump] = useState(false);
  const [newSinceScroll, setNewSinceScroll] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isFresh = messages.length > lastCount.current;
    const arrivedCount = messages.length - lastCount.current;
    lastCount.current = messages.length;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (isFresh && distFromBottom < 80) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (!isFresh) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
      setNewSinceScroll(0);
    } else if (isFresh && arrivedCount > 0) {
      setNewSinceScroll((n) => n + arrivedCount);
    }
  }, [messages]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
        const farUp = dist > 120;
        setShowJump(farUp);
        if (!farUp) setNewSinceScroll(0);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const jumpToLatest = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setNewSinceScroll(0);
  };

  return (
    <div
      className={cn(
        "relative flex-1 min-h-0",
        compact ? "h-[300px]" : "h-[360px]",
      )}
    >
      <div
        ref={ref}
        data-lenis-prevent
        className="absolute inset-0 overflow-y-auto px-4 py-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(0,212,200,0.025), transparent 55%)",
        }}
      >
        <div className="mx-auto max-w-[640px] flex flex-col gap-1">
          {loading ? (
            <div className="text-center text-text-dim py-12">
              <Loader2 className="size-5 animate-spin mx-auto" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-text-dim py-12">
              <p className="text-[13px]">Send the first message.</p>
            </div>
          ) : (
            renderMessages(messages, meId)
          )}
        </div>
      </div>

      <AnimatePresence>
        {showJump ? (
          <motion.button
            type="button"
            onClick={jumpToLatest}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.2, 0.65, 0.3, 0.9] }}
            className={cn(
              "absolute bottom-3 left-1/2 -translate-x-1/2",
              "inline-flex items-center gap-1.5 px-3 h-8 rounded-full",
              "bg-accent text-accent-contrast text-[11.5px] font-semibold tracking-[0.04em]",
              "hover:bg-accent-hover transition-colors duration-[140ms]",
              "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]",
            )}
          >
            <ArrowDown className="size-3" />
            {newSinceScroll > 0 ? `${newSinceScroll} new` : "Latest"}
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

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
    <div className="my-3 flex items-center gap-3">
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
    <div className="my-2 flex justify-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle bg-[rgba(0,212,200,0.06)] text-[11px] text-accent-light max-w-[90%]">
        <Sparkles className="size-3 shrink-0" />
        <span className="truncate">{message.body}</span>
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
            "px-3.5 py-2.5 text-[13px] leading-[1.5] tracking-[-0.005em]",
            "whitespace-pre-wrap break-words",
            mine
              ? "bg-accent text-accent-contrast"
              : "bg-surface-1 text-text border border-border-subtle/70",
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
            "flex items-center gap-1 mt-0.5 px-1 text-[9.5px] tracking-[0.04em]",
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

// ── composer ────────────────────────────────────────────────────────────

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
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 136) + "px";
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const empty = value.trim().length === 0;
  return (
    <div className="border-t border-border-subtle bg-[linear-gradient(180deg,rgba(250,248,243,0.4),rgba(250,248,243,0.85))] backdrop-blur-sm">
      <div className="px-4 py-3">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-border-subtle bg-[rgba(24,34,44,0.04)] p-1.5",
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
              "px-2 py-1.5 text-[13px] leading-[1.5] tracking-[-0.005em]",
              "text-text placeholder:text-text-dim/70",
              "max-h-[136px] overflow-y-auto focus-visible:shadow-none",
            )}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={empty || sending}
            aria-label="Send message"
            className={cn(
              "size-8 rounded-full flex items-center justify-center shrink-0",
              "transition-all duration-[140ms]",
              empty || sending
                ? "bg-surface-2 text-text-dim cursor-not-allowed"
                : "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_4px_16px_-6px_rgba(0,212,200,0.55)]",
            )}
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </button>
        </div>
        <div className="mt-1 px-1 text-[9.5px] tracking-[0.04em] text-text-faint">
          <kbd className="font-mono">Enter</kbd> send ·{" "}
          <kbd className="font-mono">Shift+Enter</kbd> new line
        </div>
      </div>
    </div>
  );
}

// ── empty state ────────────────────────────────────────────────────────

function EmptyPanel({
  scope,
  inboxHref,
  compact,
}: {
  scope: RoleScope;
  inboxHref: string;
  compact: boolean;
}) {
  return (
    <PanelShell compact={compact}>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <div
          className="size-14 rounded-full border border-border-subtle flex items-center justify-center mb-4"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(0,212,200,0.16), rgba(24,34,44,0.03))",
          }}
        >
          <Inbox className="size-5 text-accent-light" />
        </div>
        <h3 className="font-display uppercase tracking-[-0.012em] text-[18px] leading-[1.05] text-text">
          {scope === "owner" ? "No builder conversations yet" : "No messages yet"}
        </h3>
        <p className="mt-2 text-[12.5px] text-text-muted leading-[1.6] max-w-[40ch]">
          {scope === "owner"
            ? "The moment a builder unlocks this project, your conversation with them will appear here. You can chat about scope, clarifications, and timing without leaving this page."
            : "You haven't sent a message on this project yet. Once you unlock or submit a tender, you can talk to the owner directly here."}
        </p>
        <Link
          href={inboxHref}
          className="mt-5 inline-flex items-center gap-1.5 text-[11.5px] text-accent-light hover:text-accent transition-colors"
        >
          Open full inbox
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </PanelShell>
  );
}

// Compact preview row — used inside small cards (e.g. tender awarded
// banner) where there's no room for a full thread but we still want to
// surface "you can message the owner here" affordance.

export function ProjectMessagingShortcut({
  projectSlug,
  scope,
  unreadCount = 0,
  label,
}: {
  projectSlug: string;
  scope: RoleScope;
  unreadCount?: number;
  label?: string;
}) {
  const href =
    scope === "owner"
      ? `/owner/projects/${projectSlug}#messaging`
      : `/builder/projects/${projectSlug}#messaging`;
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 h-9 px-3.5 rounded-full border transition-colors duration-[140ms]",
        unreadCount > 0
          ? "border-border-accent bg-accent-muted/40 text-accent-light hover:bg-accent-muted/70"
          : "border-border-subtle text-text-muted hover:text-text hover:border-border",
      )}
    >
      <MessageSquare className="size-3.5" />
      <span className="text-[12px] font-medium">
        {label ?? "Open conversation"}
      </span>
      {unreadCount > 0 ? (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
      <ArrowUpRight className="size-3 opacity-60 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// Re-export so direct callers (project pages) can type their props
// without reaching into the messaging module.
export type { ConversationListItem };

/** Pure helper — total unread across a conversation list. */
export function totalUnread(convs: ConversationListItem[]): number {
  return convs.reduce((s, c) => s + c.unreadCount, 0);
}
