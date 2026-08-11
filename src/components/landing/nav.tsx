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

  // Close the mobile menu whenever we navigate away. Derived during
  // render from the path the panel was opened on, rather than set from
  // an effect: setting state in an effect runs a second render pass and
  // lets the stale panel paint once on the new route first.
  const [openedAt, setOpenedAt] = React.useState(pathname);
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setMobileOpen(false);
  }

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
      {/* Soft gradient mask that fades the page bg into the nav so
          content scrolling underneath doesn't poke through the nav
          plate, without creating a visible "stripe" at the top. Sits
          BEHIND the nav, in front of the page. Resend uses the same
          trick — the top edge feels like one continuous canvas. */}
      <div
        aria-hidden
        className={cn(
          "fixed top-0 inset-x-0 z-40 h-24 pointer-events-none",
          "transition-opacity duration-[420ms] ease-[var(--ease-out)]",
          scrolled ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "linear-gradient(180deg, #03090f 0%, #03090f 55%, rgba(3,9,15,0) 100%)",
        }}
      />
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-[padding] duration-[420ms] ease-[var(--ease-out)]",
          // No background, no border — the gradient mask behind us
          // does the work of separating from page content. When the
          // mobile menu is open we paint a solid plate so the panel
          // beneath us has something to anchor to visually.
          mobileOpen
            ? "bg-[#03090f] border-b border-border-subtle py-3"
            : scrolled
              ? "bg-transparent py-3"
              : "bg-transparent py-5",
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

          {/* Right side — mobile actions: hamburger only. The Get
              started CTA is promoted to the top of the slide-down panel
              so the header itself stays minimal and uncluttered. */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="size-11 -mr-2 rounded-md text-text hover:text-accent-light hover:bg-[rgba(126,245,237,0.06)] transition-colors flex items-center justify-center"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down panel — full-width, solid dark plate (no
          glass — keeps the iOS status-bar colour seamless with the
          page below). The Get started CTA leads at the top, links sit
          below it, and Log in plus quick utility links anchor the
          panel at the bottom. */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            data-lenis-prevent
            className={cn(
              "fixed inset-x-0 top-[68px] z-40 md:hidden",
              "border-b border-border-subtle",
              "max-h-[calc(100dvh-68px)] overflow-y-auto",
            )}
            style={{
              background: "#03090f",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="px-5 pt-5 pb-7 flex flex-col">
              {/* Primary CTA — promoted from the header. Full-width on
                  mobile so it reads as the obvious next step. */}
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-14 rounded-full",
                  "bg-accent text-accent-contrast text-[15px] font-semibold tracking-[0.02em]",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_0_1px_rgba(0,212,200,0.45),0_0_28px_-4px_rgba(0,212,200,0.55)]",
                  "transition-[background-color] duration-[160ms] hover:bg-accent-hover",
                )}
              >
                Get started
              </Link>

              {/* Section anchors */}
              <ul className="mt-5 flex flex-col gap-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center min-h-12 px-3 rounded-md text-[15px] text-text hover:bg-[rgba(126,245,237,0.06)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Secondary row — Log in left, utility links right. */}
              <div className="mt-5 pt-4 border-t border-border-subtle/70 flex items-center justify-between">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center min-h-11 px-3 text-[14px] tracking-[0.04em] text-text-muted hover:text-text transition-colors"
                >
                  Log in
                </Link>
                <div className="flex items-center gap-4 text-[12px] text-text-dim">
                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-text transition-colors"
                  >
                    About
                  </Link>
                  <span aria-hidden className="text-text-faint/40">·</span>
                  <Link
                    href="/faq"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-text transition-colors"
                  >
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
