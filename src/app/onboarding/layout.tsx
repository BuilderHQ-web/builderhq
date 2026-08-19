import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/modules/auth";
import { hasCompletedOnboarding } from "@/modules/profiles";
import { Logo } from "@/components/brand/logo";
import { GridBg, NoiseOverlay } from "@/components/brand/grid-bg";

/**
 * Onboarding shell — focused, sidebar-less, single-column.
 *
 * Sits OUTSIDE the (app) route group so the dashboard chrome doesn't
 * appear behind the wizard. Auth-required: proxy.ts blocks unauth'd
 * users at the edge; this layout double-checks server-side. If
 * onboarding is already complete, redirect to the role dashboard.
 */
async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/onboarding");

  const role = session.user.role ?? null;
  // Admins don't go through onboarding — bounce to admin dashboard.
  if (role === "admin") redirect("/admin");

  const done = await hasCompletedOnboarding(session.user.id, role);
  if (done) {
    if (role === "builder") redirect("/builder");
    if (role === "architect") redirect("/architect");
    redirect("/owner");
  }

  return (
    <>
      <NoiseOverlay />
      <div className="relative min-h-dvh flex flex-col">
        <GridBg />

        {/* A real bar, not a floating logo. The hairline gives the page a
            top edge to sit under, and naming the account answers the
            question every first screen after a signup raises: which
            account am I actually in. */}
        <header className="relative z-10 border-b border-border-subtle bg-[rgba(251,249,244,0.72)] backdrop-blur-[2px]">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5 md:px-8">
            <Link
              href="/"
              aria-label="BuilderHQ home"
              className="inline-flex items-center min-h-11 -my-2 py-2"
            >
              <Logo size={22} tone="dark" />
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              {session.user.email ? (
                <span className="hidden max-w-[220px] truncate text-[12px] text-text-dim sm:inline">
                  {session.user.email}
                </span>
              ) : null}
              <span aria-hidden className="hidden text-border-strong sm:inline">
                ·
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-[11px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors min-h-11 -my-2 py-2 px-1"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-start justify-center px-5 sm:px-6 py-6 sm:py-8 md:py-12">
          <div className="w-full max-w-[800px]">{children}</div>
        </main>

        <footer
          className="relative z-10 py-6 text-[10px] tracking-[0.18em] uppercase text-text-dim"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {/* Same measure as the header, so the page has two straight edges
              rather than one. */}
          <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-6 md:px-8">
            © {new Date().getFullYear()} BuilderHQ
          </div>
        </footer>
      </div>
    </>
  );
}
