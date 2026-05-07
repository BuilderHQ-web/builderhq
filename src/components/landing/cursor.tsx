"use client";

import * as React from "react";

/**
 * Custom cursor — sharp teal dot + soft trailing ring. Two layers (no
 * glow) for a clean Resend-tier feel; the third glow layer was busy.
 *
 * Mounted only on desktop pointer-fine devices, only when the user
 * hasn't asked for reduced motion. Position is driven by RAF +
 * transform; React state is never updated on mousemove.
 */
export function CustomCursor() {
  const dotRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const isFinePointer = window.matchMedia?.("(pointer: fine)").matches;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || reduce) return;

    document.documentElement.classList.add("custom-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function onEnter(e: Event) {
      const t = e.target as HTMLElement | null;
      if (
        t?.closest?.("a,button,input,textarea,select,[role='button'],[data-cursor='hover']")
      ) {
        document.body.classList.add("cursor-hovering");
      }
    }
    function onLeave(e: Event) {
      const t = e.target as HTMLElement | null;
      if (
        t?.closest?.("a,button,input,textarea,select,[role='button'],[data-cursor='hover']")
      ) {
        document.body.classList.remove("cursor-hovering");
      }
    }

    function tick() {
      // Dot snaps to mouse exactly. Ring lags slightly (0.22 lerp) for a
      // velvet-trail feel — too much lag (0.10–0.15) feels sluggish.
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;

      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }

      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onEnter, true);
    document.addEventListener("mouseout", onLeave, true);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onEnter, true);
      document.removeEventListener("mouseout", onLeave, true);
      document.documentElement.classList.remove("custom-cursor");
      document.body.classList.remove("cursor-hovering");
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed top-0 left-0 z-[9998] h-9 w-9 rounded-full border border-[rgba(0,212,200,0.40)]"
        style={{
          transition:
            "width 320ms cubic-bezier(0.22,1,0.36,1), height 320ms cubic-bezier(0.22,1,0.36,1), border-color 240ms ease",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot pointer-events-none fixed top-0 left-0 z-[9999] h-1.5 w-1.5 rounded-full bg-accent"
        style={{
          mixBlendMode: "screen",
          boxShadow: "0 0 12px rgba(0,212,200,0.7)",
          transition: "width 180ms ease, height 180ms ease",
        }}
      />
    </>
  );
}
