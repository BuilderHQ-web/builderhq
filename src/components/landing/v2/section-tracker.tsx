"use client";

/**
 * SectionTracker — fires one `section_viewed` event per landmark section
 * per pageview, via a single IntersectionObserver. This is the scroll-depth
 * signal for the landing: which chapters people actually reach, and where
 * they stop. Renders nothing.
 */

import * as React from "react";

import { track } from "@/lib/analytics";

const SECTION_IDS = [
  "hero",
  "choose",
  "how",
  "trust",
  "pricing",
  "network",
  "ecosystem",
  "brief",
  "faq",
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
      // 35% visible = the visitor genuinely reached the section, not a
      // one-pixel graze while scrolling past.
      { threshold: 0.35 },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
