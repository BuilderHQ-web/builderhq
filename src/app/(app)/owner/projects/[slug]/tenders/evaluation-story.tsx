"use client";

/**
 * The quick read — the whole round as a deck of flick-through cards.
 * Ninety seconds, minimal words, every figure lifted straight from
 * the evaluation. Ends by sending the reader into the full record.
 *
 * Ink canvas (the one dark surface in the app interior — deliberate:
 * it reads as a different register, a briefing rather than a page).
 * Entrance-only motion; keyed remounts per slide; arrows, click
 * zones, swipe, Escape.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, X } from "lucide-react";

import type {
  RoundEvaluation,
  TenderEvaluation,
} from "@/modules/tenders/evaluation";
import { fmtAud } from "./evaluation-ui";

/* ── palette (dark canvas) ──────────────────────────────────────────── */

const INK = {
  bg: "#101a20",
  panel: "rgba(245,239,230,0.045)",
  hairline: "rgba(245,239,230,0.14)",
  cream: "#f3ede2",
  dim: "rgba(243,237,226,0.55)",
  faint: "rgba(243,237,226,0.34)",
  teal: "#2fd4c8",
  amber: "#e3b95e",
  red: "#e2938c",
};

/* ── slide model ────────────────────────────────────────────────────── */

interface Slide {
  key: string;
  /** Small caps line above the heading. */
  kicker: string;
  /** The big centred heading — every card names itself plainly. */
  title: string;
  /** One quiet line under the heading, when the title needs help. */
  sub?: string;
  body: React.ReactNode;
}

function buildSlides(
  round: RoundEvaluation,
  active: TenderEvaluation[],
  projectTitle: string,
  onClose: () => void,
): Slide[] {
  const byPrice = [...active].sort(
    (a, b) => (a.money.incGst ?? Infinity) - (b.money.incGst ?? Infinity),
  );
  const slides: Slide[] = [];
  const names = (id: string) =>
    active.find((e) => e.tenderId === id)?.builderName ?? "";

  /* 1 · cover */
  slides.push({
    key: "cover",
    kicker: "The quick read",
    title: projectTitle,
    sub: `${active.length} tenders, read side by side. The shape of the round, in ninety seconds.`,
    body: null,
  });

  /* 2 · the prices */
  const priced = byPrice.filter((e) => e.money.incGst !== null);
  if (priced.length >= 2) {
    const lowest = priced[0]!.money.incGst!;
    slides.push({
      key: "prices",
      kicker: "The quick read",
      title: "The prices",
      sub: "inc GST, lowest first",
      body: (
        <div className="space-y-5">
          {priced.map((e) => (
            <div key={e.tenderId} className="flex items-baseline justify-between gap-6 border-b pb-4 last:border-0" style={{ borderColor: INK.hairline }}>
              <span className="text-[14px] sm:text-[15px] min-w-0 truncate" style={{ color: INK.dim }}>
                {e.builderName}
              </span>
              <span className="text-right shrink-0">
                <span className="font-display text-[30px] sm:text-[40px] leading-none" style={{ color: INK.cream }}>
                  {fmtAud(e.money.incGst)}
                </span>
                <span className="block text-[11px] mt-1" style={{ color: INK.faint }}>
                  {e.money.incGst === lowest
                    ? "lowest headline"
                    : `+${fmtAud(e.money.incGst! - lowest)}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  /* 3 · the catch (breakeven) or the gap */
  if (round.breakeven) {
    const b = round.breakeven;
    slides.push({
      key: "catch",
      kicker: "The quick read",
      title: "The fine print",
      sub: "what the lowest price carries",
      body: (
        <div>
          <p className="font-display text-[56px] sm:text-[84px] leading-none" style={{ color: INK.cream }}>
            {fmtAud(b.savingExGst)}
          </p>
          <p className="mt-1 text-[14px]" style={{ color: INK.dim }}>
            {names(b.cheaperId)} is cheaper on paper
          </p>
          <div className="my-6 h-px w-16" style={{ background: INK.hairline }} />
          <p className="font-display text-[36px] sm:text-[48px] leading-none" style={{ color: INK.amber }}>
            {fmtAud(b.exposureExGst)}
          </p>
          <p className="mt-1 text-[14px]" style={{ color: INK.dim }}>
            of that price can still move
          </p>
          <div className="my-6 h-px w-16" style={{ background: INK.hairline }} />
          <p className="text-[15px] sm:text-[17px] leading-[1.6] max-w-[44ch]" style={{ color: INK.cream }}>
            If those allowances overrun by more than{" "}
            <span style={{ color: INK.teal }} className="font-semibold">
              {b.breakevenPct}%
            </span>
            , the saving is gone.
          </p>
        </div>
      ),
    });
  } else if (round.spread && round.spread.range > 0) {
    slides.push({
      key: "gap",
      kicker: "The quick read",
      title: "The gap",
      sub: "between the lowest and highest tender",
      body: (
        <p className="text-center font-display text-[64px] sm:text-[96px] leading-none" style={{ color: INK.cream }}>
          {fmtAud(round.spread.range)}
        </p>
      ),
    });
  }

  /* 4 · price certainty */
  if (priced.length >= 2) {
    slides.push({
      key: "certainty",
      kicker: "The quick read",
      title: "How firm is each price",
      sub: "the share committed in the contract sum",
      body: (
        <div className="space-y-6">
          {priced.map((e) => (
            <div key={e.tenderId}>
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <span className="text-[13.5px]" style={{ color: INK.dim }}>
                  {e.builderName}
                </span>
                <span className="font-display text-[22px] leading-none" style={{ color: e.money.firmPct >= 99 ? INK.teal : INK.cream }}>
                  {Math.round(e.money.firmPct)}% firm
                </span>
              </div>
              <div className="h-[7px] w-full rounded-full overflow-hidden" style={{ background: "rgba(227,185,94,0.28)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${e.money.firmPct}%`,
                    background: e.money.firmPct >= 99 ? INK.teal : INK.cream,
                  }}
                />
              </div>
              {e.money.exposure > 0 ? (
                <p className="mt-1.5 text-[11.5px]" style={{ color: INK.faint }}>
                  {fmtAud(e.money.exposure)} sits in allowances
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ),
    });
  }

  /* 5 · the clock */
  const timed = byPrice.filter((e) => e.programme.weeks !== null);
  if (timed.length >= 2) {
    slides.push({
      key: "clock",
      kicker: "The quick read",
      title: "The clock",
      sub: "build period and keys, to one scale",
      body: (() => {
        const maxWeeks = Math.max(...timed.map((e) => e.programme.weeks!));
        const fastest = Math.min(...timed.map((e) => e.programme.weeks!));
        return (
          <div className="space-y-6">
            {timed.map((e) => {
              const lead = e.programme.weeks === fastest;
              return (
                <div key={e.tenderId}>
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <span className="text-[13.5px] min-w-0 truncate" style={{ color: INK.dim }}>
                      {e.builderName}
                    </span>
                    <span className="text-[12px] shrink-0" style={{ color: INK.faint }}>
                      {e.programme.handoverLabel
                        ? `keys ${e.programme.handoverLabel}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-[9px] flex-1 rounded-full overflow-hidden" style={{ background: "rgba(243,237,226,0.10)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(e.programme.weeks! / maxWeeks) * 100}%`,
                          background: lead ? INK.teal : INK.cream,
                          opacity: lead ? 1 : 0.75,
                        }}
                      />
                    </div>
                    <span
                      className="w-20 shrink-0 text-right font-display text-[20px] leading-none"
                      style={{ color: lead ? INK.teal : INK.cream }}
                    >
                      {e.programme.weeks} wks
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })(),
    });
  }

  /* 6 · the scope */
  slides.push({
    key: "scope",
    kicker: "The quick read",
    title: "What each price covers",
    sub: "applicable scope lines in the price",
    body: (
      <div>
        <div className="space-y-5">
          {byPrice.map((e) => (
            <div key={e.tenderId} className="flex items-baseline justify-between gap-6 border-b pb-4 last:border-0" style={{ borderColor: INK.hairline }}>
              <span className="text-[14px] min-w-0 truncate" style={{ color: INK.dim }}>
                {e.builderName}
              </span>
              <span className="text-right shrink-0">
                <span className="font-display text-[28px] sm:text-[34px] leading-none" style={{ color: e.scope.excluded === 0 ? INK.teal : INK.cream }}>
                  {e.scope.included} of {e.scope.applicable}
                </span>
                <span className="block text-[11.5px] mt-1" style={{ color: INK.faint }}>
                  scope lines in the price
                  {e.scope.excluded > 0 ? ` · ${e.scope.excluded} excluded` : ""}
                </span>
              </span>
            </div>
          ))}
        </div>
        {round.scopeDisagreements.length > 0 ? (
          <p className="mt-6 text-[13.5px] leading-[1.6] max-w-[44ch]" style={{ color: INK.dim }}>
            {round.scopeDisagreements.length} trade
            {round.scopeDisagreements.length === 1 ? " is" : "s are"} read
            differently across the round, so the totals are not yet the
            same number.
          </p>
        ) : null}
      </div>
    ),
  });

  /* 7 · the flags */
  const allHigh = active.flatMap((e) =>
    e.flags
      .filter((f) => f.severity === "high")
      .map((f) => ({ name: e.builderName, label: f.label })),
  );
  slides.push({
    key: "flags",
    kicker: "The quick read",
    title: "The flags",
    sub: "what needs an answer before you decide",
    body:
      allHigh.length === 0 ? (
        <div>
          <p className="font-display text-[56px] sm:text-[72px] leading-none" style={{ color: INK.teal }}>
            None.
          </p>
          <p className="mt-4 text-[15px] leading-[1.6] max-w-[40ch]" style={{ color: INK.dim }}>
            No tender in this round raised a significant flag. That is
            rare, and worth something.
          </p>
        </div>
      ) : (
        <div>
          <p className="font-display text-[56px] sm:text-[72px] leading-none" style={{ color: INK.red }}>
            {allHigh.length}
          </p>
          <p className="mt-1 text-[14px]" style={{ color: INK.dim }}>
            significant flag{allHigh.length === 1 ? "" : "s"} in the round
          </p>
          <ul className="mt-6 space-y-3">
            {allHigh.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-[7px] size-1.5 rounded-full shrink-0" style={{ background: INK.red }} />
                <span className="text-[14.5px] leading-[1.5]" style={{ color: INK.cream }}>
                  {f.label}
                  <span style={{ color: INK.faint }}> · {f.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ),
  });

  /* 8 · the ideas */
  const contributors = byPrice.filter((e) => e.commentary.present);
  if (contributors.length > 0) {
    slides.push({
      key: "ideas",
      kicker: "The quick read",
      title: "Beyond the price",
      sub: "what the builders brought, unasked",
      body: (
        <div className="space-y-5">
          {contributors.map((e) => (
            <div key={e.tenderId} className="border-b pb-4 last:border-0" style={{ borderColor: INK.hairline }}>
              <p className="text-[14px] font-semibold" style={{ color: INK.cream }}>
                {e.builderName}
              </p>
              <p className="mt-1 text-[13px] leading-[1.55]" style={{ color: INK.dim }}>
                {[
                  e.commentary.veSavingsTotal > 0
                    ? `found ${fmtAud(e.commentary.veSavingsTotal)} in savings`
                    : e.commentary.valueEngineering.length > 0
                      ? `${e.commentary.valueEngineering.length} savings idea${e.commentary.valueEngineering.length === 1 ? "" : "s"}`
                      : null,
                  e.commentary.recommendations.length > 0
                    ? `${e.commentary.recommendations.length} design recommendation${e.commentary.recommendations.length === 1 ? "" : "s"}`
                    : null,
                  e.commentary.riskAdvice.length > 0
                    ? `advice on ${e.commentary.riskAdvice.length} risk${e.commentary.riskAdvice.length === 1 ? "" : "s"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "offered their thinking on the project"}
              </p>
            </div>
          ))}
          {byPrice.length > contributors.length ? (
            <p className="text-[12.5px]" style={{ color: INK.faint }}>
              The other{" "}
              {byPrice.length - contributors.length === 1
                ? "tender stands"
                : "tenders stand"}{" "}
              on the numbers alone.
            </p>
          ) : null}
        </div>
      ),
    });
  }

  /* 9 · before you decide */
  const asks = [
    ...round.roundQuestions,
    ...active.flatMap((e) => e.questions.slice(0, 1)),
  ].slice(0, 3);
  if (asks.length > 0) {
    slides.push({
      key: "asks",
      kicker: "The quick read",
      title: "Ask before you decide",
      sub: "the round's open questions",
      body: (
        <ol className="space-y-5">
          {asks.map((q, i) => (
            <li key={q} className="flex items-start gap-4">
              <span className="font-display text-[26px] leading-none shrink-0" style={{ color: INK.teal }}>
                {i + 1}
              </span>
              <span className="text-[15px] sm:text-[16.5px] leading-[1.55] pt-0.5" style={{ color: INK.cream }}>
                {q}
              </span>
            </li>
          ))}
        </ol>
      ),
    });
  }

  /* 10 · close */
  slides.push({
    key: "close",
    kicker: "The quick read",
    title: "That is the round",
    body: (
      <div>
        <p className="text-[16px] sm:text-[18px] leading-[1.65] max-w-[42ch]" style={{ color: INK.cream }}>
          Every figure you just read comes from the builders&apos; own
          signed disclosures. The full evaluation below shows the
          working behind each one.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex items-center gap-2 rounded-sm px-5 py-3 text-[13.5px] font-ui font-semibold transition-opacity hover:opacity-90"
          style={{ background: INK.teal, color: "#0c1519" }}
        >
          Read the full evaluation
          <ArrowRight className="size-4" />
        </button>
      </div>
    ),
  });

  return slides;
}

/* ── the overlay ────────────────────────────────────────────────────── */

export function QuickReadStory({
  round,
  active,
  projectTitle,
  onClose,
}: {
  round: RoundEvaluation;
  active: TenderEvaluation[];
  projectTitle: string;
  onClose: () => void;
}) {
  const slides = useMemo(
    () => buildSlides(round, active, projectTitle, onClose),
    [round, active, projectTitle, onClose],
  );
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
    },
    [slides.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const slide = slides[index]!;
  const last = index === slides.length - 1;

  return (
    <div
      className="fixed inset-0 z-[85] flex flex-col"
      style={{ background: INK.bg }}
      role="dialog"
      aria-modal="true"
      aria-label="The quick read"
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        if (end - start < -40) go(1);
        if (end - start > 40) go(-1);
      }}
    >
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[560px] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(47,212,200,0.35), transparent 65%)",
        }}
      />

      {/* progress */}
      <div className="relative z-10 flex items-center gap-1.5 px-5 sm:px-8 pt-5">
        {slides.map((s, i) => (
          <span
            key={s.key}
            className="h-[3px] flex-1 rounded-full overflow-hidden"
            style={{ background: "rgba(243,237,226,0.16)" }}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: i <= index ? "100%" : "0%",
                background: i === index ? INK.teal : "rgba(243,237,226,0.55)",
              }}
            />
          </span>
        ))}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the quick read"
          className="ml-3 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ color: INK.dim, background: INK.panel }}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* the card — heading top centre, content centred beneath.
          Keyed remount, entrance only. */}
      <motion.div
        key={slide.key}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex-1 flex flex-col min-h-0"
      >
        <div className="px-5 sm:px-8 pt-8 sm:pt-10 text-center">
          <p
            className="text-[10.5px] tracking-[0.3em] uppercase font-ui font-medium"
            style={{ color: INK.teal }}
          >
            {slide.kicker}
          </p>
          <h2
            className="mx-auto mt-3 max-w-[24ch] font-display uppercase tracking-[-0.01em] text-[34px] sm:text-[52px] leading-[0.98]"
            style={{ color: INK.cream }}
          >
            {slide.title}
          </h2>
          {slide.sub ? (
            <p
              className="mx-auto mt-3 max-w-[52ch] text-[13.5px] sm:text-[15px] leading-[1.6]"
              style={{ color: INK.dim }}
            >
              {slide.sub}
            </p>
          ) : null}
        </div>

        <div className="flex-1 flex items-center px-5 sm:px-8 pb-10 overflow-y-auto min-h-0">
          <div className="w-full max-w-[560px] mx-auto">{slide.body}</div>
        </div>
      </motion.div>

      {/* click zones */}
      {!last ? (
        <button
          type="button"
          aria-label="Next"
          className="absolute inset-y-16 right-0 w-1/3 z-[5] cursor-e-resize"
          onClick={() => go(1)}
        />
      ) : null}
      {index > 0 ? (
        <button
          type="button"
          aria-label="Back"
          className="absolute inset-y-16 left-0 w-1/4 z-[5] cursor-w-resize"
          onClick={() => go(-1)}
        />
      ) : null}

      {/* footer */}
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pb-5">
        <span className="text-[11px] font-ui" style={{ color: INK.faint }}>
          {index === 0 ? "Tap, swipe or use the arrow keys" : ""}
        </span>
        <span className="text-[11px] font-ui tabular-nums" style={{ color: INK.faint }}>
          {index + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}
