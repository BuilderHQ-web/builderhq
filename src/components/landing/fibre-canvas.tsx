"use client";

import * as React from "react";

/**
 * Optic-fibre canvas — vertical lines of light that pulse top-to-bottom
 * at irregular intervals. Sits behind hero / sections on the landing.
 *
 * Implementation: each "fibre" has an x position, a faint base line, and
 * a moving "head" with a glow trail. Heads loop. Counts and speeds are
 * tuned to feel ambient, not animated. Lines are sparse on mobile.
 *
 * Respects prefers-reduced-motion (no animation, just static faint lines).
 */
export function FibreCanvas({
  className,
}: {
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;

    interface Fibre {
      x: number;          // 0..1
      baseAlpha: number;  // line alpha
      headY: number;      // 0..1 (current head position)
      speed: number;      // px/sec (proportional to height)
      headLength: number; // 0..1 (head trail length as fraction of height)
      hue: "teal" | "blue";
    }

    let fibres: Fibre[] = [];

    function resize() {
      if (!canvas) return;
      // Use viewport dimensions, NOT canvas.getBoundingClientRect().
      // Observing the canvas itself caused a feedback loop: setting
      // canvas.width updated the rect, which fired the observer, which
      // multiplied by DPR again, eventually producing a 33M × 33M
      // canvas that the browser couldn't allocate (rendered as white).
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      // Ensure CSS sizing is independent of the bitmap size.
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Lines per width — sparse on mobile, denser on wide screens.
      const count = Math.min(18, Math.max(6, Math.floor(width / 110)));
      fibres = Array.from({ length: count }, () => ({
        x: Math.random(),
        baseAlpha: 0.04 + Math.random() * 0.05,
        headY: Math.random(),
        speed: 0.08 + Math.random() * 0.18, // viewport-fractions per second
        headLength: 0.18 + Math.random() * 0.22,
        hue: Math.random() > 0.7 ? "blue" : "teal",
      }));
    }

    let lastTime = performance.now();
    let raf = 0;

    function draw(t: number) {
      if (!ctx) return;
      const dt = Math.min(0.05, (t - lastTime) / 1000);
      lastTime = t;

      ctx.clearRect(0, 0, width, height);

      for (const f of fibres) {
        const px = Math.floor(f.x * width) + 0.5;

        // Base line — barely visible.
        ctx.strokeStyle = `rgba(126, 245, 237, ${f.baseAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        if (reduce) continue;

        // Animate head.
        f.headY += f.speed * dt;
        if (f.headY > 1.1) f.headY = -0.15;

        const headPx = f.headY * height;
        const tailPx = headPx - f.headLength * height;

        // Head: gradient from invisible at tail to bright at head.
        const grad = ctx.createLinearGradient(px, tailPx, px, headPx);
        const colour = f.hue === "blue" ? "26, 95, 212" : "126, 245, 237";
        grad.addColorStop(0, `rgba(${colour}, 0)`);
        grad.addColorStop(0.7, `rgba(${colour}, 0.18)`);
        grad.addColorStop(1, `rgba(${colour}, 0.65)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, Math.max(0, tailPx));
        ctx.lineTo(px, Math.min(height, headPx));
        ctx.stroke();

        // Bright dot at head for a "moving particle" feel.
        const headAlpha = headPx >= 0 && headPx <= height ? 0.9 : 0;
        ctx.fillStyle = `rgba(${colour}, ${headAlpha})`;
        ctx.beginPath();
        ctx.arc(px, headPx, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    if (!reduce) {
      raf = requestAnimationFrame(draw);
    } else {
      // Single static frame.
      draw(performance.now());
    }

    // Listen on window — canvas is `fixed inset-0` so it always matches
    // the viewport. No ResizeObserver, no feedback loop.
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className ?? "pointer-events-none fixed inset-0 z-[1] opacity-90"}
    />
  );
}
