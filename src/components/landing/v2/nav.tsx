"use client";

/**
 * Landing nav v2 — transparent over the hero, a soft shadow once
 * scrolled. Logo left, one centre rail, log in and the single primary
 * action right.
 *
 * The role dock is gone with the lens system. Audiences now live in the
 * nav where a visitor expects to find them: a "Who it's for" group that
 * leads to the three dedicated pages under /for.
 *
 * Every word here comes from content.ts. The two dropdowns are
 * structure rather than copy, so the rail is composed by hand.
 */

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import type { PartnerNavType } from "@/app/(marketing)/partners/partners-data";
import { HERO, NAV_LINKS, WHO_ITS_FOR } from "./content";

/** Where the two dropdowns sit: each follows the plain link it is keyed
 *  to, on desktop and in the mobile panel alike. */
const AFTER: Record<string, "who" | "partners" | undefined> = {
  "/#how": "who",
  "/pricing": "partners",
};

const PARTNERS_HREF = "/partners";
const PARTNERS_LABEL = "Our Partners";

const navLinkClass =
  "inline-flex items-center text-[16px] font-medium text-text-muted hover:text-text px-3 py-2 rounded-full transition-colors duration-[160ms] leading-none";

const mobileLinkClass =
  "flex items-center min-h-12 px-3 rounded-lg text-[16px] font-medium text-text hover:bg-[rgba(24,34,44,0.05)] transition-colors";

export function LandingNav({
  authedHref,
  homeAnchors = false,
  partnerNav,
}: {
  /** Dashboard href when a session exists; null when logged out. */
  authedHref: string | null;
  /** Kept for pages that still hand us bare hash links. */
  homeAnchors?: boolean;
  /** Disciplines + live counts for the "Our Partners" dropdown
   *  (server-computed). Absent or empty → the item stays a plain link
   *  to /partners. */
  partnerNav?: PartnerNavType[];
}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const getStarted = authedHref ?? HERO.primary.href;
  const ctaLabel = authedHref ? "Open your dashboard" : HERO.primary.label;
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
            scrolled ? "card-elev-lg" : "card-elev",
          )}
        >
          <Link
            href="/"
            aria-label="BuilderHQ home"
            className="inline-flex items-center shrink-0"
          >
            <Logo height={25} tone="dark" />
          </Link>

          {/* Centre rail — desktop */}
          <ul className="hidden xl:flex flex-1 items-center justify-center gap-1">
            {NAV_LINKS.map((l) => (
              <React.Fragment key={l.href}>
                <li>
                  <Link href={resolve(l.href)} className={navLinkClass}>
                    {l.label}
                  </Link>
                </li>
                {AFTER[l.href] === "who" ? <WhoItsForDropdown /> : null}
                {AFTER[l.href] === "partners" ? (
                  partnerNav?.length ? (
                    <PartnersDropdown types={partnerNav} />
                  ) : (
                    <li>
                      <Link href={PARTNERS_HREF} className={navLinkClass}>
                        {PARTNERS_LABEL}
                      </Link>
                    </li>
                  )
                ) : null}
              </React.Fragment>
            ))}
          </ul>

          {/* Right — desktop */}
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center text-[16px] font-medium text-text-muted hover:text-text px-3.5 h-10 transition-colors leading-none"
            >
              Log in
            </Link>
            <Link
              href={getStarted}
              className="inline-flex items-center justify-center px-5 h-10 rounded-full bg-accent text-accent-contrast text-[16px] font-semibold hover:bg-accent-hover transition-colors duration-[160ms] leading-none"
            >
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="xl:hidden size-11 -mr-2 rounded-md text-text hover:text-accent-light transition-colors flex items-center justify-center"
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
            className="fixed inset-0 z-30 xl:hidden"
            style={{
              background: "rgba(12,18,24,0.32)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />
        ) : null}
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 top-[78px] z-40 xl:hidden rounded-2xl border border-border-subtle max-h-[calc(100dvh-92px)] overflow-y-auto card-elev-lg"
            style={{ background: "#faf8f3", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="px-5 pt-5 pb-7 flex flex-col">
              <Link
                href={getStarted}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center h-13 min-h-13 rounded-full bg-accent text-accent-contrast text-[16px] font-semibold"
              >
                {ctaLabel}
              </Link>

              <ul className="mt-5 flex flex-col gap-0.5">
                {NAV_LINKS.map((l) => (
                  <React.Fragment key={l.href}>
                    <li>
                      <Link
                        href={resolve(l.href)}
                        onClick={() => setMobileOpen(false)}
                        className={mobileLinkClass}
                      >
                        {l.label}
                      </Link>
                    </li>
                    {AFTER[l.href] === "who"
                      ? WHO_ITS_FOR.map((w) => (
                          <li key={w.href}>
                            <Link
                              href={w.href}
                              onClick={() => setMobileOpen(false)}
                              className={mobileLinkClass}
                            >
                              {w.label}
                            </Link>
                          </li>
                        ))
                      : null}
                    {AFTER[l.href] === "partners" ? (
                      <li>
                        <Link
                          href={PARTNERS_HREF}
                          onClick={() => setMobileOpen(false)}
                          className={mobileLinkClass}
                        >
                          {PARTNERS_LABEL}
                        </Link>
                      </li>
                    ) : null}
                  </React.Fragment>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-border-subtle/70 flex items-center justify-between">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center min-h-11 px-3 text-[16px] font-medium text-text-muted hover:text-text transition-colors"
                >
                  Log in
                </Link>
                <div className="flex items-center gap-4 text-[16px] text-text-muted">
                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-text transition-colors"
                  >
                    About
                  </Link>
                  <span aria-hidden className="text-text-faint">
                    ·
                  </span>
                  <Link
                    href="/faq"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-text transition-colors"
                  >
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
 * WhoItsForDropdown — the three audiences, and nothing else.
 *
 * A menu of three destinations does not need descriptions or artwork;
 * the pages behind it do the arguing. Opens on hover, toggles on click,
 * closes on escape or an outside press.
 */
function WhoItsForDropdown() {
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
        className={cn(navLinkClass, "gap-1")}
      >
        Who it’s for
        <ChevronDown
          className={cn(
            "size-3.5 text-text-muted transition-transform duration-200",
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
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-[232px] rounded-2xl border border-border-subtle bg-white card-elev-lg p-2 z-50"
          >
            {WHO_ITS_FOR.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[16px] font-medium text-text transition-colors duration-[140ms] hover:bg-[rgba(24,34,44,0.04)]"
              >
                {w.label}
              </Link>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/**
 * PartnersDropdown — the "Our Partners" menu.
 *
 * A front door, not an index: it lists the DISCIPLINES in the register
 * with a live count each, then the two things a visitor actually wants
 * next (explore the register, or join it). Deliberately never lists
 * individual partners — the panel stays one fixed size whether the
 * network holds twenty practices or five hundred, the register's map
 * and filters do the finding, and being "in the menu" never becomes a
 * status signal between partners.
 */
function PartnersDropdown({ types }: { types: PartnerNavType[] }) {
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
      const target = e.target as HTMLElement | null;
      if (!ref.current?.contains(target as Node)) {
        setOpen(false);
        return;
      }
      // A sentinel CTA inside the panel (Join the network) opens the
      // capture modal instead of navigating. Close behind it, or the
      // menu sits open under the modal. This runs on the native
      // mousedown rather than a React onClick because <PartnerForm>'s
      // interceptor stops click propagation in the capture phase.
      if (target?.closest?.('a[href^="#join-"]')) setOpen(false);
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
        className={cn(navLinkClass, "gap-1")}
      >
        {PARTNERS_LABEL}
        <ChevronDown
          className={cn(
            "size-3.5 text-text-muted transition-transform duration-200",
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
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-[352px] rounded-2xl border border-border-subtle bg-white card-elev-lg p-2 z-50"
          >
            <p className="px-3 pt-2.5 pb-1.5 text-[11px] font-medium tracking-[0.18em] uppercase text-text-muted">
              The Preferred Partner register
            </p>

            {/* One row per discipline, the name leading. No tally: the
                register is a matter of who is on it, not how many. A list
                rather than tiles: it stays even as the register widens,
                and never grows a scrollbar. */}
            {types.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setOpen(false)}
                className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-[140ms] hover:bg-[rgba(24,34,44,0.04)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium leading-none text-text">
                    {t.label}
                  </span>
                  <span className="mt-1.5 block text-[14px] leading-[1.5] text-text-muted">
                    {t.sub}
                  </span>
                </span>
              </Link>
            ))}

            <div className="mt-1.5 pt-1.5 border-t border-border-subtle/70">
              <Link
                href="/partners"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(24,34,44,0.04)] transition-colors duration-[140ms]"
              >
                <span className="text-[16px] font-medium text-text">
                  Explore the register
                </span>
                <ArrowUpRight className="size-3.5 text-text-muted transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="#join-network"
                className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(24,34,44,0.04)] transition-colors duration-[140ms]"
              >
                <span className="text-[16px] text-text-muted group-hover:text-text transition-colors">
                  Join the network
                </span>
                <ArrowUpRight className="size-3.5 text-text-muted transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
