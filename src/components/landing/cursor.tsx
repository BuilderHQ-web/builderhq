"use client";

import * as React from "react";

/**
 * Custom cursor — a small teal dot, a softer ring that lags behind, and
 * an even softer glow. Mounted only on desktop pointer-fine devices, and
 * only when the user hasn't asked for reduced motion.
 *
 * Implementation note: we drive position with `transform` on RAF rather
 * than React state. Updating React on every mousemove tanks frame rate.
 */
export function CustomCursor() {
  const dotRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);
  const glowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Touch devices and reduce-motion users skip the custom cursor entirely.
    const isFinePointer = window.matchMedia?.("(pointer: fine)").matches;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || reduce) return;

    document.documentElement.classList.add("custom-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let glowX = mouseX;
    let glowY = mouseY;
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
      // Dot: snap. Ring: 0.18 lerp. Glow: 0.10 lerp.
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;

      if (dotRef.current) dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      if (glowRef.current) glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;

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
        ref={glowRef}
        aria-hidden
        className="cursor-glow pointer-events-none fixed top-0 left-0 z-[9997] h-[120px] w-[120px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,212,200,0.07) 0%, transparent 70%)",
          transition: "width 500ms ease, height 500ms ease",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed top-0 left-0 z-[9998] h-10 w-10 rounded-full border border-[rgba(0,212,200,0.38)]"
        style={{
          transition:
            "width 360ms cubic-bezier(0.22,1,0.36,1), height 360ms cubic-bezier(0.22,1,0.36,1), border-color 240ms ease",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot pointer-events-none fixed top-0 left-0 z-[9999] h-2 w-2 rounded-full bg-accent"
        style={{
          mixBlendMode: "screen",
          boxShadow: "0 0 14px rgba(0,212,200,0.75)",
          transition: "width 180ms ease, height 180ms ease",
        }}
      />
    </>
  );
}
