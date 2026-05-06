import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GridBg, NoiseOverlay } from "@/components/brand/grid-bg";

/**
 * Auth route group layout — minimal centered shell used for signup, login,
 * email verification, forgot password, reset password.
 *
 * Real form logic lands in Phase 1 (Auth.js v5). For now this just gives
 * the right shape so the placeholders feel like the same product.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NoiseOverlay />
      <div className="relative min-h-dvh flex flex-col">
        <GridBg />

        <header className="relative z-10 px-6 md:px-8 py-6">
          <Link href="/" aria-label="BuilderHQ home" className="inline-flex">
            <Logo size={22} />
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>

        <footer className="relative z-10 px-6 md:px-8 py-6 text-[10px] tracking-[0.18em] uppercase text-text-dim">
          © {new Date().getFullYear()} BuilderHQ
        </footer>
      </div>
    </>
  );
}
