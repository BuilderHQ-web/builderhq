"use client";

/**
 * The credit announcement, on the builder dashboard.
 *
 * Shown while the builder holds a live grant they have not
 * acknowledged. Dismissal is stored on the GRANT, server-side, not in
 * localStorage: this is money, and a builder who reads it on their
 * phone should not be told again on their laptop.
 *
 * That also makes the whole feature replicable. Grant credit to any
 * builder and this card appears for them, with their own note, until
 * they dismiss it. Nothing here is specific to the cohort it was
 * built for.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, Ticket, X } from "lucide-react";

import { acknowledgeCreditGrantsAction } from "@/app/(app)/_actions/marketplace";
import type { CreditGrantView } from "@/modules/wallet";
import { cn } from "@/lib/utils";

const money = (n: number) => `$${n.toLocaleString("en-AU")}`;

const longDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function CreditAnnouncement({ grants }: { grants: CreditGrantView[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, start] = useTransition();

  if (dismissed || grants.length === 0) return null;

  const total = grants.reduce((n, g) => n + g.amountAud, 0);
  // Every grant in one issue carries the same note; show it once.
  const note = grants.find((g) => g.note)?.note ?? null;
  const soonest = grants.reduce(
    (a, g) => (new Date(g.expiresAt) < new Date(a.expiresAt) ? g : a),
    grants[0]!,
  );

  const dismiss = () =>
    start(async () => {
      const r = await acknowledgeCreditGrantsAction();
      if (r.ok) setDismissed(true);
    });

  return (
    <section
      className={cn(
        "relative rounded-xl border border-border-accent/35 card-elev",
        "bg-[linear-gradient(140deg,rgba(0,212,200,0.07),rgba(250,248,243,0.55)_62%)]",
        "px-5 sm:px-7 py-5 sm:py-6",
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        disabled={pending}
        aria-label="Dismiss"
        className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-bg-elev transition-colors disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" />
        )}
      </button>

      <p className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.18em] uppercase text-accent-deep font-ui font-semibold">
        <Ticket className="size-3" />
        Account credit
      </p>

      <h2 className="mt-2 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1.05] text-text">
        We have credited your account with {money(total)}
      </h2>

      {note ? (
        <p className="mt-3 text-[13.5px] leading-[1.7] text-text-muted max-w-[72ch]">
          {note}
        </p>
      ) : null}

      <p className="mt-3 text-[13px] leading-[1.7] text-text-muted max-w-[72ch]">
        The credit applies against the cost of securing a tender spot. Where
        it covers a project in full, you will be offered the option to use it
        instead of paying by card. It is available until{" "}
        <strong className="text-text font-semibold">
          {longDate(soonest.expiresAt)}
        </strong>
        .
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Link
          href="/builder/browse"
          className={cn(
            "group inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full",
            "bg-accent text-accent-contrast text-[12.5px] font-semibold",
            "hover:bg-accent-hover transition-colors duration-[140ms]",
            "shadow-[0_8px_24px_-8px_rgba(0,212,200,0.5)]",
          )}
        >
          Browse projects
          <ArrowUpRight className="size-3.5 transition-transform duration-[140ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <Link
          href="/settings#credits"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-subtle text-[12.5px] text-text-muted hover:text-text hover:border-border-strong transition-colors"
        >
          View credit
        </Link>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="inline-flex items-center gap-1.5 h-10 px-3 text-[12.5px] text-text-muted hover:text-text transition-colors disabled:opacity-50"
        >
          <Check className="size-3.5" />
          Got it
        </button>
      </div>
    </section>
  );
}
