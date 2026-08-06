"use client";

/**
 * The unlock welcome — three quiet slides, shown once, the first time
 * a builder opens a project they hold a spot on (paid, or invited).
 *
 * Its whole job is orientation: what is now open to you, where the
 * scope of works lives, and how tendering works. Each slide is one
 * idea, drawn in the document visual language the deck's intro uses,
 * with as little text as possible. Dismissed once, it never returns
 * for that project; Escape or Skip leaves immediately.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  MapPin,
  MessageSquare,
  ScrollText,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const KEY_PREFIX = "bhq.unlock-welcome.v1.";
const EASE = [0.22, 1, 0.36, 1] as const;

interface SlideDef {
  key: string;
  kicker: string;
  headline: string;
  body: string;
  cta: string;
}

const SLIDES: SlideDef[] = [
  {
    key: "open",
    kicker: "Your spot",
    headline: "The full project is open to you.",
    body: "The street address, every document, the owner's contact and a private message thread. All of it is on this page.",
    cta: "Continue",
  },
  {
    key: "scope",
    kicker: "The scope of works",
    headline: "Every line of the build, already read.",
    body: "We read the client's documents and wrote them into a line-by-line scope of works. Find it on this page, search it, and download it as a PDF.",
    cta: "Continue",
  },
  {
    key: "tender",
    kicker: "When you are ready",
    headline: "Tender in about 30 minutes.",
    body: "Answer short questions and mark the scope line by line. We build your complete tender document as a PDF on your letterhead.",
    cta: "Open the project",
  },
];

export function UnlockWelcome({
  projectId,
  hasScope = true,
}: {
  projectId: string;
  /** Legacy rounds carry no scope of works; that slide steps aside. */
  hasScope?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const slides = useMemo(
    () => SLIDES.filter((s) => hasScope || s.key !== "scope"),
    [hasScope],
  );

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY_PREFIX + projectId) !== "1") {
        setVisible(true);
      }
    } catch {
      // Storage unavailable — skip the welcome rather than loop it.
    }
  }, [projectId]);

  const close = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(KEY_PREFIX + projectId, "1");
    } catch {
      // Worst case it shows again next visit.
    }
    restoreFocusRef.current?.focus?.();
  }, [projectId]);

  const advance = useCallback(() => {
    if (slide >= slides.length - 1) close();
    else setSlide((x) => x + 1);
  }, [slide, slides.length, close]);

  useEffect(() => {
    if (!visible) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Never swallow keys headed for a form control elsewhere.
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      // Keep Tab inside the dialog while it holds the screen.
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          "button, [href], [tabindex]:not([tabindex='-1'])",
        );
        if (focusables.length > 0) {
          const first = focusables[0]!;
          const last = focusables[focusables.length - 1]!;
          const active = document.activeElement as HTMLElement | null;
          if (!dialogRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        if (t && (t.tagName === "A" || t.tagName === "BUTTON")) return;
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [visible, advance, close]);

  // The page behind must not scroll while the welcome holds the
  // screen, and focus moves into the dialog (and back out on close).
  useEffect(() => {
    if (!visible) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;
  const s = slides[Math.min(slide, slides.length - 1)]!;
  const d = (n: number) => (reduceMotion ? 0 : n);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-label="What your spot includes"
    >
      {/* backdrop */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-[rgba(250,248,243,0.92)] backdrop-blur-sm"
        onClick={close}
      />

      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="relative w-full max-w-[540px] rounded-xl border border-border-subtle bg-surface-1 card-elev-lg overflow-hidden outline-none"
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-5 z-10 text-[11.5px] text-text-dim hover:text-text transition-colors"
        >
          Skip
        </button>

        {/* The slide reads as content, not as a control; only the CTA
            is a button, so the words reach screen readers. */}
        <div
          onClick={advance}
          className="px-7 sm:px-10 pt-11 pb-6 text-center cursor-pointer select-none"
        >
          <motion.div
            key={s.key}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="h-[120px] flex items-end justify-center mb-7">
              {s.key === "open" ? (
                <ArtOpen d={d} />
              ) : s.key === "scope" ? (
                <ArtScope d={d} />
              ) : (
                <ArtTender d={d} />
              )}
            </div>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: d(0.4), ease: EASE }}
              className="text-[10px] tracking-[0.3em] uppercase text-accent-deep font-ui font-semibold"
            >
              {s.kicker}
            </motion.p>
            <motion.h2
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: d(0.5), ease: EASE }}
              className="mt-3 font-display tracking-[-0.01em] text-[24px] sm:text-[28px] leading-[1.15] text-text"
            >
              {s.headline}
            </motion.h2>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: d(0.68), ease: EASE }}
              className="mt-3 text-[13px] leading-[1.7] text-text-muted max-w-[42ch] mx-auto"
            >
              {s.body}
            </motion.p>

            <motion.span
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: d(0.85), ease: EASE }}
              className="mt-7 inline-block"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  advance();
                }}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] shadow-[0_0_0_1px_rgba(0,212,200,0.35)] hover:bg-accent-hover transition-colors"
              >
                {s.cta}
                <ArrowRight className="size-4" />
              </button>
            </motion.span>
          </motion.div>
        </div>

        {/* progress dots */}
        <div className="pb-6 flex items-center justify-center gap-2">
          {slides.map((x, i) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`Part ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === slide
                  ? "w-6 bg-accent"
                  : "w-1.5 bg-[rgba(24,34,44,0.18)] hover:bg-[rgba(24,34,44,0.3)]",
              )}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── slide art, in the document visual language ─────────────────────── */

/** Slide one: four small unlocked panels rising together. */
function ArtOpen({ d }: { d: (n: number) => number }) {
  const items = [
    { icon: MapPin, label: "Address", delay: 0.08 },
    { icon: FileText, label: "Documents", delay: 0.18 },
    { icon: ScrollText, label: "Scope", delay: 0.28 },
    { icon: MessageSquare, label: "Owner", delay: 0.38 },
  ];
  return (
    <div className="flex items-end gap-2.5" aria-hidden>
      {items.map((it) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: d(it.delay), ease: EASE }}
          className="w-[76px] rounded-md border border-[#eee9dd] bg-white shadow-[0_1px_2px_rgba(24,34,44,0.1),_0_10px_22px_-14px_rgba(24,34,44,0.3)] px-2 pt-3 pb-2.5 text-center"
        >
          <it.icon className="mx-auto size-4 text-[#0a7d73]" />
          <p className="mt-1.5 text-[9px] tracking-[0.08em] uppercase text-[#6b6555] font-ui font-semibold">
            {it.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/** Slide two: a mini scope of works — three lines, one marked. */
function ArtScope({ d }: { d: (n: number) => number }) {
  const rows = [
    { w: 64, delay: 0.15 },
    { w: 52, delay: 0.27 },
    { w: 58, delay: 0.39 },
  ];
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: d(0.06), ease: EASE }}
      className="w-[220px] rounded-md border border-[#eee9dd] bg-white shadow-[0_1px_2px_rgba(24,34,44,0.1),_0_14px_30px_-16px_rgba(24,34,44,0.32)] px-3.5 pt-3.5 pb-3 text-left"
    >
      <div className="h-[3px] w-16 bg-[#18222c]" />
      {rows.map((r, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: d(r.delay), ease: EASE }}
          className="mt-2.5 flex items-center justify-between gap-2"
        >
          <div>
            <div style={{ width: r.w }} className="h-[3px] bg-[#c9c3b2]" />
            <div
              style={{ width: r.w + 46 }}
              className="mt-1 h-[2.5px] bg-[#eee9dd]"
            />
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: d(r.delay + 0.14), ease: EASE }}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[rgba(0,212,200,0.12)] px-1.5 py-[2px]"
          >
            <Check className="size-2 text-[#0a7d73]" strokeWidth={3.5} />
            <span className="text-[7px] tracking-[0.06em] uppercase text-[#0a7d73] font-ui font-bold">
              Line
            </span>
          </motion.span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Slide three: the tender document assembling, sealed. */
function ArtTender({ d }: { d: (n: number) => number }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: d(0.06), ease: EASE }}
      className="relative w-[96px] h-[118px] rounded-[3px] border border-[#eee9dd] bg-white shadow-[0_1px_2px_rgba(24,34,44,0.1),_0_16px_32px_-16px_rgba(24,34,44,0.35)] px-3 pt-3 text-left"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: d(0.3), ease: EASE }}
        className="h-[3px] bg-[#18222c] origin-left"
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.35, delay: d(0.42 + i * 0.09), ease: EASE }}
          style={{ width: `${90 - i * 13}%` }}
          className="h-[2.5px] bg-[#e3ded2] origin-left mt-[8px]"
        />
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: d(0.85), ease: EASE }}
        className="absolute bottom-2.5 right-2.5 size-5 rounded-[2px] bg-[rgba(0,212,200,0.16)] border border-[#0a7d73]/50 flex items-center justify-center"
      >
        <Check className="size-3 text-[#0a7d73]" strokeWidth={3} />
      </motion.div>
    </motion.div>
  );
}
