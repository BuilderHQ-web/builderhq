"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever we navigate away. usePathname
  // updates on route change, so this handler clears the panel without
  // any extra wiring on every Link.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open so the user
  // can't accidentally scroll the page underneath it.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // From the homepage we want the in-page anchor jump. From any other
  // page we route to "/" + the hash so Next handles the navigation
  // and the browser handles the scroll.
  const anchor = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  const links = [
    { label: "For owners", href: anchor("owners") },
    { label: "For builders", href: anchor("builders") },
    { label: "How it works", href: anchor("how") },
    { label: "Platform", href: anchor("features") },
  ] as const;

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-[background,backdrop-filter,border-color,padding] duration-[420ms] ease-[var(--ease-out)]",
          scrolled || mobileOpen
            ? "bg-bg/80 backdrop-blur-xl border-b border-border-subtle py-3"
            : "bg-transparent border-b border-transparent py-5",
        )}
      >
        <div className="relative mx-auto max-w-[1320px] px-6 md:px-10 flex items-center justify-between">
          <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center">
            <Logo height={26} />
          </Link>

          {/* Desktop nav (md+): centred section anchors */}
          <ul className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {links.map((l) => (
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

          {/* Right side — desktop actions */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Right side — mobile actions: Get started button + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-4 h-9 rounded-full leading-none bg-accent text-accent-contrast text-[12px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors duration-[160ms]"
            >
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="size-9 rounded-md border border-border-subtle text-text-muted hover:text-text hover:bg-[rgba(255,255,255,0.025)] transition-colors flex items-center justify-center"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down panel — full-width, dark glass, centered
           link list. Sits below the nav bar with a subtle reveal. */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed inset-x-0 top-[58px] z-40 md:hidden",
              "bg-bg/95 backdrop-blur-xl border-b border-border-subtle",
            )}
          >
            <div className="px-6 py-5 flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-md text-[14px] tracking-[0.04em] text-text hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 pt-4 border-t border-border-subtle/60 flex items-center justify-between">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-[13px] tracking-[0.04em] text-text-muted hover:text-text transition-colors"
                >
                  Log in
                </Link>
                <div className="flex items-center gap-3 text-[11px] text-text-dim">
                  <Link href="/about" onClick={() => setMobileOpen(false)} className="hover:text-text transition-colors">
                    About
                  </Link>
                  <span className="text-text-faint/50">·</span>
                  <Link href="/faq" onClick={() => setMobileOpen(false)} className="hover:text-text transition-colors">
                    FAQ
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
