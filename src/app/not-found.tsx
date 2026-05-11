/**
 * Global 404. Renders for any unmatched route across the entire app.
 * Server component — no client JS shipped. Brand-aligned.
 */

import Link from "next/link";
import { Home, Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Page not found · BuilderHQ",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-16 bg-bg-deep">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <div
          aria-hidden
          className="relative size-16 rounded-full border border-border-subtle flex items-center justify-center text-accent-light"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(0,212,200,0.18), rgba(255,255,255,0.018))",
          }}
        >
          <Compass className="size-6" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
            404 · not found
          </span>
          <h1 className="font-display uppercase tracking-[-0.012em] text-[64px] leading-[0.9] text-text">
            Off the map
          </h1>
          <p className="text-[13.5px] leading-[22px] text-text-muted max-w-sm">
            The page you&apos;re after doesn&apos;t exist — moved, renamed, or
            never built. Head back to the start.
          </p>
        </div>

        <div className="mt-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 min-w-[200px]",
            )}
          >
            <Home className="size-4" />
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
