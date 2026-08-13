/**
 * Footer v3 — Base44's clean architecture in our colours: brand and a
 * plain-English description on the left, labelled link columns across
 * the right, one hairline, one quiet copyright line. Nothing else.
 */

import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS: Array<{
  label: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    label: "Platform",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Trust and verification", href: "#trust" },
      { label: "Preferred Partners", href: "/partners" },
      { label: "The Build Brief", href: "/build-brief" },
      { label: "FAQs", href: "#faq" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Book a call", href: "/book-a-call" },
      { label: "Contact", href: "mailto:info@builderhq.com.au" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer({ homeAnchors = false }: { homeAnchors?: boolean }) {
  const resolve = (h: string) => (homeAnchors && h.startsWith("#") ? "/" + h : h);
  return (
    <footer
      className="relative border-t border-border-subtle px-5 md:px-10 pt-16 pb-8"
      style={{
        background: "#efeae1",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-12 lg:gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center lg:items-start gap-5 text-center lg:text-left">
            <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center">
              <Logo height={24} tone="dark" />
            </Link>
            <p className="max-w-[44ch] text-[14px] leading-[1.7] text-text-muted">
              BuilderHQ is where Australia’s residential builds get organised.
              Homeowners tender their plans, verified builders price real work,
              and building designers get seen and referred. Free for homeowners,
              no commission, ever.
            </p>
            {/* Talk to a person — the trust signal almost no marketplace
                offers. Real numbers, real reply. */}
            <p className="text-[13px] leading-[1.8] text-text-muted">
              <a href="tel:0416926380" className="inline-block py-2 -my-2 hover:text-text transition-colors">
                0416 926 380
              </a>
              <span aria-hidden className="mx-2 text-text-faint">·</span>
              <a href="tel:0452280062" className="inline-block py-2 -my-2 hover:text-text transition-colors">
                0452 280 062
              </a>
              <span aria-hidden className="mx-2 text-text-faint">·</span>
              <a
                href="mailto:info@builderhq.com.au"
                className="inline-block py-2 -my-2 hover:text-text transition-colors"
              >
                info@builderhq.com.au
              </a>
            </p>

            {/* The HIA mark, as an accreditation lockup at the foot of
                the brand column: small, in colour, above the rule. The
                badge is close to square, so 34px reads at the weight of
                a line of body text beside it rather than shouting. */}
            <div className="mt-1 flex items-center gap-3">
              <Image
                src="/Homepage_logos/hia-badge.png"
                alt=""
                width={414}
                height={468}
                className="h-[34px] w-auto shrink-0"
              />
              <span className="text-[12px] leading-[1.45] text-text-dim text-left">
                In association with the
                <br />
                Housing Industry Association
              </span>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:justify-items-end">
            {COLUMNS.map((col) => (
              <nav key={col.label} aria-label={col.label} className="flex flex-col items-center sm:items-start gap-3.5">
                <p className="text-[11px] tracking-[0.18em] uppercase text-text-dim font-semibold">
                  {col.label}
                </p>
                {col.links.map((l) =>
                  l.href.startsWith("/") ? (
                    <Link key={l.label} href={resolve(l.href)} className="inline-block py-2 -my-2 text-[14px] text-text-muted hover:text-text transition-colors">
                      {l.label}
                    </Link>
                  ) : (
                    <a key={l.label} href={resolve(l.href)} className="inline-block py-2 -my-2 text-[14px] text-text-muted hover:text-text transition-colors">
                      {l.label}
                    </a>
                  ),
                )}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border-subtle/70 flex flex-col lg:flex-row items-center lg:items-baseline justify-between gap-2">
          <p className="text-[12.5px] text-text-dim text-center lg:text-left">
            © {new Date().getFullYear()} BuilderHQ · ABN 70 697 584 722
          </p>
          <p className="text-[12.5px] text-text-dim text-center lg:text-right">
            Melbourne, Victoria, Australia
          </p>
        </div>
      </div>
    </footer>
  );
}
