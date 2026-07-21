"use client";

/**
 * NotificationBell — topbar widget.
 *
 * Renders the bell + unread badge, opens a dropdown with the recent
 * feed. Fetches the feed lazily on open so the topbar render stays
 * cheap; refreshes the count every 60s via a quiet polling tick.
 *
 * Click on a notification:
 *   1. mark read locally + server-side
 *   2. navigate to actionUrl in the same tab
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Tiny relative-time formatter — avoids pulling in date-fns just for this. */
function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.round(ms / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 2) return "1 min ago";
  if (m < 60) return `${m} mins ago`;
  const h = Math.round(m / 60);
  if (h < 2) return "1 hour ago";
  if (h < 24) return `${h} hours ago`;
  const d = Math.round(h / 24);
  if (d < 2) return "yesterday";
  if (d < 14) return `${d} days ago`;
  const w = Math.round(d / 7);
  if (w < 8) return `${w} weeks ago`;
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  countMyUnreadAction,
  listMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/_actions/notifications";
import type { Notification } from "@/modules/notifications";

interface Props {
  initialUnreadCount: number;
}

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({ initialUnreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const hasFetchedOnce = useRef(false);

  // Poll the unread count quietly. We don't poll the feed — that's
  // fetched on-open. POLL_INTERVAL_MS is generous on purpose; this
  // is a marketing-app, not a chat app.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const r = await countMyUnreadAction();
      if (!cancelled && r.ok) setCount(r.value);
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const refreshFeed = async () => {
    setLoading(true);
    const r = await listMyNotificationsAction({ limit: 12 });
    if (r.ok) setItems(r.value);
    setLoading(false);
  };

  // Lazy load the feed the first time the dropdown opens; refresh it
  // every subsequent open too (cheap query, < 50ms typical).
  useEffect(() => {
    if (open) {
      hasFetchedOnce.current = true;
      void refreshFeed();
    }
  }, [open]);

  const onItemClick = (n: Notification) => {
    if (!n.readAt) {
      // Optimistic local mark-read
      setItems((arr) =>
        arr ? arr.map((i) => (i.id === n.id ? { ...i, readAt: new Date() } : i)) : arr,
      );
      setCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        await markNotificationReadAction(n.id);
      });
    }
    setOpen(false);
  };

  const onMarkAll = async () => {
    setItems((arr) =>
      arr
        ? arr.map((i) => (i.readAt ? i : { ...i, readAt: new Date() }))
        : arr,
    );
    setCount(0);
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  };

  const showBadge = count > 0;
  const badgeLabel = count > 99 ? "99+" : String(count);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "relative inline-flex items-center justify-center size-8 rounded-tight border border-transparent",
          "hover:border-border-subtle hover:bg-surface-1",
          "data-[state=open]:border-border-subtle data-[state=open]:bg-surface-1",
          "transition-colors duration-[120ms] ease-[var(--ease-out)]",
          "focus:outline-none focus-visible:ring-focus",
        )}
        aria-label={
          showBadge ? `Notifications — ${count} unread` : "Notifications"
        }
      >
        <Bell className="size-4 text-text-muted" />
        {showBadge ? (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1",
              "rounded-full text-[9px] font-semibold tracking-[0.02em]",
              "bg-accent text-accent-contrast",
              "flex items-center justify-center",
              "shadow-[0_0_0_1.5px_var(--color-bg-raised),_0_0_8px_rgba(0,212,200,0.5)]",
            )}
            aria-hidden
          >
            {badgeLabel}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 max-h-[480px] overflow-hidden flex flex-col"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-[rgba(24,34,44,0.025)]">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] tracking-[0.16em] uppercase text-accent-light font-semibold">
              Notifications
            </span>
            {count > 0 ? (
              <span className="text-[11px] text-text-dim">
                {count} unread
              </span>
            ) : null}
          </div>
          {count > 0 ? (
            <button
              type="button"
              onClick={onMarkAll}
              className="text-[11px] text-text-dim hover:text-accent-light transition-colors inline-flex items-center gap-1"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          ) : null}
        </div>

        {/* Feed */}
        <div
          data-lenis-prevent
          className="overflow-y-auto flex-1 min-h-[120px]"
        >
          {loading && !items ? (
            <div className="flex items-center justify-center py-12 text-text-dim">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : !items || items.length === 0 ? (
            <EmptyState />
          ) : (
            items.map((n) => <Row key={n.id} n={n} onClick={onItemClick} />)
          )}
        </div>

        {/* Footer (placeholder for future "see all" page) */}
        <div className="px-4 py-2.5 border-t border-border-subtle text-center">
          <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim">
            Last 12 events
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Row({
  n,
  onClick,
}: {
  n: Notification;
  onClick: (n: Notification) => void;
}) {
  const unread = !n.readAt;
  const when = relativeTime(n.createdAt);
  const Wrapper = (props: { children: React.ReactNode }) =>
    n.actionUrl ? (
      <Link
        href={n.actionUrl}
        className="block"
        onClick={() => onClick(n)}
        {...props}
      >
        {props.children}
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => onClick(n)}
        className="w-full text-left"
        {...props}
      >
        {props.children}
      </button>
    );

  return (
    <Wrapper>
      <div
        className={cn(
          "px-4 py-3 border-b border-border-subtle/50 last:border-b-0",
          "hover:bg-[rgba(0,212,200,0.04)] transition-colors duration-[120ms]",
          unread ? "bg-[rgba(0,212,200,0.02)]" : "",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Unread dot */}
          <span
            className={cn(
              "size-1.5 rounded-full mt-1.5 shrink-0",
              unread
                ? "bg-accent shadow-[0_0_6px_rgba(0,212,200,0.6)]"
                : "bg-transparent",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "text-[13px] tracking-[-0.005em] leading-[1.4]",
                  unread
                    ? "text-text font-medium"
                    : "text-text-muted",
                )}
              >
                {n.title}
              </p>
              {!unread ? (
                <Check className="size-3 text-text-faint shrink-0 mt-0.5" />
              ) : null}
            </div>
            {n.body ? (
              <p className="mt-1 text-[12px] text-text-dim leading-[1.5]">
                {n.body}
              </p>
            ) : null}
            <p className="mt-1 text-[10px] tracking-[0.04em] text-text-faint">
              {when}
            </p>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="size-10 rounded-full border border-border-subtle bg-[rgba(24,34,44,0.03)] flex items-center justify-center mb-3">
        <Bell className="size-4 text-text-faint" />
      </div>
      <p className="text-[12.5px] text-text-muted">You're all caught up</p>
      <p className="mt-1 text-[11px] text-text-dim">
        Tender activity shows up here.
      </p>
    </div>
  );
}
