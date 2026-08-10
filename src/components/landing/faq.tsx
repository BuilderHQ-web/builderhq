"use client";

/**
 * FAQ — six questions that real prospects ask before they sign up.
 * Each answer is short, direct, and built to remove a specific
 * objection: cost, verification, scope of work, control, time, trust.
 *
 * Accordion behaviour: at most one open at a time so the page rhythm
 * stays calm. Reveal is shared with the rest of the landing so this
 * fits the same scroll-trigger language.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type QA = {
  q: string;
  a: React.ReactNode;
};

const QAS: QA[] = [
  {
    q: "Is it really free for project owners?",
    a: (
      <>
        Yes. Owners pay nothing to upload, match with builders, receive
        tenders, or award a build. No fees, no commission on the awarded
        contract. The marketplace is funded by builders paying a small
        amount to unlock private project details (address, owner contact,
        documents). Never by you.
      </>
    ),
  },
  {
    q: "How does builder verification work?",
    a: (
      <>
        Every builder runs through two live checks before they can tender:
        (1) ABN active &amp; matching company name on the Australian Business
        Register, and (2) at least one builder licence verified active on
        the relevant state register. We currently run live checks against
        the Victorian Building Authority for VIC; other states fall through
        to a manual review by our team. Both chips appear next to every
        builder so you always know who you&apos;re dealing with.
      </>
    ),
  },
  {
    q: "What does BuilderHQ actually do that I can't do myself?",
    a: (
      <>
        Standardise tenders. When three builders quote a job in three
        different formats, different scope assumptions, different exclusion
        lists, different schedule shapes, you can&apos;t actually compare
        them. BuilderHQ asks every builder for the same fields, in the same
        format, with the same scope tree, so &quot;cheaper&quot; and
        &quot;better value&quot; mean what you think they mean.
      </>
    ),
  },
  {
    q: "How much does it cost a builder to tender?",
    a: (
      <>
        Builders pay a small unlock fee per project to access the address,
        owner contact, and downloadable documents. Founding builders get
        complimentary unlocks for the launch period. A hand-picked cohort
        we work with directly. After that, unlocks are priced per project
        type (a single-dwelling reno is cheaper to unlock than a multi-unit
        build).
      </>
    ),
  },
  {
    q: "Who owns the project once I award a builder?",
    a: (
      <>
        You do, entirely. BuilderHQ doesn&apos;t take a cut of the contract,
        doesn&apos;t insert itself into the build, and doesn&apos;t hold the
        money. The award email shares the builder&apos;s contact with you;
        the contract conversation moves off-platform from there. Your
        tender record stays in BuilderHQ as a reference document for both
        sides.
      </>
    ),
  },
  {
    q: "How quickly will I get tenders?",
    a: (
      <>
        Median response time from matched builders is around 24 hours, with
        full tenders typically landing within 3 to 7 days of publish.
        It&apos;s slower than &quot;phone three mates&quot; but faster than
        you&apos;ll get going through a broker. And the tenders are
        directly comparable when they arrive.
      </>
    ),
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative px-5 md:px-10 py-20 lg:py-32"
    >
      <div className="mx-auto max-w-[1080px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-16 items-start">
          {/* Header column. Centred on mobile (block stacks above
              the accordion list), left-aligned on desktop. */}
          <Reveal>
            <div className="text-center lg:text-left">
              <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
                Common questions
              </span>
              <h2 className="mt-5 font-display tracking-[-0.018em] text-[clamp(2.5rem,4vw+0.5rem,4.5rem)] leading-[1] mx-auto lg:mx-0 max-w-[18ch]">
                <span className="text-text">The honest</span>{" "}
                <span className="accent-italic">answers</span>.
              </h2>
              <p className="mt-7 mx-auto lg:mx-0 max-w-[42ch] text-[14.5px] leading-[1.7] text-text-subtle">
                Real questions from owners, builders, and architects. If
                something here doesn&apos;t answer yours, get in touch.
                We&apos;ll add it.
              </p>
            </div>
          </Reveal>

          {/* Accordion column */}
          <Reveal delay={0.06}>
            <ul className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.40),rgba(6,18,30,0.55))] overflow-hidden divide-y divide-border-subtle/60">
              {QAS.map((qa, i) => (
                <FAQRow
                  key={qa.q}
                  qa={qa}
                  open={open === i}
                  onToggle={() => setOpen((cur) => (cur === i ? null : i))}
                />
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FAQRow({
  qa,
  open,
  onToggle,
}: {
  qa: QA;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-4 px-5 lg:px-7 py-5 lg:py-6 text-left",
          "hover:bg-[rgba(255,255,255,0.018)] transition-colors duration-[160ms]",
        )}
      >
        <span
          className={cn(
            "flex-1 font-ui font-semibold text-[15px] tracking-[-0.005em] leading-[1.4] transition-colors",
            open ? "text-text" : "text-text-muted",
          )}
        >
          {qa.q}
        </span>
        <span
          className={cn(
            "size-7 rounded-sm border flex items-center justify-center shrink-0",
            "transition-[transform,border-color,background-color,color] duration-[260ms]",
            open
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-accent-light rotate-45"
              : "border-border-subtle text-text-dim",
          )}
        >
          <Plus className="size-3.5" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 lg:px-7 pb-6 lg:pb-7 text-[14px] leading-[1.75] text-text-subtle max-w-[60ch]">
              {qa.a}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
