import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Auth shell — minimal centred composition.
 *
 * Single column, generous whitespace, no decorative grid / noise. The
 * first impression for new users; keeping it spare lets the typography
 * carry the brand. Brand mark sits top-left at small scale so it doesn't
 * compete with the page headline.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col">
      <header className="relative z-10 px-5 sm:px-8 lg:px-12 py-6 sm:py-8">
        <Link
          href="/"
          aria-label="BuilderHQ home"
          className="inline-flex items-center min-h-11 -my-2 py-2"
        >
          <Logo size={20} />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-5 sm:px-8 pb-12 sm:pb-24">
        <div className="w-full max-w-[440px] reveal">{children}</div>
      </main>

      <footer
        className="relative z-10 px-5 sm:px-8 lg:px-12 py-6 text-[11px] tracking-[0.16em] uppercase text-text-dim"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        © {new Date().getFullYear()} BuilderHQ
      </footer>
    </div>
  );
}
