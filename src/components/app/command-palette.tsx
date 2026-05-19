"use client";

/**
 * CommandPalette — ⌘K / Ctrl+K spotlight.
 *
 * Opens a modal with a search input and a grouped list of commands.
 * Every keyboard interaction is the one users expect:
 *
 *   ⌘K / Ctrl+K   open / close
 *   /             focus the input from anywhere (when closed)
 *   ↑ ↓           move selection
 *   Enter         run selected
 *   Esc           close
 *   Tab           move selection forward (alias for ↓)
 *
 * Commands are static for now — navigation shortcuts + a couple of
 * primary actions, role-scoped. Recent items + search across projects
 * / tenders / builders comes when there's enough data to warrant it.
 *
 * The component is mounted once at the (app) layout level. A small
 * imperative API (`window` event) lets the topbar's search button
 * also open it without prop-drilling.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Building2,
  ClipboardList,
  Compass,
  CornerDownLeft,
  FileSpreadsheet,
  Folders,
  Hammer,
  House,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Role = "project_owner" | "builder" | "admin";

interface Command {
  id: string;
  label: string;
  /** Free-form search hints — appears in the haystack but not visible. */
  keywords?: string;
  href?: string;
  onRun?: () => void;
  icon: LucideIcon;
  /** Group label shown above; commands in the same group are listed together. */
  group: "Go to" | "Actions" | "Help";
  /** Roles that see this command. Empty = all roles. */
  roles?: Role[];
  /** Right-aligned helper text (e.g. shortcut hint). */
  hint?: string;
}

/**
 * Imperatively open the palette from anywhere — used by the topbar
 * search button + future spots. Listens for a `bhq:cmdk:open` event.
 */
export function openCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("bhq:cmdk:open"));
}

interface Props {
  role: Role;
}

export function CommandPalette({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── command index ────────────────────────────────────────────────
  const all = useMemo(() => commandsForRole(role), [role]);

  // ── filter ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => {
      const hay = `${c.label} ${c.keywords ?? ""} ${c.group}`.toLowerCase();
      // Subsequence fuzzy: every char of q appears in hay in order.
      let i = 0;
      for (const ch of hay) {
        if (ch === q[i]) i++;
        if (i === q.length) return true;
      }
      return hay.includes(q);
    });
  }, [all, query]);

  // ── group + flatten for keyboard nav ─────────────────────────────
  const groups = useMemo(() => {
    const m = new Map<string, Command[]>();
    for (const c of filtered) {
      const arr = m.get(c.group) ?? [];
      arr.push(c);
      m.set(c.group, arr);
    }
    // Stable order: Go to, Actions, Help
    const order: Command["group"][] = ["Go to", "Actions", "Help"];
    return order
      .map((g) => ({ group: g, items: m.get(g) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Reset selection when filter changes.
  useEffect(() => {
    setActive(0);
  }, [query, open]);

  // Keep selected item scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // ── open/close handlers ───────────────────────────────────────────
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const run = useCallback(
    (cmd: Command) => {
      close();
      if (cmd.onRun) cmd.onRun();
      else if (cmd.href) router.push(cmd.href);
    },
    [close, router],
  );

  // Global ⌘K + imperative open event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && k === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // "/" focuses the palette when nothing else is typing
      if (
        k === "/" &&
        !mod &&
        !open &&
        document.activeElement instanceof Element &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
        !(document.activeElement as HTMLElement).isContentEditable
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bhq:cmdk:open", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bhq:cmdk:open", onOpen as EventListener);
    };
  }, [open]);

  // Focus input on open.
  useEffect(() => {
    if (open) {
      // Slight delay so the dialog has committed before we yank focus.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ── per-key behaviour ─────────────────────────────────────────────
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setActive((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
      return;
    }
    if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setActive((i) =>
        flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = flat[active];
      if (cmd) run(cmd);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="cmdk"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[150] flex items-start justify-center pt-[12vh] px-4 sm:px-6"
          onMouseDown={(e) => {
            // Click outside to close — mousedown on the backdrop only,
            // not bubbled clicks from inside the panel.
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            aria-hidden
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Command palette"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.2, 0.65, 0.3, 0.9] }}
            className={cn(
              "relative w-full max-w-[640px] rounded-md border border-border-strong overflow-hidden",
              "bg-[linear-gradient(180deg,rgba(10,28,44,0.96),rgba(6,18,30,0.99))]",
              "shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,212,200,0.08),0_0_60px_-12px_rgba(0,212,200,0.18)]",
            )}
          >
            {/* Ambient teal tint */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,200,0.08), transparent 65%)",
              }}
            />

            {/* Search input */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
              <Search className="size-4 text-text-faint shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search commands, jump anywhere…"
                className={cn(
                  "flex-1 bg-transparent border-0 outline-none",
                  "text-[14px] text-text placeholder:text-text-dim/70",
                  "focus-visible:shadow-none",
                )}
                spellCheck={false}
                autoComplete="off"
              />
              <kbd
                aria-hidden
                className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 rounded border border-border-subtle bg-surface-1 text-[10px] tracking-[0.04em] text-text-dim font-mono"
              >
                Esc
              </kbd>
            </div>

            {/* List */}
            <div
              ref={listRef}
              data-lenis-prevent
              className="relative max-h-[420px] overflow-y-auto py-2"
            >
              {flat.length === 0 ? (
                <EmptyHint query={query} />
              ) : (
                groups.map(({ group, items }) => (
                  <div key={group} className="mb-1">
                    <div className="px-4 py-1.5 text-[10px] tracking-[0.18em] uppercase text-text-dim font-medium">
                      {group}
                    </div>
                    <div className="px-1.5">
                      {items.map((cmd) => {
                        const idx = flat.indexOf(cmd);
                        const isActive = idx === active;
                        return (
                          <CommandRow
                            key={cmd.id}
                            cmd={cmd}
                            active={isActive}
                            index={idx}
                            onMouseEnter={() => setActive(idx)}
                            onSelect={() => run(cmd)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="relative px-4 py-2.5 border-t border-border-subtle bg-[rgba(255,255,255,0.012)] flex items-center justify-between text-[10.5px] text-text-dim">
              <div className="flex items-center gap-3">
                <Hint label="navigate" keys={["↑", "↓"]} />
                <Hint label="select" keys={["↵"]} />
                <Hint label="close" keys={["esc"]} />
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 tracking-[0.04em]">
                <Sparkles className="size-3 text-accent" />
                BuilderHQ
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

function CommandRow({
  cmd,
  active,
  index,
  onMouseEnter,
  onSelect,
}: {
  cmd: Command;
  active: boolean;
  index: number;
  onMouseEnter: () => void;
  onSelect: () => void;
}) {
  const Icon = cmd.icon;
  return (
    <button
      type="button"
      data-cmd-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={cn(
        "group w-full flex items-center gap-3 px-2.5 py-2 rounded-sm text-left",
        "transition-[background-color,color] duration-[100ms]",
        active
          ? "bg-[rgba(0,212,200,0.12)] text-text"
          : "text-text-muted hover:bg-[rgba(255,255,255,0.025)]",
      )}
    >
      <span
        className={cn(
          "size-7 rounded-sm border flex items-center justify-center shrink-0",
          active
            ? "border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent"
            : "border-border-subtle bg-surface-1 text-text-faint group-hover:text-text-muted",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex-1 text-[13px] tracking-[-0.005em] truncate">
        {cmd.label}
      </span>
      {cmd.hint ? (
        <span className="text-[10.5px] tracking-[0.04em] text-text-dim shrink-0">
          {cmd.hint}
        </span>
      ) : null}
      <span
        className={cn(
          "shrink-0 transition-[color,opacity] duration-[120ms]",
          active ? "text-accent opacity-100" : "text-text-faint opacity-0",
        )}
      >
        <CornerDownLeft className="size-3.5" />
      </span>
    </button>
  );
}

function EmptyHint({ query }: { query: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto size-10 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.018)] flex items-center justify-center mb-3">
        <Search className="size-4 text-text-faint" />
      </div>
      <p className="text-[13px] text-text-muted">
        {query ? (
          <>
            No matches for{" "}
            <span className="text-text font-medium">&ldquo;{query}&rdquo;</span>
          </>
        ) : (
          "Type to search commands"
        )}
      </p>
      <p className="mt-1 text-[11px] text-text-dim">
        Try project name, &ldquo;new&rdquo;, &ldquo;messages&rdquo;…
      </p>
    </div>
  );
}

function Hint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded border border-border-subtle bg-surface-1 text-[9px] tracking-[0.04em] text-text-dim font-mono"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="tracking-[0.04em]">{label}</span>
    </span>
  );
}

// ── command index ───────────────────────────────────────────────────────
//
// Keep the list curated. The palette is more useful when it surfaces the
// 12 things people actually do, not 40 they could.

function commandsForRole(role: Role): Command[] {
  const all: Command[] = [
    // ── Go to ────────────────────────────────────────────────────────
    {
      id: "go-builder-dashboard",
      label: "Builder dashboard",
      keywords: "home overview kpi",
      href: "/builder",
      icon: LayoutDashboard,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-builder-browse",
      label: "Browse projects",
      keywords: "marketplace find search",
      href: "/builder/browse",
      icon: Compass,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-builder-saved",
      label: "Saved projects",
      keywords: "bookmarks bookmarked",
      href: "/builder/saved",
      icon: Bookmark,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-builder-unlocked",
      label: "Unlocked projects",
      keywords: "fba founding access",
      href: "/builder/unlocked",
      icon: ShieldCheck,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-builder-tenders",
      label: "My tenders",
      keywords: "submitted shortlisted awarded",
      href: "/builder/tenders",
      icon: FileSpreadsheet,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-builder-messages",
      label: "Messages",
      keywords: "chat conversations inbox",
      href: "/builder/messages",
      icon: MessageSquare,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-builder-fba",
      label: "Founding access",
      keywords: "fba unlocks credits cycle",
      href: "/builder/access",
      icon: Sparkles,
      group: "Go to",
      roles: ["builder"],
    },
    {
      id: "go-owner-dashboard",
      label: "Owner dashboard",
      keywords: "home overview pipeline",
      href: "/owner",
      icon: LayoutDashboard,
      group: "Go to",
      roles: ["project_owner"],
    },
    {
      id: "go-owner-projects",
      label: "Projects",
      keywords: "list grid",
      href: "/owner/projects",
      icon: Folders,
      group: "Go to",
      roles: ["project_owner"],
    },
    {
      id: "go-owner-tenders",
      label: "Tenders received",
      keywords: "compare shortlist award reject",
      href: "/owner/tenders",
      icon: FileSpreadsheet,
      group: "Go to",
      roles: ["project_owner"],
    },
    {
      id: "go-owner-messages",
      label: "Messages",
      keywords: "chat conversations inbox builders",
      href: "/owner/messages",
      icon: MessageSquare,
      group: "Go to",
      roles: ["project_owner"],
    },
    {
      id: "go-admin-overview",
      label: "Admin overview",
      keywords: "console root",
      href: "/admin",
      icon: ShieldCheck,
      group: "Go to",
      roles: ["admin"],
    },
    {
      id: "go-settings",
      label: "Settings",
      keywords: "preferences account profile",
      href: "/settings",
      icon: Settings,
      group: "Go to",
    },

    // ── Actions ──────────────────────────────────────────────────────
    {
      id: "act-new-project",
      label: "New project",
      keywords: "create upload start",
      href: "/owner/projects/new",
      icon: House,
      group: "Actions",
      roles: ["project_owner"],
    },
    {
      id: "act-browse",
      label: "Find a new project",
      keywords: "browse marketplace",
      href: "/builder/browse",
      icon: Compass,
      group: "Actions",
      roles: ["builder"],
    },
    {
      id: "act-public-profile",
      label: "Edit public profile",
      keywords: "company licences service area",
      href: "/builder/profile",
      icon: Hammer,
      group: "Actions",
      roles: ["builder"],
    },

    // ── Help ─────────────────────────────────────────────────────────
    {
      id: "help-status",
      label: "Status",
      keywords: "uptime incidents",
      href: "https://status.builderhq.com.au",
      icon: ArrowUpRight,
      group: "Help",
      hint: "External",
    },
    {
      id: "help-contact",
      label: "Contact support",
      keywords: "help email feedback bug",
      href: "mailto:hello@builderhq.com.au",
      icon: ArrowRight,
      group: "Help",
    },
    {
      id: "help-builders",
      label: "Featured builders",
      keywords: "directory profiles",
      href: "/builder/browse",
      icon: Building2,
      group: "Help",
      roles: ["project_owner"],
    },
    {
      id: "help-saved-list",
      label: "Open saved list",
      keywords: "bookmarks shortlist",
      href: "/builder/saved",
      icon: ClipboardList,
      group: "Help",
      roles: ["builder"],
    },
  ];

  return all.filter((c) => !c.roles || c.roles.includes(role));
}
