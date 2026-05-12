"use client";

/**
 * SmoothScroll — Lenis-powered buttery scroll for the marketing site.
 *
 * Mounts at the marketing layout root. Pure side-effect; renders nothing.
 *
 * Why this lives here (and not in (app)/layout):
 *   · Marketing pages benefit from cinematic scroll choreography. Lenis
 *     gives every motion / fade-in / scroll-tied animation a uniform
 *     velocity envelope — exactly the "studio-tier" feel Linear /
 *     Stripe / Resend get.
 *   · App routes (dashboards, settings, etc.) want native scroll. Lenis
 *     can interfere with embedded scroll containers (sidebars, modal
 *     panels), virtualised lists, focus jumps from keyboard nav, and
 *     screenshot tools — none of which we want to spend energy debugging
 *     for a dashboard. So this stays scoped to (marketing).
 *
 * Off-switches (in this order):
 *   1. `prefers-reduced-motion: reduce`  → bail completely
 *   2. coarse pointer / mobile          → bail (iOS Safari momentum scroll
 *                                          beats anything we can compute
 *                                          in JS, and Lenis is heavier on
 *                                          mid-tier Androids than it's
 *                                          worth)
 *   3. otherwise                          → run
 *
 * Wired into GSAP's master ticker via `gsap.ticker.add(...)` so any
 * ScrollTrigger-driven animation gets perfectly in-sync scroll values.
 * Without this bridge, ScrollTrigger reads native scroll positions
 * while Lenis interpolates separately → animations lag the visual
 * scroll by a few frames. The ticker pattern is documented by Lenis +
 * GSAP both — they were designed to play together.
 */

import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Reduced motion → bail
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // 2. Touch / coarse pointer → bail. Native momentum scroll on
    //    iOS / Android beats anything JS can do, and the rubber-band
    //    bottom + the URL bar collapse logic on iOS Safari are
    //    actively undermined by Lenis.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // 3. Defer the heavy imports until we're actually going to use them.
    //    Saves the ~30KB Lenis + ~70KB GSAP bundle on mobile pageloads
    //    where neither runs.
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const [{ default: Lenis }, gsapModule, scrollTriggerModule] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default;
      const { ScrollTrigger } = scrollTriggerModule;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        // Higher = slower / smoother. 1.2 gives a Linear-ish feel.
        duration: 1.2,
        // Premium easing — out-cubic-ish, matches our --ease-out token.
        easing: (t: number) =>
          t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
        smoothWheel: true,
        // CRITICAL: Lenis 1.3+ defaults `autoRaf: true`, which runs an
        // internal requestAnimationFrame loop. We're also driving Lenis
        // from GSAP's ticker below — running both means the smoothing
        // math executes twice per frame and movement feels sluggish /
        // jumpy. Disable Lenis's internal raf and let GSAP own it.
        autoRaf: false,
      });

      // GSAP ↔ Lenis bridge. ScrollTrigger uses GSAP's ticker; Lenis
      // gets its raf step from the same loop so every frame stays in
      // sync. lagSmoothing(0) tells GSAP not to compensate for dropped
      // frames (Lenis already does its own smoothing).
      function raf(time: number) {
        lenis.raf(time * 1000);
      }
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // When Lenis scrolls, kick ScrollTrigger so any pinned/scrubbed
      // animations get fresh scroll values immediately rather than on
      // the next native scroll event.
      lenis.on("scroll", ScrollTrigger.update);

      cleanup = () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        ScrollTrigger.killAll?.();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
