/**
 * Footer — brand and a plain-English description on the left, four
 * labelled link columns on the right, one hairline, one entity line.
 * Nothing else.
 *
 * Every word comes from content.ts; the entity and the ABN come from
 * lib/company.ts, so the site can never contradict itself about who it
 * legally is.
 */

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { COMPANY_LOCATION, companyFooterLine } from "@/lib/company";
import { FOOTER } from "./content";

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-10">
          {/* Brand */}
          <div className="flex flex-col items-center lg:items-start gap-5 text-center lg:text-left">
            <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center">
              <Logo height={24} tone="dark" />
            </Link>
            <p className="max-w-[46ch] text-[16px] leading-[1.65] text-text-muted">
              {FOOTER.description}
            </p>
            {/* Talk to a person. Real numbers, answered by us. */}
            <p className="text-[16px] leading-[1.8] text-text-muted">
              <a href="tel:0416926380" className="hover:text-text transition-colors">
                0416 926 380
              </a>
              <span aria-hidden className="mx-2 text-text-faint">
                ·
              </span>
              <a href="tel:0452280062" className="hover:text-text transition-colors">
                0452 280 062
              </a>
              <span aria-hidden className="mx-2 text-text-faint">
                ·
              </span>
              <a
                href="mailto:info@builderhq.com.au"
                className="hover:text-text transition-colors"
              >
                info@builderhq.com.au
              </a>
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10">
            {FOOTER.columns.map((col) => (
              <nav
                key={col.title}
                aria-label={col.title}
                className="flex flex-col items-center sm:items-start gap-3.5"
              >
                <p className="text-[11px] tracking-[0.18em] uppercase text-text-muted font-semibold">
                  {col.title}
                </p>
                {col.links.map((l) =>
                  l.href.startsWith("mailto:") ? (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-[16px] text-text-muted hover:text-text transition-colors"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      key={l.label}
                      href={resolve(l.href)}
                      className="text-[16px] text-text-muted hover:text-text transition-colors"
                    >
                      {l.label}
                    </Link>
                  ),
                )}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border-subtle/70 flex flex-col lg:flex-row items-center lg:items-baseline justify-between gap-2">
          <p className="text-[14px] text-text-muted text-center lg:text-left">
            {companyFooterLine({ withLocation: false })}
          </p>
          <p className="text-[14px] text-text-muted text-center lg:text-right">
            {COMPANY_LOCATION}
          </p>
        </div>
      </div>
    </footer>
  );
}
