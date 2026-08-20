"use client";

/**
 * Microsoft Clarity — session replay and heatmaps.
 *
 * This is the only tag on the site that records what a visitor did
 * rather than counting that they did it, which makes it the most useful
 * thing here for working out why the homeowner page converts worse than
 * the architect one, and the most dangerous if it is pointed at the
 * wrong page.
 *
 * SO IT IS THE MOST TIGHTLY CONTAINED. Three fences, not one:
 *
 *   1. MARKETING PAGES ONLY. It is not mounted on the auth surfaces at
 *      all, unlike the advertising pixel. Those pages carry password
 *      fields, and a recording taken next to a password field is a
 *      liability no amount of masking makes worth having. It is never
 *      mounted inside the application, whose pages carry a client's
 *      project, drawings and prices.
 *   2. THE SAME URL RULE AS EVERY OTHER TAG. A private partner preview
 *      or welcome page is somebody's draft profile shown to them while
 *      they are being courted. Nothing records there. See lib/meta-url.
 *   3. NOTHING IS IDENTIFIED. Clarity offers an `identify` call that
 *      attaches a name or an email to a recording. It is never called
 *      here and must not be. A recording is about a layout, not a
 *      person.
 *
 * Field masking is set to at least Balanced in the Clarity dashboard,
 * and the forms on public pages that collect contact details carry
 * `data-clarity-mask` as well, so a keystroke is never recorded even if
 * that setting is ever loosened.
 *
 * WHEN IT RUNS. Only when NEXT_PUBLIC_CLARITY_PROJECT_ID is set, which
 * is Vercel's Production scope alone.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { env } from "@/lib/env";
import { isReportableTrackingUrl } from "@/lib/meta-url";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/** Per document, not per mount. */
let booted = false;

function bootClarity(projectId: string): void {
  if (window.clarity) return;
  const queue: unknown[][] = [];
  const stub = (...args: unknown[]) => {
    queue.push(args);
  };
  (stub as unknown as { q: unknown[][] }).q = queue;
  window.clarity = stub as Window["clarity"];

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(tag);
}

export function ClarityTag() {
  const projectId = env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const pathname = usePathname();

  useEffect(() => {
    if (!projectId || !pathname) return;
    // Read the query from the document rather than useSearchParams,
    // which would opt every marketing page out of static rendering.
    if (!isReportableTrackingUrl(pathname, window.location.search)) return;
    if (booted) return;
    booted = true;
    bootClarity(projectId);
  }, [projectId, pathname]);

  return null;
}
