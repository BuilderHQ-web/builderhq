"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

/**
 * Premium minimal nav — Resend-inspired.
 * Clean, transparent, no visual noise.
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

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const anchor = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  const links = [
    { label: "Features", href: anchor("features") },
    { label: "How it works", href: anchor("how") },
    { label: "FAQ", href: anchor("faq") },
  ] as const;

  return (
    <>
      {/* Subtle top gradient fade for scroll separation */}
      <div
        aria-hidden
        className={cn(
          "fixed top-0 inset-x-0 z-40 h-20 pointer-events-none",
          "transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "linear-gradient(180deg, rgba(5,10,15,0.95) 0%, rgba(5,10,15,0.8) 50%, transparent 100%)",
        }}
      />

      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-500",
          scrolled ? "py-4" : "py-6",
        )}
      >
        <div className="mx-auto max-w-[1200px] px-6 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            aria-label="BuilderHQ home"
            className="relative z-10"
          >
            <Logo height={24} />
          </Link>

          {/* Desktop: Center links */}
          <ul className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[14px] text-text-muted hover:text-text transition-colors duration-200"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: Right actions */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-[14px] text-text-muted hover:text-text transition-colors duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={cn(
                "inline-flex items-center justify-center px-5 h-10 rounded-full",
                "bg-text text-bg text-[14px] font-medium",
                "hover:bg-text/90 transition-colors duration-200",
              )}
            >
              Get started
            </Link>
          </div>

          {/* Mobile: Actions */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-4 h-10 rounded-full bg-text text-bg text-[13px] font-medium"
            >
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="size-10 flex items-center justify-center text-text-muted hover:text-text transition-colors"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden bg-bg/98 backdrop-blur-xl"
          >
            <div className="pt-24 px-6">
              <div className="flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-4 text-[18px] text-text border-b border-border-subtle"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="py-4 text-[18px] text-text-muted"
                >
                  Log in
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
