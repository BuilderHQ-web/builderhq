import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { cn } from "@/lib/utils";

/**
 * /delete_account — utility page that tells the user how to request
 * account deletion (email us). Single-viewport, calm, premium.
 *
 * Reuses the same nav + footer + backdrop language as /privacy and
 * /terms so it slots into the marketing surface without feeling like
 * a stub. The body is a single centred card — short copy, one
 * primary CTA (mailto:), no scroll.
 *
 * App-store policy note: a public account-deletion endpoint of some
 * kind is required by Google Play (since 2023) and Apple App Store
 * (since 5.1.1(v) in 2022). A "email this address" page is the
 * minimum compliant form. When we have an in-app delete flow we'll
 * link to it from here.
 */

export const metadata = {
  title: "Delete your account",
  description:
    "How to request deletion of your BuilderHQ account and all associated data.",
};

const SUPPORT_EMAIL = "info@builderhq.com.au";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Account deletion request",
)}&body=${encodeURIComponent(
  "Hi BuilderHQ team,\n\nI'd like to delete my account and all associated data. The email I signed up with is:\n\n[your email]\n\nThanks.",
)}`;

export default function DeleteAccountPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Calm backdrop — same language as /privacy + /terms so the
          page belongs to the same surface. Fixed so it stays put on
          tall screens where the card has breathing room above it. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0,212,200,0.10), transparent 65%), radial-gradient(ellipse 70% 50% at 50% 110%, rgba(26,95,212,0.06), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(142,252,244,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent 80%)",
        }}
      />

      <LandingNav />

      {/* Main fills the remaining vertical space and centres the card,
          so on common viewports the page reads as a single calm view
          with no scroll. On very short screens the page can scroll
          gracefully rather than clipping content. */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 md:px-10 pt-24 pb-12 lg:pt-28 lg:pb-16">
        <div className="w-full max-w-[640px]">
          <article
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "border border-border-subtle",
              "px-6 sm:px-12 py-12 sm:py-16",
              "text-center",
            )}
            style={{
              background:
                "linear-gradient(180deg, rgba(10,28,44,0.55) 0%, rgba(6,18,30,0.75) 100%)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 30px 80px -30px rgba(0,0,0,0.55)",
            }}
          >
            {/* Top hairline accent — the landing's signature premium signal. */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 inset-x-16 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(126,245,237,0.65), transparent)",
              }}
            />
            {/* Soft corner glow, top. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[220px] rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(0,212,200,0.12), transparent 70%)",
              }}
            />

            {/* Kicker */}
            <span className="relative inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
              Account · Deletion request
            </span>

            {/* Headline — same accent-italic device the landing uses on
                every section heading, applied here to "account" so the
                page reads as part of the same brand. */}
            <h1
              className="relative mt-7 font-display tracking-[-0.018em] leading-[1.02] text-[clamp(2.25rem,4.6vw+0.5rem,3.75rem)]"
            >
              <span className="text-text">Delete your</span>{" "}
              <span className="accent-italic">account</span>.
            </h1>

            {/* Body — short, clear, professional. The email is also a
                live mailto link inline so users on a desktop client can
                tap straight from the text without scanning to the button. */}
            <p className="relative mt-7 mx-auto max-w-[44ch] text-[15px] sm:text-[16px] leading-[1.7] text-text-subtle">
              If you wish to delete your account, email us at{" "}
              <Link
                href={MAILTO_HREF}
                className="text-accent-light underline decoration-accent/40 underline-offset-[5px] hover:decoration-accent transition-colors"
              >
                {SUPPORT_EMAIL}
              </Link>
              . We&apos;ll permanently delete your account and all data
              associated with it.
            </p>

            {/* Primary CTA — mirrors the hero CTA style (filled teal pill,
                tight glow stack) so this utility page doesn't look like
                a different product. */}
            <div className="relative mt-9 flex justify-center">
              <Link
                href={MAILTO_HREF}
                className={cn(
                  "group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full",
                  "bg-accent text-accent-contrast text-[14px] font-semibold tracking-[0.01em]",
                  "transition-[background-color,box-shadow,transform] duration-[180ms]",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_0_1px_rgba(0,212,200,0.45),0_0_28px_-4px_rgba(0,212,200,0.55),0_10px_28px_-8px_rgba(0,212,200,0.5)]",
                  "hover:bg-accent-hover hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_0_0_1px_rgba(0,212,200,0.55),0_0_36px_-4px_rgba(0,212,200,0.75),0_14px_32px_-8px_rgba(0,212,200,0.65)]",
                  "active:translate-y-[0.5px]",
                )}
              >
                <Mail className="size-4" strokeWidth={2.2} />
                Email {SUPPORT_EMAIL}
                <ArrowUpRight
                  className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2.4}
                />
              </Link>
            </div>

            {/* Reassurance line — sets expectations and feels professional
                without bloating the copy. Tracking matches the kicker so
                the two read as the same family of meta text. */}
            <p className="relative mt-8 text-[10.5px] tracking-[0.22em] uppercase text-text-dim">
              Typically processed within 7 business days
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
