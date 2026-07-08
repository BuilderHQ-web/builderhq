import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";

import { Logo } from "@/components/brand/logo";

import { PARTNERS, getPartner } from "../../partners-data";
import { PartnerProfileSections, partnerHeaderProps } from "../../partner-profile";

/**
 * /partners/preview/[slug] — a private, not-live preview of a partner's
 * page, for the partner to review before it goes live.
 *
 * Deliberately standalone: minimal chrome (logo only, no nav into the
 * directory), a "private preview / not live" ribbon, and noindex. The
 * partner sees only their own page and cannot wander into the register or
 * see other draft profiles. Shared on a Vercel preview deployment, never
 * production.
 */

export function generateStaticParams() {
  return PARTNERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const partner = getPartner(slug);
  return {
    title: partner ? `${partner.name} · Private preview` : "Private preview",
    // Never index or surface a private preview.
    robots: { index: false, follow: false },
  };
}

export default async function PartnerPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner) notFound();

  const header = partnerHeaderProps(partner);

  return (
    <div className="lp-light">
      {/* Canvas — the landing's calm cream, fixed behind everything. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "#f4f1ea" }}>
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
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
          }}
        />
      </div>

      {/* Minimal top bar — brand only, no navigation. */}
      <div className="relative z-10 flex items-center justify-between px-5 md:px-10 pt-8">
        <span className="inline-flex items-center">
          <Logo height={24} tone="dark" />
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-white/70 backdrop-blur px-3.5 h-8 text-[11px] font-semibold tracking-[0.06em] uppercase text-text-dim">
          <Lock className="size-3" />
          Private preview
        </span>
      </div>

      <main className="relative z-10 pt-10 lg:pt-14 pb-20 lg:pb-28 px-5 md:px-10">
        <div className="mx-auto max-w-[860px]">
          {/* Not-live ribbon — reassure the partner this is a draft for them. */}
          <div
            className="mb-10 rounded-xl border px-5 py-4 flex items-start gap-3"
            style={{
              borderColor: "rgba(224,166,60,0.35)",
              background: "rgba(224,166,60,0.08)",
            }}
          >
            <Lock className="size-4 mt-0.5 shrink-0" style={{ color: "#a9781f" }} />
            <p className="text-[13px] leading-[1.6] text-text">
              <span className="font-semibold">This is a private preview of your BuilderHQ profile.</span>{" "}
              It is not live and is only visible to you. Have a look, and tell
              us anything you would like changed before we publish it.
            </p>
          </div>

          {/* Identity header — same block the public page uses. */}
          <header className="mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.7)]" />
              {header.kicker}
            </span>
            <h1 className="mt-6 font-ui font-semibold tracking-[-0.04em] leading-[1.04] text-[clamp(2.5rem,4.6vw+1rem,4.6rem)] text-text break-words">
              {header.title}
            </h1>
            <p className="mt-6 max-w-[58ch] text-[16px] leading-[1.7] text-text-muted">
              {header.sub}
            </p>
            <p className="mt-5 text-[11px] tracking-[0.18em] uppercase text-text-dim">
              {header.meta}
            </p>
          </header>

          <div className="relative">
            <PartnerProfileSections partner={partner} preview />
          </div>

          {/* Minimal footer. */}
          <footer className="mt-20 pt-6 border-t border-border-subtle/70">
            <p className="text-[12px] text-text-dim">
              BuilderHQ · ABN 70 697 584 722 · A private preview, not yet live.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
