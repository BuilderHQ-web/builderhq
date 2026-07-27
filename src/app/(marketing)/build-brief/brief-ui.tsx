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

import { partnerNavTypes } from "@/app/(marketing)/partners/partners-data";
import { PartnerForm } from "@/components/landing/v2/partner-form";
import { RoleProvider } from "@/components/landing/v2/role";
import { LandingNav } from "@/components/landing/v2/nav";
import { Footer } from "@/components/landing/v2/footer";

import { BRIEF_AUDIENCES, type BriefTakes } from "./brief-data";

export const SERIF = { fontFamily: "var(--font-instrument-serif)" } as const;
export const MONO = { fontFamily: "var(--font-jetbrains-mono)" } as const;

/* ── inline copy with links ──────────────────────────────────────────── */

const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Renders a copy string, resolving `[label](href)` marks into links —
 * internal routes via next/link, external URLs in a new tab. This is
 * the publication's entire rich-text surface; everything else in the
 * data stays plain text.
 */
export function InlineText({
  text,
  dark = false,
}: {
  text: string;
  dark?: boolean;
}) {
  const cls = dark
    ? "font-ui font-medium text-white underline decoration-white/35 underline-offset-[3px] hover:decoration-white transition-colors"
    : "font-ui font-medium text-text underline decoration-[#0a7d73]/40 underline-offset-[3px] hover:text-accent-light hover:decoration-[#0a7d73] transition-colors";

  const nodes: React.ReactNode[] = [];
  let last = 0;
  const re = new RegExp(INLINE_LINK);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const label = m[1] ?? "";
    const href = m[2] ?? "";
    if (/^https?:\/\//.test(href)) {
      nodes.push(
        <a key={m.index} href={href} target="_blank" rel="noopener" className={cls}>
          {label}
        </a>,
      );
    } else {
      nodes.push(
        <Link key={m.index} href={href} className={cls}>
          {label}
        </Link>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

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
        <LandingNav authedHref={null} homeAnchors partnerNav={partnerNavTypes()} />
        <main className="relative z-10 pt-28 lg:pt-36 pb-20 lg:pb-28 px-5 md:px-10">
          {children}
        </main>
        <Footer homeAnchors />
        {/* Capture modal for the nav's "Join the network" sentinel.
            Renders nothing until a sentinel CTA is clicked. */}
        <PartnerForm />
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
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative rounded-2xl bg-white ring-1 ring-[#101820]/[0.06] card-elev px-6 py-8 sm:px-10 sm:py-10 scroll-mt-28 ${className}`}
    >
      {children}
    </section>
  );
}

/* ── the four-audience grid ──────────────────────────────────────────── */

/**
 * "What this means for you" — the Brief's signature move, mirrored on
 * the site's role system. Four audience cards, teal-edged on cream,
 * 2×2 on desktop and stacked on mobile. Each label links to its lens
 * page, threading every issue back into the platform.
 */
export function TakesGrid({ takes }: { takes: BriefTakes }) {
  return (
    <div className="mt-8">
      <p className="text-[10.5px] tracking-[0.26em] uppercase text-text-dim font-ui font-semibold mb-4">
        What this means for you
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {BRIEF_AUDIENCES.map((a) => (
          <div
            key={a.key}
            className="rounded-r-xl rounded-l-[3px] border-l-[3px] border-accent-light bg-[#f7f4ec] px-5 py-4"
          >
            <Link
              href={a.href}
              className="text-[11px] tracking-[0.14em] uppercase font-ui font-semibold text-text-muted hover:text-accent-light transition-colors w-fit"
            >
              {a.label}
            </Link>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-text-muted">
              <InlineText text={takes[a.key]} />
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
  id,
}: {
  children: React.ReactNode;
  className?: string;
  art?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden rounded-3xl text-white scroll-mt-28 ${className}`}
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
