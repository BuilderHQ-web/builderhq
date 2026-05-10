"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

/**
 * Sticky landing nav. Transparent at top of page, glass blur once
 * scrolled. Center menu shows section anchors; right side has
 * Log in + Get started.
 *
 * Section anchors are absolute (`/#owners` etc.) so they work from
 * /about, /faq, /terms, /privacy, etc. — clicking takes the user
 * back to the homepage and scrolls to the section. On the homepage
 * itself, browsers strip the leading "/" for the same-page jump.
 *
 * `items-center` on the inner flex row + `flex items-center` on the
 * absolutely-positioned <ul> guarantees the centre menu sits on the
 * exact baseline as the logo and the right-side actions.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // From the homepage we want the in-page anchor jump (no router push,
  // no flash). From any other page we route to "/" + the hash so
  // Next handles the navigation and the browser handles the scroll.
  const anchor = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "transition-[background,backdrop-filter,border-color,padding] duration-[420ms] ease-[var(--ease-out)]",
        scrolled
          ? "bg-bg/80 backdrop-blur-xl border-b border-border-subtle py-3"
          : "bg-transparent border-b border-transparent py-5",
      )}
    >
      <div className="relative mx-auto max-w-[1320px] px-6 md:px-10 flex items-center justify-between">
        <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center">
          <Logo height={26} />
        </Link>

        <ul className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[
            { label: "For owners", href: anchor("owners") },
            { label: "For builders", href: anchor("builders") },
            { label: "How it works", href: anchor("how") },
            { label: "Platform", href: anchor("features") },
          ].map((l) => (
            <li key={l.href} className="flex items-center">
              <Link
                href={l.href}
                className="inline-flex items-center text-[10px] tracking-[0.2em] uppercase text-text-faint hover:text-text px-3 py-2 rounded-md transition-colors duration-[160ms] leading-none"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-text px-3 h-9 transition-colors leading-none"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(
              "inline-flex items-center justify-center px-4 h-9 rounded-full leading-none",
              "bg-accent text-accent-contrast text-[12px] font-medium tracking-[0.04em]",
              "hover:bg-accent-hover transition-colors duration-[160ms]",
            )}
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
