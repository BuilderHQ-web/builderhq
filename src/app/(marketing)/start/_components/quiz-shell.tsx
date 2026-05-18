"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { STEP_ORDER, type QuizStepId } from "../_lib/quiz-state";

/**
 * Shared layout for every quiz step.
 *
 * Visual signature:
 *   · Hairline top bar — progress fill + step counter only. No logo,
 *     no nav — every pixel earns its place.
 *   · Generous breathing space below the bar (the question itself
 *     sits in the page's optical centre, not crowded at the top).
 *   · Soft fade-up animation on mount so the page transition feels
 *     fluid and considered rather than jarring.
 *   · Persistent left-side back affordance (text link, not a button)
 *     that uses the browser's history.back() so state is preserved.
 *   · No footer at all. The body of each step owns its own CTA.
 *
 * Designed against the Typeform / Stripe Checkout / Lemonade school
 * of premium quiz funnels — minimal chrome, big readable text,
 * deliberate motion.
 */

interface Props {
  step: QuizStepId;
  /** Heading of the page — the question itself. */
  title: ReactNode;
  /** Optional supporting line under the heading. Keep it short. */
  sub?: ReactNode;
  /** The interactive content of the step (inputs + CTA). */
  children: ReactNode;
  /** Optional right-side helper card (illustrations, hints). Hidden
   *  on mobile; sits beside the question on lg+. */
  aside?: ReactNode;
}

export function QuizShell({ step, title, sub, children, aside }: Props) {
  const router = useRouter();
  const stepIndex = STEP_ORDER.indexOf(step);
  const total = STEP_ORDER.length;
  const progress = ((stepIndex + 1) / total) * 100;

  // Pre-load the next step in the background so navigation is instant.
  useEffect(() => {
    const next = STEP_ORDER[stepIndex + 1];
    if (next) router.prefetch(`/start/q/${next}`);
  }, [router, stepIndex]);

  return (
    <div className="min-h-svh flex flex-col">
      <ProgressBar percent={progress} stepLabel={`${stepIndex + 1} / ${total}`} />

      <main className="flex-1 flex flex-col">
        <div className="flex-1 px-5 md:px-10 pt-10 sm:pt-16 lg:pt-20 pb-16">
          <div className="mx-auto max-w-[1180px] w-full">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12.5px] font-ui transition-colors mb-10"
              >
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back
              </button>
            ) : (
              <Link
                href="/start"
                className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12.5px] font-ui transition-colors mb-10"
              >
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back
              </Link>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={
                aside
                  ? "grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start"
                  : "max-w-[680px]"
              }
            >
              <div>
                <h1 className="font-display uppercase tracking-[-0.014em] leading-[0.95] text-[clamp(2.1rem,4.5vw+0.8rem,3.6rem)] text-text">
                  {title}
                </h1>
                {sub ? (
                  <p className="mt-4 text-text-muted text-[15px] sm:text-[16px] leading-[1.55] max-w-[520px] font-body">
                    {sub}
                  </p>
                ) : null}

                <div className="mt-10">{children}</div>
              </div>

              {aside ? (
                <div className="hidden lg:block">{aside}</div>
              ) : null}
            </motion.div>
          </div>
        </div>

        <ShellFooter />
      </main>
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────────────

function ProgressBar({
  percent,
  stepLabel,
}: {
  percent: number;
  stepLabel: string;
}) {
  return (
    <div className="sticky top-0 z-30 px-5 md:px-10 pt-6 pb-3 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1180px] flex items-center gap-4">
        {/* Tiny brand mark — keeps the user oriented. Not a link
              (no escape hatch from the funnel). */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
          <span className="font-display text-[15px] tracking-[0.04em] text-text">
            BuilderHQ
          </span>
        </div>

        {/* Hairline track + filled bar. The fill animates between
              steps using a CSS transition (no JS spring needed). */}
        <div className="flex-1 h-px relative bg-border-subtle">
          <motion.span
            className="absolute inset-y-0 left-0 bg-accent shadow-[0_0_8px_rgba(0,212,200,0.5)]"
            style={{ width: `${percent}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <span className="text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold shrink-0">
          {stepLabel}
        </span>
      </div>
    </div>
  );
}

// ── Footer (minimal legal) ──────────────────────────────────────────

function ShellFooter() {
  return (
    <footer className="px-5 md:px-10 pb-8">
      <div className="mx-auto max-w-[1180px] flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-text-faint font-ui">
        <span>© {new Date().getFullYear()} BuilderHQ Pty Ltd</span>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-text transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text transition-colors">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
