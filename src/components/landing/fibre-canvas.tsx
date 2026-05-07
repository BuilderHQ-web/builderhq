"use client";

import { useEffect, useRef } from "react";

/**
 * Fibre starfield — fixed-position canvas behind everything, runs the
 * full viewport. Renders short vertical fibre segments that flicker
 * on, breathe with a sine pulse, then decay. Density and opacity are
 * deliberately low so the eye reads it as ambient sparkle, never as
 * decoration to track.
 *
 * Safety:
 * - ResizeObserver watches the wrapper div (not the canvas) — observing
 *   the canvas while writing to its width creates a feedback loop that
 *   runs dimensions to infinity.
 * - DPR capped at 2 to bound allocation on retina screens.
 * - Respects prefers-reduced-motion: a single static frame, no RAF.
 */
export function FibreCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Segment = {
      x: number;
      y: number;
      length: number;
      alpha: number;
      targetAlpha: number;
      phase: number;
      speed: number;
      nextFire: number;
      hue: "teal" | "white";
    };

    let W = 0;
    let H = 0;
    let segments: Segment[] = [];

    const seedSegments = () => {
      // Sparse — roughly one segment per 28k px². On a 1920×1080
      // viewport that's ~74 segments; on mobile (375×800) that's ~10.
      const target = Math.floor((W * H) / 28000);
      segments = Array.from({ length: target }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        length: 28 + Math.random() * 36,
        alpha: 0,
        targetAlpha: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.018,
        nextFire: Math.random() * 5000,
        hue: Math.random() > 0.85 ? "white" : "teal",
      }));
    };

    const setSize = () => {
      const rect = wrap.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedSegments();
    };
    setSize();

    if (reduce) {
      // Single frame: a few static sparkles.
      for (const s of segments) {
        s.alpha = 0.12;
      }
      // fall through and let drawFrame run once
    }

    const drawFrame = (dt: number) => {
      ctx.clearRect(0, 0, W, H);

      for (const s of segments) {
        if (!reduce) {
          s.nextFire -= dt;
          if (s.nextFire < 0) {
            s.targetAlpha = 0.10 + Math.random() * 0.10;
            s.nextFire = 1500 + Math.random() * 6500;
          }
          s.phase += s.speed;
          s.alpha += (s.targetAlpha - s.alpha) * 0.04;
          // Decay
          if (s.targetAlpha > 0 && s.alpha > s.targetAlpha * 0.92) {
            s.targetAlpha *= 0.94;
          }
        }

        if (s.alpha < 0.002) continue;

        const pulse = Math.sin(s.phase);
        const a = s.alpha * (0.55 + pulse * 0.45);
        const half = s.length / 2;
        const colour = s.hue === "teal" ? "0,212,200" : "200,230,250";

        const grd = ctx.createLinearGradient(
          s.x,
          s.y - half,
          s.x,
          s.y + half,
        );
        grd.addColorStop(0, `rgba(${colour},0)`);
        grd.addColorStop(0.5, `rgba(${colour},${a.toFixed(3)})`);
        grd.addColorStop(1, `rgba(${colour},0)`);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - half);
        ctx.lineTo(s.x, s.y + half);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // Tiny dot at the centre of the segment
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(126,245,237,${(s.alpha * 1.4).toFixed(3)})`;
        ctx.fill();
      }
    };

    let lastTs = performance.now();
    let raf = 0;
    const tick = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;
      drawFrame(dt);
      raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      drawFrame(0);
    } else {
      raf = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(setSize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
