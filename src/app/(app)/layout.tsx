import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Authenticated app shell — owner, builder, and admin dashboards all
 * compose into this layout.
 *
 * Phase 0 (now): minimal top-bar so placeholder pages can be navigated.
 * Phase 1: this is where session enforcement, role-based redirects,
 * sidebar navigation, and the command-palette get wired up.
 *
 * Auth gating moves to src/middleware.ts before this layout runs — never
 * rely on this component to enforce access.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30">
        <div className="glass">
          <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-6">
            <div className="flex items-center gap-6">
              <Link href="/" aria-label="BuilderHQ home" className="inline-flex">
                <Logo size={20} />
              </Link>
              <nav className="hidden md:flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-text-faint">
                <Link href="/owner" className="px-3 py-1.5 rounded-tight hover:text-text hover:bg-surface-1 transition-colors">Owner</Link>
                <Link href="/builder" className="px-3 py-1.5 rounded-tight hover:text-text hover:bg-surface-1 transition-colors">Builder</Link>
                <Link href="/admin" className="px-3 py-1.5 rounded-tight hover:text-text hover:bg-surface-1 transition-colors">Admin</Link>
              </nav>
            </div>
            <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
              Phase 0 · placeholder shell
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
