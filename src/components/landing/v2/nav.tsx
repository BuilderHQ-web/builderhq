"use client";

/**
 * Landing nav v2 — transparent over the hero, gradient-masked once
 * scrolled, with the docked role lens beside the logo.
 *
 * The dock: after the visitor picks a lens, "for homeowners" (etc.)
 * settles next to the wordmark in the brand's italic serif, sharing
 * `layoutId="role-dock"` with the hero chip label so Motion animates
 * the flight. Docked, it stays a control: click opens a quiet menu to
 * switch lens from anywhere on the page.
 *
 * Centre links are real anchors only (the old nav pointed at sections
 * that no longer existed): how it works, trust, architects, FAQ.
 */

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import type { PartnerNavGroup } from "@/app/(marketing)/partners/partners-data";
import { LENS, ROLE_META, ROLE_ORDER, ROLE_PALETTE } from "./content";
import { useRole } from "./role";

const LINKS = [
  { label: "How it Works", href: "#how" },
  { label: "Trust", href: "#trust" },
  { label: "Our Partners", href: "/partners" },
  { label: "FAQs", href: "#faq" },
] as const;

export function LandingNav({
  authedHref,
  homeAnchors = false,
  partnerNav,
}: {
  /** Dashboard href when a session exists; null when logged out. */
  authedHref: string | null;
  /** On non-landing pages, hash links resolve back to the home page. */
  homeAnchors?: boolean;
  /** Live partners for the "Our Partners" dropdown (server-computed).
   *  Absent or empty → the item stays a plain link to /partners. */
  partnerNav?: PartnerNavGroup[];
}) {
  const { role, docked, flight, setRole } = useRole();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the lens menu on outside click / escape.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const getStarted = authedHref ?? LENS[role].hero.primary.href;
  const resolve = (h: string) => (homeAnchors && h.startsWith("#") ? "/" + h : h);

  return (
    <>
      <nav className="fixed top-2.5 sm:top-4 inset-x-0 z-50 px-3 sm:px-5">
        <div
          className={cn(
            "relative mx-auto max-w-[1580px] flex items-center justify-between gap-4",
            "h-[60px] px-4 sm:px-5 rounded-[22px] sm:rounded-full",
            "bg-[rgba(255,255,255,0.82)] backdrop-blur-xl",
            "border border-[rgba(24,34,44,0.10)]",
            "transition-shadow duration-[420ms] ease-[var(--ease-out)]",
            scrolled
              ? "shadow-[0_14px_44px_-14px_rgba(24,34,44,0.28)]"
              : "shadow-[0_8px_28px_-16px_rgba(24,34,44,0.22)]",
          )}
        >
          {/* Logo + docked lens */}
          <div className="flex items-center gap-2.5 min-w-0" ref={menuRef}>
            <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center shrink-0">
              <Logo height={25} tone="dark" />
            </Link>

            {docked || flight ? (
              <div className="relative min-w-0" style={{ opacity: flight ? 0 : 1 }}>
                <button
                  type="button"
                  onClick={() => !flight && setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-hidden={!!flight}
                  tabIndex={flight ? -1 : 0}
                  aria-label="Switch who BuilderHQ is showing this page for"
                  className="group inline-flex items-center gap-1 min-w-0 rounded-md px-1.5 py-1 hover:bg-[rgba(24,34,44,0.05)] transition-colors"
                >
                  {/* Measured by FlyingLabel to land the dock flight exactly here. */}
                  <span
                    id="nav-role-dock"
                    className="font-ui font-semibold text-[13.5px] sm:text-[14px] leading-none truncate"
                    style={{ color: ROLE_PALETTE[role].accentSoft }}
                  >
                    {ROLE_META[role].dock}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-text-dim transition-transform duration-200 shrink-0",
                      menuOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {menuOpen && !flight ? (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-[calc(100%+8px)] w-52 rounded-lg border border-border bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)] p-1.5 z-50"
                    >
                      <p className="px-2.5 pt-1.5 pb-1 text-[9.5px] tracking-[0.2em] uppercase text-text-dim">
                        Show BuilderHQ
                      </p>
                      {ROLE_ORDER.map((r) => (
                        <button
                          key={r}
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            if (r !== role) setRole(r);
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-2 rounded-md text-[13px] transition-colors",
                            r === role
                              ? "text-accent-light bg-[rgba(0,212,200,0.07)]"
                              : "text-text-muted hover:text-text hover:bg-[rgba(24,34,44,0.05)]",
                          )}
                        >
                          {ROLE_META[r].dock}
                        </button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
          </div>

          {/* Centre anchors — desktop */}
          <ul className="hidden lg:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {LINKS.map((l) =>
              l.label === "Our Partners" && partnerNav?.length ? (
                <PartnersDropdown key={l.href} groups={partnerNav} />
              ) : (
                <li key={l.href}>
                  <a
                    href={resolve(l.href)}
                    className="inline-flex items-center text-[13.5px] font-medium text-text-muted hover:text-text px-3.5 py-2 rounded-full transition-colors duration-[160ms] leading-none"
                  >
                    {l.label}
                  </a>
                </li>
              ),
            )}
          </ul>

          {/* Right — desktop */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Link
              href="/login"
              className="inline-flex items-center text-[13.5px] font-medium text-text-muted hover:text-text px-3.5 h-10 transition-colors leading-none"
            >
              Log in
            </Link>
            <Link
              href={getStarted}
              className="inline-flex items-center justify-center px-5 h-10 rounded-full bg-accent text-accent-contrast text-[13.5px] font-semibold tracking-[0.01em] hover:bg-accent-hover transition-colors duration-[160ms] leading-none shadow-[0_2px_10px_-2px_rgba(0,212,200,0.5)]"
            >
              {authedHref ? "Dashboard" : "Get started"}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="lg:hidden size-11 -mr-2 rounded-md text-text hover:text-accent-light transition-colors flex items-center justify-center"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMobileOpen(false)}
            aria-hidden
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: "rgba(12,18,24,0.32)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          />
        ) : null}
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 top-[78px] z-40 lg:hidden rounded-2xl border border-border-subtle max-h-[calc(100dvh-92px)] overflow-y-auto shadow-[0_30px_70px_-30px_rgba(24,34,44,0.45)]"
            style={{ background: "#faf8f3", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="px-5 pt-5 pb-7 flex flex-col">
              <Link
                href={getStarted}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 h-13 min-h-13 rounded-full bg-accent text-accent-contrast text-[15px] font-semibold tracking-[0.02em] shadow-[0_10px_26px_-10px_rgba(0,212,200,0.6)]"
              >
                {authedHref ? "Open dashboard" : "Get started"}
              </Link>

              {/* Lens switch — same three chips, panel edition */}
              <div className="mt-5 grid grid-cols-2 gap-1.5" role="group" aria-label="Show BuilderHQ for">
                {ROLE_ORDER.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      if (r !== role) setRole(r);
                    }}
                    className={cn(
                      "h-11 rounded-md border text-[12.5px] transition-colors",
                      r === role
                        ? "border-border-accent bg-[rgba(0,212,200,0.08)] text-accent-light font-semibold"
                        : "border-border-subtle text-text-muted",
                    )}
                  >
                    {ROLE_META[r].chipShort}
                  </button>
                ))}
              </div>

              <ul className="mt-4 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <a
                      href={resolve(l.href)}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center min-h-12 px-3 rounded-lg text-[15px] font-medium text-text hover:bg-[rgba(24,34,44,0.05)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-border-subtle/70 flex items-center justify-between">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center min-h-11 px-3 text-[14px] text-text-muted hover:text-text transition-colors"
                >
                  Log in
                </Link>
                <div className="flex items-center gap-4 text-[12px] text-text-dim">
                  <Link href="/about" onClick={() => setMobileOpen(false)} className="hover:text-text transition-colors">
                    About
                  </Link>
                  <span aria-hidden className="text-text-faint/40">·</span>
                  <Link href="/faq" onClick={() => setMobileOpen(false)} className="hover:text-text transition-colors">
                    FAQs
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

/**
 * PartnersDropdown — the "Our Partners" nav item once real partners are
 * live. Hover or click opens a two-column card of the live register
 * (design practices | finance partners), each entry linking straight to
 * its profile, with the full register a hairline below. Data arrives as
 * a server-computed prop, so this stays a lightweight client component.
 */
function PartnersDropdown({ groups }: { groups: PartnerNavGroup[] }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLLIElement>(null);
  const closeTimer = React.useRef<number | null>(null);

  const openNow = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <li ref={ref} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 text-[13.5px] font-medium text-text-muted hover:text-text px-3.5 py-2 rounded-full transition-colors duration-[160ms] leading-none"
      >
        Our Partners
        <ChevronDown
          className={cn(
            "size-3.5 text-text-dim transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-[520px] rounded-2xl border border-border-subtle bg-white shadow-[0_24px_64px_-16px_rgba(24,34,44,0.30)] p-2.5 z-50"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {groups.map((g) => (
                <div key={g.label} className="min-w-0">
                  <p className="px-3 pt-2 pb-1.5 text-[10px] font-medium tracking-[0.18em] uppercase text-text-dim">
                    {g.label}
                  </p>
                  <ul>
                    {g.items.map((it) => (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className="block px-3 py-2 rounded-lg hover:bg-[rgba(24,34,44,0.045)] transition-colors duration-[140ms]"
                        >
                          <span className="block text-[13.5px] font-medium text-text leading-tight truncate">
                            {it.label}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-text-muted leading-tight truncate">
                            {it.sub}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border-subtle/70">
              <Link
                href="/partners"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(24,34,44,0.045)] transition-colors duration-[140ms]"
              >
                <span className="text-[13px] font-medium text-text">
                  Explore the Preferred Partner register
                </span>
                <ArrowUpRight className="size-3.5 text-text-dim transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
