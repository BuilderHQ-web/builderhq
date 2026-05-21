"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor — premium-agency tier. Four layers, no compromises:
 *
 *   • dot       — instant follow, accent-teal pinhead with screen blend.
 *   • blend     — the signature. A white disc with
 *                 `mix-blend-mode: difference` that inverts colours
 *                 of whatever's behind. Black text becomes white inside
 *                 the disc, teal CTAs go red — instant "this site is
 *                 expensive" tell. Smoothly lerps toward the mouse.
 *   • ring      — outline ring, faster lerp than the glow.
 *   • glow      — soft accent halo, slowest lerp, sells depth.
 *
 * Plus magnetic hover: when the cursor enters a `data-cursor=hover`
 * or interactive element, the target ring + blend disc lerp toward
 * the element's CENTRE instead of the raw mouse position. The
 * cursor feels physically attracted to buttons — addictive to use.
 *
 * Mounts only on fine pointers + non-reduce-motion users. Touch
 * devices and reduce-motion get the OS cursor (no stray fixed
 * dot in the corner).
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const blendRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!isFinePointer || reduce) return;
    setEnabled(true);

    const html = document.documentElement;
    html.classList.add("custom-cursor");

    // Raw mouse position (instant).
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    // Lerped positions per layer. The blend + ring use the same
    // softer-than-dot lerp; the glow trails further behind for depth.
    let bx = mx;
    let by = my;
    let rx = mx;
    let ry = my;
    let gx = mx;
    let gy = my;

    // Magnetic target: when set, the blend + ring lerp toward this
    // element's centre instead of the raw mouse position.
    let magnetEl: HTMLElement | null = null;
    let magnetActive = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    document.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);

      // Compute the magnet target if active. The blend + ring drift
      // toward the element's centre with a partial pull, so the
      // cursor still tracks the mouse but visibly biases toward the
      // hovered element. Pull strength: 0.45 (40-50% feels right —
      // any more and the cursor "snaps" too hard).
      let targetX = mx;
      let targetY = my;
      if (magnetActive && magnetEl) {
        const r = magnetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const pull = 0.45;
        targetX = mx + (cx - mx) * pull;
        targetY = my + (cy - my) * pull;
      }

      // Dot tracks raw mouse instantly (no lerp).
      const dot = dotRef.current;
      if (dot) {
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }

      // Blend + ring share a snappy lerp (0.22) so they feel
      // responsive but not jittery. They use the magnet target so
      // the magnetic feel hits both visible accents.
      bx += (targetX - bx) * 0.22;
      by += (targetY - by) * 0.22;
      const blend = blendRef.current;
      if (blend) {
        blend.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, -50%)`;
      }
      rx += (targetX - rx) * 0.16;
      ry += (targetY - ry) * 0.16;
      const ring = ringRef.current;
      if (ring) {
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      gx += (mx - gx) * 0.07;
      gy += (my - gy) * 0.07;
      const glow = glowRef.current;
      if (glow) {
        glow.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      }
    };
    raf = requestAnimationFrame(loop);

    // Hover detection. We tag the body with `cursor-hovering` so
    // global CSS can grow the cursor; we also store the actual
    // element for the magnetic pull.
    const HOVER_SELECTOR = [
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "[role=button]",
      "[data-cursor=hover]",
    ].join(",");
    // Selectors that should DISABLE magnetic pull (e.g., long links
    // in prose where snapping would be jarring) — they still trigger
    // the hover-grow but skip the magnet.
    const NO_MAGNET_SELECTOR = "[data-cursor=hover-soft], [data-cursor=text]";

    const onOver = (e: Event) => {
      const t = e.target as Element | null;
      const hit = t?.closest(HOVER_SELECTOR) as HTMLElement | null;
      if (hit) {
        document.body.classList.add("cursor-hovering");
        magnetEl = hit;
        magnetActive = !hit.matches(NO_MAGNET_SELECTOR);
      }
    };
    const onOut = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest(HOVER_SELECTOR)) {
        document.body.classList.remove("cursor-hovering");
        magnetEl = null;
        magnetActive = false;
      }
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.body.classList.remove("cursor-hovering");
      html.classList.remove("custom-cursor");
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Glow — slowest lerp, soft accent halo. */}
      <div
        ref={glowRef}
        aria-hidden
        className="cursor-glow pointer-events-none fixed top-0 left-0 z-[9996] h-[120px] w-[120px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.07) 0%, transparent 70%)",
          transition: "width .5s var(--ease-out), height .5s var(--ease-out)",
        }}
      />
      {/* Ring — outline. */}
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed top-0 left-0 z-[9997] h-10 w-10 rounded-full border border-[rgba(0,212,200,0.38)] will-change-transform"
        style={{
          transition:
            "width .4s var(--ease-out), height .4s var(--ease-out), border-color .3s var(--ease-out)",
        }}
      />
      {/* Blend — the signature. White disc with mix-blend-mode:
          difference inverts colours of whatever it's over.  */}
      <div
        ref={blendRef}
        aria-hidden
        className="cursor-blend pointer-events-none fixed top-0 left-0 z-[9998] h-6 w-6 rounded-full will-change-transform"
        style={{
          background: "white",
          mixBlendMode: "difference",
          transition:
            "width .3s var(--ease-out), height .3s var(--ease-out)",
        }}
      />
      {/* Dot — instant accent pinhead. */}
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot pointer-events-none fixed top-0 left-0 z-[9999] h-1.5 w-1.5 rounded-full bg-accent will-change-transform"
        style={{
          mixBlendMode: "screen",
          boxShadow: "0 0 14px rgba(0,212,200,0.9)",
          transition: "width .2s var(--ease-out), height .2s var(--ease-out)",
        }}
      />
    </>
  );
}
