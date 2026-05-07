"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

/**
 * Sticky landing nav. Transparent at top of page; gains a glass blur +
 * subtle border once scrolled. Center menu shows section anchors; right
 * side has Log in + Get Started.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <div className="mx-auto max-w-[1320px] px-6 md:px-10 flex items-center justify-between">
        <Link href="/" aria-label="BuilderHQ home" className="inline-flex">
          <Logo size={22} />
        </Link>

        <ul className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {[
            { label: "For Owners", href: "#owners" },
            { label: "For Builders", href: "#builders" },
            { label: "How it Works", href: "#how" },
            { label: "Platform", href: "#features" },
          ].map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[10px] tracking-[0.2em] uppercase text-text-faint hover:text-text px-3 py-2 rounded-md transition-colors duration-[160ms]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(
              "inline-flex items-center justify-center px-4 h-9 rounded-full",
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
