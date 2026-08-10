"use client";

/**
 * SectionTracker — fires one `section_viewed` event per landmark section
 * per pageview, via a single IntersectionObserver. This is the scroll-depth
 * signal for the landing: which chapters people actually reach, and where
 * they stop. Renders nothing.
 */

import * as React from "react";

import { track } from "@/lib/analytics";

/**
 * The eight landmarks of the home page, in reading order. Keep this list
 * in step with landing.tsx: an id that drifts stops reporting silently,
 * which is the worst kind of analytics bug. `proof` and `close` are
 * supplied by wrappers in landing.tsx; the rest sit on the section
 * elements themselves.
 */
const SECTION_IDS = [
  "hero",
  "problem",
  "how",
  "trust",
  "ecosystem",
  "proof",
  "faq",
  "close",
] as const;

export function SectionTracker() {
  React.useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!entry.isIntersecting || seen.has(id)) continue;
          seen.add(id);
          track("section_viewed", { id });
          observer.unobserve(entry.target);
        }
      },
      // The root is squeezed to the middle third of the viewport, so a
      // section counts as read when it passes under the reader's eye.
      // A visible-fraction threshold cannot do this job: a section
      // taller than the screen never reaches one.
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
