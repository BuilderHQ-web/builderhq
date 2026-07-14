/**
 * The Build Brief · shared editorial components.
 *
 * Server components only — the publication renders as pure HTML for
 * SEO and speed. The visual system extends the marketing shell's light
 * canvas with one deliberate dark element (the navy masthead, echoing
 * the partner pages' honours board): ink navy, wireframe cover art,
 * Instrument Serif for the masthead voice, teal for the accents.
 */

import Image from "next/image";
import Link from "next/link";

import { partnerNavGroups } from "@/app/(marketing)/partners/partners-data";
import { RoleProvider } from "@/components/landing/v2/role";
import { LandingNav } from "@/components/landing/v2/nav";
import { Footer } from "@/components/landing/v2/footer";

import { BRIEF_AUDIENCES, type BriefTakes } from "./brief-data";

export const SERIF = { fontFamily: "var(--font-instrument-serif)" } as const;

/* ── chrome ──────────────────────────────────────────────────────────── */

/** The marketing shell's chrome with a custom body (no standard header). */
export function BriefShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-light">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "#f4f1ea" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% -12%, rgba(0,170,158,0.10), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
          }}
        />
      </div>

      <RoleProvider>
        <LandingNav authedHref={null} homeAnchors partnerNav={partnerNavGroups()} />
        <main className="relative z-10 pt-28 lg:pt-36 pb-20 lg:pb-28 px-5 md:px-10">
          {children}
        </main>
        <Footer homeAnchors />
      </RoleProvider>
    </div>
  );
}

/* ── small furniture ─────────────────────────────────────────────────── */

/** Section eyebrow: "MARKET WATCH · SIGNAL 1 OF 3". */
export function BriefKicker({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-5">
      <span className="inline-flex items-center gap-2.5 text-[10.5px] tracking-[0.26em] uppercase text-accent-light font-ui font-semibold">
        <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.7)]" />
        {children}
      </span>
      {right ? (
        <span className="hidden sm:block text-[10.5px] tracking-[0.18em] uppercase text-text-dim">
          {right}
        </span>
      ) : null}
    </div>
  );
}

/** Attributed source line — every number in the Brief carries one. */
export function SourceLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-[11.5px] tracking-[0.05em] text-text-dim">
      Source: {children}.
    </p>
  );
}

/** White paper card, the publication's standard section surface. */
export function BriefCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-2xl bg-white ring-1 ring-[#101820]/[0.06] card-elev px-6 py-8 sm:px-10 sm:py-10 ${className}`}
    >
      {children}
    </section>
  );
}

/* ── the four-audience grid ──────────────────────────────────────────── */

/**
 * "What this means for you" — the Brief's signature move, mirrored on
 * the site's role system. Each audience label links to its lens page,
 * threading every issue back into the platform.
 */
export function TakesGrid({ takes }: { takes: BriefTakes }) {
  return (
    <div className="mt-7 border-t border-[#101820]/[0.07] pt-6">
      <p className="text-[10.5px] tracking-[0.26em] uppercase text-text-dim font-ui font-semibold mb-4">
        What this means for you
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {BRIEF_AUDIENCES.map((a) => (
          <div key={a.key} className="flex flex-col gap-1">
            <Link
              href={a.href}
              className="text-[11px] tracking-[0.14em] uppercase font-ui font-semibold text-text-muted hover:text-accent-light transition-colors w-fit"
            >
              {a.label}
            </Link>
            <p className="text-[14px] leading-[1.55] text-text-muted">
              {takes[a.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── the navy masthead surface ───────────────────────────────────────── */

/**
 * The publication's dark identity panel — the one dark element on the
 * light canvas, like the honours board on partner pages. Wireframe
 * cover art sits along the bottom edge.
 */
export function MastheadPanel({
  children,
  className = "",
  art = true,
}: {
  children: React.ReactNode;
  className?: string;
  art?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl text-white ${className}`}
      style={{ background: "linear-gradient(180deg, #0d151e 0%, #090f16 100%)" }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(86,196,187,0.55), transparent)",
        }}
      />
      {art ? (
        <div aria-hidden className="absolute inset-x-0 bottom-0 pointer-events-none">
          <Image
            src="/build-brief/masthead-art.jpg"
            alt=""
            width={1600}
            height={1041}
            className="w-full h-auto opacity-70 select-none"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #0a1017 0%, rgba(10,16,23,0.15) 60%, rgba(10,16,23,0.35) 100%)",
            }}
          />
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}

/** Teal small-caps line used inside the navy panel. */
export function MastheadKicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10.5px] sm:text-[11px] tracking-[0.3em] uppercase font-ui font-semibold"
      style={{ color: "rgba(86,196,187,0.95)" }}
    >
      {children}
    </p>
  );
}

/* ── structured data ─────────────────────────────────────────────────── */

/** Renders a JSON-LD block. Pass a plain object; it is serialised once. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const SITE = "https://builderhq.com.au";

/** The publication as schema.org Periodical — shared by hub + issues. */
export function periodicalSchema() {
  return {
    "@type": "Periodical",
    "@id": `${SITE}/build-brief#periodical`,
    name: "The Build Brief",
    alternateName: "The Build Brief by BuilderHQ",
    description:
      "Five minutes on the economics of getting homes built in Australia. Plain, sourced, every Friday.",
    url: `${SITE}/build-brief`,
    inLanguage: "en-AU",
    frequency: "Weekly",
    publisher: {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "BuilderHQ",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/brand/BuilderHQ_email_logo.png`,
      },
    },
  };
}
