"use client";

import * as React from "react";
import type { LenisOptions } from "lenis";
import { ReactLenis } from "lenis/react";

/**
 * Premium smooth-scroll, mounted once at the root.
 *
 * Lenis intercepts native wheel + touch scroll and runs it through a
 * `requestAnimationFrame` loop with exponential ease-out. The result
 * is the buttery, "expensive" scroll feel of Linear, Resend, Vercel,
 * Stripe and most Awwwards-winning sites.
 *
 * Tuning rationale
 * ───────────────
 *   · `lerp: 0.1` — the per-frame interpolation factor. Lower is
 *     silkier; higher is more responsive. 0.1 is the consensus
 *     sweet spot every studio reaches for.
 *   · `duration: 1.2` — controls the timing of programmatic
 *     `lenis.scrollTo()` calls (anchor links, "back to top").
 *     Natural-feeling at this length without feeling sluggish.
 *   · `easing: expo-out` — the GSAP-canonical scroll easing curve.
 *     Strong settle at the end, no overshoot, no rubber-band.
 *   · `smoothWheel: true` — desktop wheel is what we're smoothing.
 *   · `syncTouch: false` — do NOT smooth touch scroll on mobile.
 *     Native iOS / Android scroll physics (momentum + rubber-banding)
 *     are deliberately tuned by the OS; JS smoothing on touch always
 *     feels worse than native. Consensus across scroll libraries.
 *   · `wheelMultiplier: 1`, `touchMultiplier: 2` — preserves the
 *     normal scroll-distance-per-flick expectation.
 *
 * Accessibility
 * ─────────────
 * Users with `prefers-reduced-motion: reduce` get native scroll, no
 * smoothing. We listen for changes to the preference at runtime so
 * the experience updates immediately if they toggle the OS setting.
 *
 * Opt-out for nested scroll containers
 * ────────────────────────────────────
 * Any element that has its own internal overflow scroll (modals,
 * dropdowns, sidebars, chat threads, the command palette) must mark
 * itself with `data-lenis-prevent` so Lenis ignores wheel events
 * inside it and lets the container scroll natively. Otherwise the
 * outer page tries to scroll instead of the container — a classic
 * scroll-jacking bug. The CSS in `globals.css` pairs this with
 * `overscroll-behavior: contain` so internal scroll never bleeds
 * back into the page once the container hits its edges.
 */
const LENIS_OPTIONS: LenisOptions = {
  lerp: 0.1,
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 1,
  touchMultiplier: 2,
  orientation: "vertical",
  gestureOrientation: "vertical",
  infinite: false,
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  // Default to ON — Lenis only attaches event listeners, no visible
  // DOM diff vs. SSR, so this won't cause a hydration mismatch. We
  // flip OFF after mount if the user prefers reduced motion (and
  // listen for changes so the toggle responds live).
  const [smooth, setSmooth] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setSmooth(false);
    const onChange = (e: MediaQueryListEvent) => setSmooth(!e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!smooth) return <>{children}</>;

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
