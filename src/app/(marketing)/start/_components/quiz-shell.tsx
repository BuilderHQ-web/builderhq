"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { Logo } from "@/components/brand/logo";
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
    <>
      <StickyGlassHeader
        percent={progress}
        stepLabel={`${stepIndex + 1} / ${total}`}
      />

      <div className="flex-1 flex items-center px-5 md:px-10 py-8">
        <div className="mx-auto w-full max-w-[1240px]">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12px] font-ui transition-colors mb-7"
            >
              <ArrowLeft size={13} strokeWidth={1.8} />
              Back
            </button>
          ) : (
            <Link
              href="/start"
              className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12px] font-ui transition-colors mb-7"
            >
              <ArrowLeft size={13} strokeWidth={1.8} />
              Back
            </Link>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={
              aside
                ? "grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center"
                : "mx-auto max-w-[720px]"
            }
          >
            <div>
              <h1 className="font-display tracking-[-0.014em] leading-[0.92] text-[clamp(2rem,4.2vw+0.8rem,3.4rem)] text-text">
                {title}
              </h1>
              {sub ? (
                <p className="mt-3 text-text-muted text-[14.5px] sm:text-[15.5px] leading-[1.55] max-w-[520px] font-body">
                  {sub}
                </p>
              ) : null}

              <div className="mt-8">{children}</div>
            </div>

            {aside ? <div className="hidden lg:block">{aside}</div> : null}
          </motion.div>
        </div>
      </div>
    </>
  );
}

// ── Sticky glass header ─────────────────────────────────────────────

function StickyGlassHeader({
  percent,
  stepLabel,
}: {
  percent: number;
  stepLabel: string;
}) {
  return (
    <header className="sticky top-0 z-40">
      {/* Glass underlay spans the full header including the iOS safe
              area at the top — no break between the status bar and the
              progress chrome. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-bg/68 backdrop-blur-xl"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 76%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 76%, transparent 100%)",
        }}
      />
      <div
        className="relative px-5 md:px-10 pb-3"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        }}
      >
        <div className="mx-auto max-w-[1240px] flex items-center gap-4 sm:gap-5">
          <Link
            href="/start"
            aria-label="BuilderHQ"
            className="shrink-0 inline-flex items-center"
          >
            <Logo height={20} />
          </Link>

          <div className="flex-1 h-[2px] relative rounded-full bg-border-subtle/80 overflow-hidden">
            <motion.span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#00d4c8] via-[#1ea3f0] to-[#3b82f6] shadow-[0_0_12px_rgba(0,212,200,0.55)]"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <span className="text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold shrink-0 tabular-nums">
            {stepLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
