"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { WhatsNextSteps } from "../whats-next";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Full-screen "your project is live" takeover shown right after publish.
 * Renders as a fixed overlay (z-50) so it covers the app shell for a true
 * full-bleed moment, then hands the owner onward via the CTAs. Honors
 * prefers-reduced-motion (collapses transforms to a simple fade).
 */
export function PublishedCelebration({
  title,
  slug,
  state,
  basePath,
  cap,
  tenderMode = "open",
}: {
  title: string;
  slug: string;
  state: string | null;
  /** "/owner" or "/architect" — where this project's pages live. */
  basePath: string;
  /** Round capacity — how many builders can take a spot. */
  cap: number;
  tenderMode?: "open" | "private" | "hybrid";
}) {
  const reduce = !!useReducedMotion();
  const isPrivate = tenderMode === "private";
  const where = state ? `across ${state}` : "on the register";

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } },
  };
  const item: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: EASE },
        },
      };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <Ambient reduce={reduce} />

      <div className="relative min-h-svh flex flex-col items-center justify-center px-5 py-16 sm:py-20">
        <div className="w-full max-w-[760px] text-center">
          <SuccessBadge reduce={reduce} />

          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div
              variants={item}
              className="mt-8 inline-flex items-center gap-2 text-[11px] tracking-[0.24em] uppercase text-accent font-ui font-medium"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              You&apos;re live
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-4 font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[64px] leading-[0.9] text-text"
            >
              Your project
              <br />
              is <span className="accent-italic italic">live</span>.
            </motion.h1>

            <motion.p variants={item} className="mt-5 text-[14px] text-text-muted">
              <span className="text-text">“{title}”</span>{" "}
              {isPrivate
                ? "is now open to the builders you invite."
                : `is now in front of verified builders ${where}.`}
            </motion.p>

            <motion.p
              variants={item}
              className="mt-2 max-w-[52ch] mx-auto text-[13.5px] leading-[1.65] text-text-muted"
            >
              They review your plans, take a spot on the round, and send priced
              tenders. Here is what happens from here.
            </motion.p>

            <motion.div variants={item} className="mt-9 text-left">
              <WhatsNextSteps current="notified" cap={cap} mode={tenderMode} />
            </motion.div>

            <motion.div
              variants={item}
              className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                href={`${basePath}/projects/${slug}`}
                className={cn(
                  buttonVariants({ variant: "primary", size: "lg" }),
                  "gap-2 w-full sm:w-auto",
                )}
              >
                View your project
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={basePath}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "gap-2 w-full sm:w-auto",
                )}
              >
                <LayoutDashboard className="size-4" />
                Back to dashboard
              </Link>
            </motion.div>

            <motion.p variants={item} className="mt-6 text-[11.5px] text-text-dim">
              We have emailed you a confirmation, and you will be notified each
              time a builder takes a spot.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SuccessBadge({ reduce }: { reduce: boolean }) {
  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ width: 132, height: 132 }}
    >
      {!reduce ? (
        <>
          <motion.span
            className="absolute inset-0 rounded-full border border-border-accent"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.85, opacity: 0 }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.7,
            }}
          />
          <motion.span
            className="absolute inset-0 rounded-full border border-border-accent"
            initial={{ scale: 0.6, opacity: 0.5 }}
            animate={{ scale: 1.85, opacity: 0 }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeOut",
              delay: 1.6,
            }}
          />
        </>
      ) : null}

      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-2xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.5), transparent 70%)",
        }}
      />

      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 96,
          height: 96,
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.22), rgba(26,95,212,0.18))",
          border: "1px solid var(--color-border-accent)",
        }}
        initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={
          reduce
            ? { duration: 0.4 }
            : { type: "spring", stiffness: 220, damping: 16, delay: 0.15 }
        }
      >
        <svg viewBox="0 0 24 24" fill="none" width="44" height="44">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="var(--color-accent-light)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.5, delay: 0.55, ease: "easeOut" }
            }
          />
        </svg>
      </motion.div>
    </div>
  );
}

function Ambient({ reduce }: { reduce: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{
          width: 440,
          height: 440,
          top: "-8%",
          left: "-6%",
          background:
            "radial-gradient(circle, rgba(0,212,200,0.20), transparent 65%)",
        }}
        animate={reduce ? undefined : { y: [0, 26, 0], x: [0, 14, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 14, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{
          width: 400,
          height: 400,
          bottom: "-10%",
          right: "-4%",
          background:
            "radial-gradient(circle, rgba(26,95,212,0.18), transparent 65%)",
        }}
        animate={reduce ? undefined : { y: [0, -22, 0], x: [0, -12, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 16, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(24,34,44,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,44,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 38%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 38%, black, transparent 75%)",
        }}
      />
    </div>
  );
}
