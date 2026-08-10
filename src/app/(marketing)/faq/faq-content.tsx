"use client";

/**
 * The FAQ accordion. One question open at a time. Every word comes
 * from ./faq-schema.ts, which also derives the FAQPage structured
 * data from the same array, so the page and the schema cannot drift.
 */

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  FAQ_CATEGORIES,
  type AnswerPart,
  type FaqQuestion,
} from "./faq-schema";

const SUPPORT_EMAIL = "info@builderhq.com.au";
const PHONES = [
  { display: "0416 926 380", href: "tel:0416926380" },
  { display: "0452 280 062", href: "tel:0452280062" },
];

/** Teal as type is always the deep teal; the bright accent is fill only. */
const LINK_CLASS =
  "text-accent-light underline underline-offset-4 hover:text-text transition-colors";

export function FAQContent() {
  const [open, setOpen] = useState<string | null>(
    `${FAQ_CATEGORIES[0]!.id}-0`,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-14">
      {/* Sticky category nav */}
      <aside className="hidden lg:block">
        <nav className="sticky top-28 flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.18em] uppercase text-text-muted font-ui font-medium mb-2 px-3">
            Categories
          </span>
          {FAQ_CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="px-3 py-2 rounded-md text-[16px] leading-[1.4] text-text-muted hover:text-text hover:bg-[rgba(24,34,44,0.04)] transition-colors"
            >
              {c.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex flex-col gap-10 sm:gap-12">
        {FAQ_CATEGORIES.map((cat) => (
          <section key={cat.id} id={cat.id} className="scroll-mt-28">
            <h2 className="font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,2.4vw+0.5rem,2.2rem)] leading-[1.15] text-text mb-4 sm:mb-5">
              {cat.label}
            </h2>
            <ul className="rounded-xl border border-border-subtle bg-white card-elev overflow-hidden divide-y divide-border-subtle/60">
              {cat.questions.map((qa, i) => {
                const key = `${cat.id}-${i}`;
                return (
                  <FAQRow
                    key={key}
                    qa={qa}
                    isOpen={open === key}
                    onToggle={() =>
                      setOpen((cur) => (cur === key ? null : key))
                    }
                  />
                );
              })}
            </ul>
          </section>
        ))}

        <ContactCard />
      </div>
    </div>
  );
}

function FAQRow({
  qa,
  isOpen,
  onToggle,
}: {
  qa: FaqQuestion;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-4 px-5 lg:px-7 py-5 lg:py-6 text-left hover:bg-[rgba(24,34,44,0.025)] transition-colors duration-[160ms]"
      >
        <span
          className={cn(
            "flex-1 font-ui font-semibold text-[16px] tracking-[-0.005em] leading-[1.4] transition-colors",
            isOpen ? "text-text" : "text-text-muted",
          )}
        >
          {qa.q}
        </span>
        <span
          className={cn(
            "size-7 rounded-md border flex items-center justify-center shrink-0",
            "transition-[transform,border-color,background-color,color] duration-[260ms]",
            isOpen
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-accent-light rotate-45"
              : "border-border-subtle text-text-muted",
          )}
        >
          <Plus className="size-3.5" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 lg:px-7 pb-6 lg:pb-7 text-[16px] leading-[1.65] text-text-muted max-w-[64ch] [overflow-wrap:anywhere]">
              <Answer parts={qa.a} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/** Renders an answer's parts: strings as text, objects as links. */
function Answer({ parts }: { parts: AnswerPart[] }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          part
        ) : (
          <Link key={i} href={part.href} className={LINK_CLASS}>
            {part.text}
          </Link>
        ),
      )}
    </>
  );
}

function ContactCard() {
  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-white card-elev px-6 lg:px-8 py-7 lg:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div className="min-w-0">
        <span className="text-[11px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold">
          Still have a question?
        </span>
        <h3 className="mt-2.5 font-ui font-semibold text-[20px] tracking-[-0.02em] leading-[1.25] text-text">
          A person will answer it.
        </h3>
        <p className="mt-2 text-[16px] leading-[1.65] text-text-muted max-w-[46ch]">
          Email us and we aim to reply within one business day. Or call{" "}
          <a href={PHONES[0]!.href} className={LINK_CLASS}>
            {PHONES[0]!.display}
          </a>{" "}
          or{" "}
          <a href={PHONES[1]!.href} className={LINK_CLASS}>
            {PHONES[1]!.display}
          </a>
          . Humans answer both. To be walked through the product,{" "}
          <Link href="/book-a-call" className={LINK_CLASS}>
            book a call
          </Link>
          .
        </p>
      </div>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full border border-border-strong text-text text-[16px] font-ui font-semibold hover:bg-[rgba(24,34,44,0.04)] transition-colors shrink-0 self-start sm:self-auto"
      >
        <Mail className="size-4 shrink-0" strokeWidth={2.2} />
        {SUPPORT_EMAIL}
      </a>
    </section>
  );
}
