"use client";

/**
 * Trust — the rules, as a short manifesto. Fully forked per lens now:
 * homeowners hear verification + privacy + the cap; builders hear
 * tender-ready projects, pipeline control and a fair table; architects
 * hear credit, judgement and freedom to leave. Editorial numbered list,
 * lens-hued accents.
 */

import {
  ShieldCheck,
  Lock,
  Scale,
  FileCheck2,
  Compass,
  Tag,
  Handshake,
  DoorOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE, type TrustIcon } from "./content";
import { useRole } from "./role";
import { RoleSwap, SwapItem } from "./swap";

const ICONS: Record<TrustIcon, LucideIcon> = {
  shield: ShieldCheck,
  lock: Lock,
  scale: Scale,
  file: FileCheck2,
  compass: Compass,
  tag: Tag,
  handshake: Handshake,
  door: DoorOpen,
};

export function Trust() {
  const { role } = useRole();
  const copy = LENS[role].trust;
  const pal = ROLE_PALETTE[role];

  return (
    <section id="trust" className="relative px-5 md:px-10 py-20 lg:py-24 scroll-mt-16 lg:min-h-[100svh] lg:flex lg:items-center">
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16">
          {/* Statement */}
          <Reveal>
            <div className="lg:sticky lg:top-28 self-start text-center lg:text-left">
              <h2 className="font-ui font-semibold tracking-[-0.035em] text-[clamp(2.2rem,3.2vw+0.5rem,3.6rem)] leading-[1.08]">
                <span className="text-text">You can check</span>{" "}
                <span style={{ color: pal.accentSoft }}>everything we say.</span>
              </h2>
              <RoleSwap>
                <p className="mt-5 mx-auto lg:mx-0 max-w-[40ch] text-[14.5px] leading-[1.65] text-text-muted">
                  {copy.intro}
                </p>
              </RoleSwap>
            </div>
          </Reveal>

          {/* The rules */}
          <RoleSwap stagger>
            <div role="list">
              {copy.cards.map((card, i) => {
                const Icon = ICONS[card.icon];
                return (
                  <SwapItem key={card.title}>
                    <div
                      role="listitem"
                      className={[
                        "grid grid-cols-[auto_1fr] gap-x-5 lg:gap-x-7 py-8 lg:py-10",
                        i === 0 ? "" : "border-t border-border-subtle",
                      ].join(" ")}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <span className="font-mono text-[13px] tabular-nums" style={{ color: pal.accent + "cc" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="inline-flex size-9 items-center justify-center rounded-lg border"
                          style={{
                            borderColor: pal.accent + "40",
                            background: pal.accent + "14",
                            color: pal.accentSoft,
                          }}
                        >
                          <Icon className="size-4.5" strokeWidth={2.2} />
                        </span>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="font-ui font-bold tracking-[-0.015em] text-[19px] lg:text-[21px] leading-[1.25] text-text">
                          {card.title}
                        </h3>
                        <p className="mt-2.5 max-w-[54ch] text-[14px] lg:text-[14.5px] leading-[1.72] text-text-muted">
                          {card.body}
                        </p>
                      </div>
                    </div>
                  </SwapItem>
                );
              })}
            </div>
          </RoleSwap>
        </div>

        <Reveal delay={0.15}>
          <RoleSwap>
            <p className="mt-14 lg:mt-16 text-center text-[13.5px] leading-[1.6] text-text-dim">
              {copy.footer}
            </p>
          </RoleSwap>
        </Reveal>
      </div>
    </section>
  );
}
