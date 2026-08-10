"use client";

/**
 * FAQ v3 — Base44's pattern in our colours: a big plain heading on the
 * left, and on the right a bare list of full-width hairline rows, each
 * a large-type question with a thin plus that rotates open. No card
 * chrome, no accordion box — just typography and lines. Question sets
 * stay forked per lens; state resets on lens change via RoleSwap.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

export function FAQ() {
  const { role } = useRole();
  const faqs = LENS[role].faq;
  const pal = ROLE_PALETTE[role];

  return (
    <section id="faq" className="relative px-5 md:px-10 py-20 lg:py-32 scroll-mt-16">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-20 items-start">
          {/* Heading — plain, big, Base44-still */}
          <Reveal>
            <div className="lg:sticky lg:top-28 text-center lg:text-left">
              {/* Block lines: "Frequently asked questions" wrapped at
                  this measure to leave "questions" alone on its own
                  line. Two written lines, second in the lens hue, same
                  as every other chapter. */}
              <h2 className="font-ui font-semibold tracking-[-0.04em] text-[clamp(2.3rem,3.4vw+0.5rem,3.8rem)] leading-[1.06] max-w-[18ch] mx-auto lg:mx-0">
                <span className="block text-text">Your questions,</span>
                <span className="block" style={{ color: pal.accentSoft }}>
                  and our answers.
                </span>
              </h2>
              <p className="mt-6 mx-auto lg:mx-0 max-w-[36ch] text-[14.5px] leading-[1.65] text-text-muted">
                If yours isn’t here, email{" "}
                <a
                  href="mailto:info@builderhq.com.au"
                  className="text-accent-light underline underline-offset-2 hover:text-accent transition-colors"
                >
                  info@builderhq.com.au
                </a>{" "}
                and a human answers.
              </p>
            </div>
          </Reveal>

          {/* Rows */}
          <Reveal delay={0.06}>
            <RoleSwap>
              <Rows faqs={faqs} />
            </RoleSwap>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Rows({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul className="border-t border-[rgba(24,34,44,0.12)]">
      {faqs.map((qa, i) => (
        <li key={qa.q} className="border-b border-[rgba(24,34,44,0.12)]">
          <button
            type="button"
            onClick={() => setOpen((cur) => (cur === i ? null : i))}
            aria-expanded={open === i}
            className="w-full flex items-center gap-6 py-7 lg:py-8 text-left group"
          >
            <span
              className={cn(
                "flex-1 font-ui text-[17px] lg:text-[20px] font-medium tracking-[-0.015em] leading-[1.35] transition-colors",
                open === i ? "text-text" : "text-text/90 group-hover:text-text",
              )}
            >
              {qa.q}
            </span>
            <Plus
              className={cn(
                "size-5 shrink-0 transition-transform duration-[260ms] ease-[var(--ease-out)]",
                open === i ? "rotate-45 text-accent-light" : "text-text-dim group-hover:text-text-muted",
              )}
              strokeWidth={1.8}
            />
          </button>
          <AnimatePresence initial={false}>
            {open === i ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <p className="pb-8 pr-12 text-[15px] leading-[1.75] text-text-muted max-w-[64ch]">
                  {qa.a}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </li>
      ))}
    </ul>
  );
}
