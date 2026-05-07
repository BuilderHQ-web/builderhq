"use client";

import * as React from "react";

/**
 * Optic-fibre canvas — vertical lines of light that pulse top-to-bottom
 * at irregular intervals. Lives inside a positioned parent (typically
 * the hero) — sized to match the parent so it doesn't bleed through
 * other sections as the page scrolls.
 *
 * Implementation notes:
 * - Sized via ResizeObserver on a *wrapper* div, not the canvas itself
 *   (observing the canvas while writing to canvas.width creates a
 *   feedback loop that blows up dimensions to 33M × 33M).
 * - DPR capped at 2 to keep memory sane on retina phones.
 * - Bottom of the canvas masked off so the lines fade out at the
 *   section seam instead of cutting hard.
 * - Respects prefers-reduced-motion (single static frame, no RAF).
 */
export function FibreCanvas({
  className = "absolute inset-0 z-0 pointer-events-none",
}: {
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    interface Fibre {
      x: number;
      baseAlpha: number;
      headY: number;
      speed: number;
      headLength: number;
      hue: "teal" | "blue";
    }
    let fibres: Fibre[] = [];

    function resize() {
      if (!wrap || !canvas) return;
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(14, Math.max(5, Math.floor(width / 140)));
      fibres = Array.from({ length: count }, () => ({
        x: Math.random(),
        baseAlpha: 0.04 + Math.random() * 0.05,
        headY: Math.random(),
        speed: 0.07 + Math.random() * 0.15,
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

        ctx.strokeStyle = `rgba(126, 245, 237, ${f.baseAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        if (reduce) continue;

        f.headY += f.speed * dt;
        if (f.headY > 1.1) f.headY = -0.15;

        const headPx = f.headY * height;
        const tailPx = headPx - f.headLength * height;

        const grad = ctx.createLinearGradient(px, tailPx, px, headPx);
        const colour = f.hue === "blue" ? "26, 95, 212" : "126, 245, 237";
        grad.addColorStop(0, `rgba(${colour}, 0)`);
        grad.addColorStop(0.7, `rgba(${colour}, 0.18)`);
        grad.addColorStop(1, `rgba(${colour}, 0.6)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, Math.max(0, tailPx));
        ctx.lineTo(px, Math.min(height, headPx));
        ctx.stroke();

        const headAlpha = headPx >= 0 && headPx <= height ? 0.85 : 0;
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
      draw(performance.now());
    }

    // Observe the wrapper, NOT the canvas — observing the canvas while
    // setting its width/height creates a feedback loop.
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className={className}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 block"
        style={{
          maskImage:
            "linear-gradient(180deg, black 0%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, black 0%, black 60%, transparent 100%)",
        }}
      />
    </div>
  );
}
