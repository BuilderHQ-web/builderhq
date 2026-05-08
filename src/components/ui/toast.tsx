"use client";

/**
 * Toast — global notification system.
 *
 * Replaces every `alert()` in the app. Stacks at bottom-right, slides
 * in from the right edge, auto-dismisses (configurable per toast).
 *
 * Two ways to fire one:
 *
 *   1. Inside React components: `const toast = useToast()` then
 *      `toast.success("Saved.")` etc. Hook usage gets you a stable
 *      reference + fast dispatch.
 *   2. Anywhere (event handlers spawned outside React, etc.):
 *      `import { toast } from "@/components/ui/toast"; toast.error(...)`.
 *      Backed by a singleton emitter the provider subscribes to.
 *
 * Tones map to UI accents:
 *   default  — neutral surface
 *   success  — accent (teal)
 *   danger   — danger (rose)
 *   info     — subtle blue
 *
 * The motion choreography is deliberately understated — Linear-style
 * not Stripe-style. Slides 12px in from the right, fades on exit.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, X, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastTone = "default" | "success" | "danger" | "info";

export interface ToastInput {
  title?: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. 0 disables. Default 4500. */
  duration?: number;
  /** Called when the toast is dismissed (auto or manual). */
  onDismiss?: () => void;
}

interface ToastItem extends ToastInput {
  id: string;
  createdAt: number;
}

// ── singleton emitter (for callsites that can't use the hook) ──────────
type Listener = (t: ToastItem) => void;

class ToastBus {
  private subs = new Set<Listener>();
  private seq = 0;
  subscribe(fn: Listener) {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }
  emit(input: ToastInput) {
    const item: ToastItem = {
      id: `t-${Date.now()}-${++this.seq}`,
      createdAt: Date.now(),
      tone: "default",
      duration: 4500,
      ...input,
    };
    for (const fn of this.subs) fn(item);
    return item.id;
  }
}

const bus = new ToastBus();

/** Module-level helper so non-component code can fire toasts too. */
export const toast = {
  show: (input: ToastInput) => bus.emit(input),
  success: (title: string, description?: string, opts?: Partial<ToastInput>) =>
    bus.emit({ ...opts, title, description, tone: "success" }),
  error: (title: string, description?: string, opts?: Partial<ToastInput>) =>
    bus.emit({ ...opts, title, description, tone: "danger" }),
  info: (title: string, description?: string, opts?: Partial<ToastInput>) =>
    bus.emit({ ...opts, title, description, tone: "info" }),
  message: (title: string, description?: string, opts?: Partial<ToastInput>) =>
    bus.emit({ ...opts, title, description, tone: "default" }),
};

// ── context for hook usage (provides a no-op fallback before mount) ────
interface Ctx {
  push: (input: ToastInput) => string;
}
const ToastCtx = createContext<Ctx>({ push: (i) => bus.emit(i) });

export function useToast() {
  const ctx = useContext(ToastCtx);
  return {
    show: ctx.push,
    success: (title: string, description?: string, opts?: Partial<ToastInput>) =>
      ctx.push({ ...opts, title, description, tone: "success" }),
    error: (title: string, description?: string, opts?: Partial<ToastInput>) =>
      ctx.push({ ...opts, title, description, tone: "danger" }),
    info: (title: string, description?: string, opts?: Partial<ToastInput>) =>
      ctx.push({ ...opts, title, description, tone: "info" }),
    message: (title: string, description?: string, opts?: Partial<ToastInput>) =>
      ctx.push({ ...opts, title, description, tone: "default" }),
  };
}

// ── provider + viewport ────────────────────────────────────────────────

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setItems((arr) => {
      const hit = arr.find((t) => t.id === id);
      hit?.onDismiss?.();
      return arr.filter((t) => t.id !== id);
    });
    const handle = timersRef.current.get(id);
    if (handle) clearTimeout(handle);
    timersRef.current.delete(id);
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const item: ToastItem = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        tone: "default",
        duration: 4500,
        ...input,
      };
      setItems((arr) => [...arr, item].slice(-MAX_VISIBLE * 2));
      if (item.duration && item.duration > 0) {
        const handle = setTimeout(() => dismiss(item.id), item.duration);
        timersRef.current.set(item.id, handle);
      }
      return item.id;
    },
    [dismiss],
  );

  // Subscribe to the singleton so module-level `toast.error(…)` calls
  // also flow through this same state.
  useEffect(() => {
    const off = bus.subscribe((item) => {
      setItems((arr) => [...arr, item].slice(-MAX_VISIBLE * 2));
      if (item.duration && item.duration > 0) {
        const handle = setTimeout(() => dismiss(item.id), item.duration);
        timersRef.current.set(item.id, handle);
      }
    });
    return off;
  }, [dismiss]);

  // Cleanup any pending timers on unmount.
  useEffect(() => {
    const map = timersRef.current;
    return () => {
      for (const h of map.values()) clearTimeout(h);
      map.clear();
    };
  }, []);

  // Cap visible — older toasts above the cap fade out automatically.
  const visible = items.slice(-MAX_VISIBLE);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <Viewport items={visible} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

function Viewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        "fixed z-[100] pointer-events-none",
        "bottom-4 right-4 sm:bottom-6 sm:right-6",
        "flex flex-col items-end gap-2 max-w-[calc(100%-2rem)] sm:max-w-[420px]",
      )}
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const tone = item.tone ?? "default";
  const palette = TONES[tone];
  const Icon = palette.icon;
  return (
    <motion.div
      initial={{ x: 24, opacity: 0, scale: 0.96 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 24, opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.22,
        ease: [0.2, 0.65, 0.3, 0.9],
      }}
      layout
      role="status"
      className={cn(
        "pointer-events-auto w-[360px] max-w-full",
        "rounded-md border shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]",
        "backdrop-blur-md",
        palette.surface,
        palette.border,
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          aria-hidden
          className={cn(
            "size-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
            palette.iconWrap,
          )}
        >
          <Icon className={cn("size-3.5", palette.iconColor)} />
        </span>
        <div className="min-w-0 flex-1">
          {item.title ? (
            <p className={cn("text-[13px] tracking-[-0.005em] font-medium", palette.title)}>
              {item.title}
            </p>
          ) : null}
          {item.description ? (
            <p className={cn("text-[12px] leading-[1.5] mt-0.5", palette.body)}>
              {item.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            "shrink-0 -mr-1 -mt-0.5 size-6 rounded-md flex items-center justify-center",
            "text-text-faint hover:text-text-muted hover:bg-surface-1",
            "transition-colors duration-[120ms]",
          )}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── tone palette ───────────────────────────────────────────────────────

const TONES = {
  default: {
    icon: Info,
    surface: "bg-[rgba(10,28,44,0.92)]",
    border: "border-border-strong",
    iconWrap: "bg-surface-1 border border-border-subtle",
    iconColor: "text-text-muted",
    title: "text-text",
    body: "text-text-muted",
  },
  success: {
    icon: Check,
    surface:
      "bg-[linear-gradient(180deg,rgba(0,212,200,0.10),rgba(10,28,44,0.92))]",
    border: "border-accent/35",
    iconWrap: "bg-accent text-accent-contrast",
    iconColor: "text-accent-contrast",
    title: "text-text",
    body: "text-text-muted",
  },
  danger: {
    icon: AlertTriangle,
    surface:
      "bg-[linear-gradient(180deg,rgba(255,122,138,0.08),rgba(10,28,44,0.92))]",
    border: "border-danger/35",
    iconWrap: "bg-danger/15 border border-danger/30",
    iconColor: "text-danger",
    title: "text-text",
    body: "text-text-muted",
  },
  info: {
    icon: Info,
    surface:
      "bg-[linear-gradient(180deg,rgba(26,95,212,0.10),rgba(10,28,44,0.92))]",
    border: "border-blue-400/30",
    iconWrap: "bg-[rgba(26,95,212,0.18)] border border-blue-400/30",
    iconColor: "text-[rgb(160,200,255)]",
    title: "text-text",
    body: "text-text-muted",
  },
} as const;
