"use client";

import { useEffect, useRef } from "react";

/**
 * Three-layer custom cursor — dot (instant), ring (lerp .14),
 * glow (lerp .07). Mounts only on fine pointers + when motion is
 * allowed; touch devices and reduced-motion users see the OS cursor.
 *
 * Adds `custom-cursor` to <html> while mounted so global CSS can hide
 * the OS cursor with a wildcard !important override (Tailwind's
 * preflight + many element-specific cursor rules otherwise win).
 *
 * On hover of an interactive element (`a, button, [data-cursor=hover]`),
 * the ring + glow grow to "swallow" the element and the dot shrinks —
 * gives a pleasant magnetic feel.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!isFinePointer || reduce) return;

    const html = document.documentElement;
    html.classList.add("custom-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let gx = mx;
    let gy = my;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    document.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const loop = () => {
      const dot = dotRef.current;
      const ring = ringRef.current;
      const glow = glowRef.current;
      if (dot) dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      gx += (mx - gx) * 0.07;
      gy += (my - gy) * 0.07;
      if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Hover-state targets: every interactive element on the page.
    const HOVER_SELECTOR = [
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "[role=button]",
      "[data-cursor=hover]",
    ].join(",");

    const onOver = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest(HOVER_SELECTOR)) {
        document.body.classList.add("cursor-hovering");
      }
    };
    const onOut = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest(HOVER_SELECTOR)) {
        document.body.classList.remove("cursor-hovering");
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

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden
        className="cursor-glow pointer-events-none fixed top-0 left-0 z-[9997] h-[120px] w-[120px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.07) 0%, transparent 70%)",
          transition: "width .5s var(--ease-out), height .5s var(--ease-out)",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed top-0 left-0 z-[9998] h-10 w-10 rounded-full border border-[rgba(0,212,200,0.38)] will-change-transform"
        style={{
          transition:
            "width .4s var(--ease-out), height .4s var(--ease-out), border-color .3s var(--ease-out)",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot pointer-events-none fixed top-0 left-0 z-[9999] h-2 w-2 rounded-full bg-accent will-change-transform"
        style={{
          mixBlendMode: "screen",
          boxShadow: "0 0 18px rgba(0,212,200,0.9)",
          transition: "width .2s var(--ease-out), height .2s var(--ease-out)",
        }}
      />
    </>
  );
}
