"use client";

/**
 * Global error boundary — catches everything that wasn't already
 * caught by a deeper boundary. Renders a brand-aligned fallback
 * instead of Next.js's default white page.
 *
 * Sentry capture lives here too: a server crash that bubbles into
 * this client component still gets reported because the digest +
 * stack travel across the boundary.
 *
 * Note: Next.js needs this to be a CLIENT component (use of useEffect
 * + the `reset` prop). It's wrapped by its own error boundary inside
 * the framework — no risk of recursion.
 */

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertOctagon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry if it's loaded. The dynamic import keeps the
    // Sentry SDK out of the boundary's critical path — if Sentry
    // itself is broken, the page still renders.
    void (async () => {
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureException(error);
      } catch {
        /* Sentry not installed in this environment — fine */
      }
    })();
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-16 bg-bg-deep">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <div
          aria-hidden
          className="relative size-16 rounded-full border border-border-subtle flex items-center justify-center text-danger"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(255,80,80,0.18), rgba(255,255,255,0.018))",
          }}
        >
          <AlertOctagon className="size-6" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] tracking-[0.22em] uppercase text-danger font-ui font-medium">
            Something broke
          </span>
          <h1 className="font-display uppercase tracking-[-0.012em] text-[44px] leading-[0.95] text-text">
            Take two
          </h1>
          <p className="text-[13.5px] leading-[22px] text-text-muted max-w-sm">
            An unexpected error stopped this page from rendering. We&apos;ve
            logged the details — try again, or head home and we&apos;ll get you
            moving.
          </p>
        </div>

        {error.digest ? (
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-text-dim font-mono">
            Ref · {error.digest}
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
          <Button
            type="button"
            size="lg"
            onClick={() => reset()}
            className="gap-2 min-w-[160px]"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "gap-2 min-w-[160px]",
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
