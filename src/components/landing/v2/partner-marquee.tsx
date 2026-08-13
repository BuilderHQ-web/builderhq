"use client";

/**
 * PartnerMarquee — the trust strip between the hero and the role
 * selector: the curated Preferred Partner marks in one slow, seamless
 * loop. Logos come from the hand-curated MARQUEE_LOGOS list (passed in
 * by the server layout via livePartnerLogos) — a partner going live
 * does NOT appear here automatically; the list is edited deliberately.
 *
 * Motion is a requestAnimationFrame integrator, not a CSS keyframe:
 * position advances by dt and wraps with a modulo against the first
 * half's width, so the loop can never visibly reset — not on tab
 * switches (dt is capped), not on image load or resize (a
 * ResizeObserver re-measures), not at the wrap point (both halves are
 * identical). Hovering eases the velocity to zero and back — a soft
 * glide, no snap. Static under prefers-reduced-motion.
 *
 * Logos float directly on the canvas in full colour: each live partner
 * ships a pre-normalised logo-float-v2.png (background removed,
 * trimmed, optically area-normalised on a uniform-height canvas; bump
 * the filename version when regenerating — it is the cache-buster).
 * Every mark links to the partner's public profile.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import type { PartnerLogo } from "@/app/(marketing)/partners/partners-data";

/** Cruise speed, px per second. */
const SPEED = 38;
/** Approach rate for velocity changes (higher = quicker settle). */
const EASE = 3.4;

/** Alternate the register's mark styles so similar logos spread out. */
function weave(logos: PartnerLogo[]): PartnerLogo[] {
  const a = logos.filter((l) => !l.dark);
  const b = logos.filter((l) => l.dark);
  const out: PartnerLogo[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const p = a[i];
    const k = b[i];
    if (p) out.push(p);
    if (k) out.push(k);
  }
  return out;
}

export function PartnerMarquee({ logos }: { logos: PartnerLogo[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const halfRef = useRef<HTMLDivElement | null>(null);
  const hovering = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    const half = halfRef.current;
    if (!track || !half) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = 0;
    let v = SPEED;
    let halfW = half.scrollWidth;
    let raf = 0;
    let last = performance.now();

    const ro = new ResizeObserver(() => {
      halfW = half.scrollWidth;
    });
    ro.observe(half);

    const tick = (now: number) => {
      // Cap dt so a background-tab resume advances one small step
      // instead of leaping the missed time.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = hovering.current ? 0 : SPEED;
      v += (target - v) * Math.min(1, EASE * dt);
      if (halfW > 0) x = (x + v * dt) % halfW;
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // The register loop needs enough marks to read as a network; the
  // majors tier above it does not, and must never disappear with it.
  const marquee = logos.length >= 4;

  const woven = weave(logos);
  // Two passes of the run per half keeps every half wider than any
  // viewport, so the modulo wrap can never expose a gap.
  const half = [...woven, ...woven];

  return (
    <section
      aria-label="Trusted partner network"
      className="relative px-5 md:px-10 py-12 lg:py-16 lg:min-h-[32svh] lg:flex lg:flex-col lg:justify-center"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        {/* ── The majors: institutions BuilderHQ is partnered with.
            A static tier above the register marquee, in full colour,
            built as a row so the next mark can simply join it. These
            are relationships, not register listings, so nothing here
            links away from the page. ── */}
        <div className="mb-12 lg:mb-16 text-center">
          {/* The kicker carries more weight than the register's label
              below it, because this tier outranks it. The phone keeps
              the smaller step: at 375px the rules and the words have
              to share a 335px line. */}
          <p className="flex items-center justify-center gap-3 text-[11px] sm:text-[13px] tracking-[0.28em] sm:tracking-[0.3em] uppercase font-medium text-text-muted">
            <span aria-hidden className="h-px w-6 sm:w-9 bg-text-faint/40" />
            In association with
            <span aria-hidden className="h-px w-6 sm:w-9 bg-text-faint/40" />
          </p>
          <div className="mt-8 sm:mt-9 flex flex-wrap items-start justify-center gap-x-16 gap-y-10">
            <figure className="flex flex-col items-center">
              {/* 96px on a phone, 128px from sm. The badge is close to
                  square, so its height is also roughly its width: the
                  phone step is what keeps it from dominating a 335px
                  column. */}
              <Image
                src="/Homepage_logos/hia-badge.png"
                alt=""
                width={414}
                height={468}
                className="h-24 sm:h-32 w-auto"
              />
              <figcaption className="mt-4 sm:mt-5">
                <span className="block text-[13px] sm:text-[14px] font-medium text-text-muted">
                  Housing Industry Association
                </span>
                <span className="block mt-1 text-[11.5px] sm:text-[12px] text-text-dim">
                  Australia&rsquo;s peak body for residential building
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        {marquee ? (
          <>
            <p className="mb-8 text-[11px] tracking-[0.28em] uppercase text-text-dim text-center">
              A network of trusted industry partners
            </p>

            <div
              className="relative overflow-hidden"
              onPointerEnter={(e) => {
                // Mouse only — on touch, a tap must never latch the pause.
                if (e.pointerType === "mouse") hovering.current = true;
              }}
              onPointerLeave={() => {
                hovering.current = false;
              }}
              style={{
                maskImage:
                  "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
              }}
            >
              <div ref={trackRef} className="flex w-max will-change-transform">
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    ref={copy === 0 ? halfRef : undefined}
                    aria-hidden={copy === 1}
                    className="flex items-center"
                  >
                    {half.map((l, i) => (
                      <Link
                        key={`${copy}-${i}-${l.slug}`}
                        href={`/partners/${l.slug}`}
                        tabIndex={copy === 1 ? -1 : undefined}
                        className="mx-6 sm:mx-9 flex h-16 shrink-0 items-center justify-center transition-transform duration-300 hover:-translate-y-0.5"
                      >
                        <Image
                          src={l.src}
                          alt={copy === 0 ? `${l.name} logo` : ""}
                          width={230}
                          height={52}
                          // A curated `scale` bumps individual marks whose
                          // artwork reads optically small at the row height.
                          style={
                            l.scale ? { height: Math.round(52 * l.scale) } : undefined
                          }
                          className={`h-12 sm:h-[52px] w-auto max-w-[200px] sm:max-w-[228px] object-contain ${
                            l.norm
                              ? ""
                              : l.dark
                                ? "grayscale invert mix-blend-multiply opacity-70"
                                : "grayscale mix-blend-multiply opacity-70"
                          }`}
                        />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
