"use client";

/**
 * The example round's walkthrough — the owner's and architect's first
 * five minutes on BuilderHQ.
 *
 * Three registers, one flow. Full-screen slides carry the ideas (the
 * welcome, the scope of works, the finale with the upload CTA), and
 * between them a spotlight walk visits the evaluation's real sections
 * in reading order. The spotlight mechanics follow the builder unlock
 * tour: a scrim over the page, the visited section lifted above it by
 * normalising every ancestor that creates a stacking context, and a
 * small panel pinned near the section. Styles are saved and restored
 * exactly, body scroll locks while a section is lit, and Escape
 * always leaves quietly.
 *
 * Auto-opens once per browser (localStorage) when mounted on a sample
 * round; the banner's Replay button reopens it via a window event.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, X } from "lucide-react";

const SEEN_KEY = "bhq.example-walkthrough.seen.v1";
export const OPEN_EVENT = "bhq:example-walkthrough:open";

interface Stop {
  /** DOM id of the section to light. */
  target: string;
  title: string;
  /** What this section is, in plain words. */
  line: string;
  /** One concrete thing to notice in the lit section, right now. */
  example: string;
}

// In page order, top to bottom — the walk never jumps around. The
// one exception is the quick read, which lives in the masthead but
// closes the tour deliberately: the finale scrolls back to the top,
// straight to it. Every example is TRUE OF THE SEEDED DATA — if the
// personas or scheduleFor() change, these sentences change with them.
const STOPS: Stop[] = [
  {
    target: "builders",
    title: "The builders",
    line: "Before you read a single dollar, know who is talking. Every builder here passed verification before they could enter: company, ABN and licence, checked against the public registers.",
    example:
      "All three builders below carry a green tick on their ABN and licence. That tick means we checked the register, not that they told us so.",
  },
  {
    target: "overview",
    title: "The overview",
    line: "Once the tenders are in, we write what this round comes down to, in plain words: who is cheapest, what that price truly carries, and exactly what the extra money buys.",
    example:
      "It works out below that the $37,000 saving rests on $82,500 of allowances, then prices the step up: $40,700 more removes that risk entirely and brings the keys forward two weeks.",
  },
  {
    target: "tenders",
    title: "Each tender, in full",
    line: "Each card is one builder's tender: the price, how firm it is, the programme, and a score out of 100 built from the same evidence for everyone.",
    example:
      "The lowest tender, $712,800, is firm to 87 percent, with $82,500 still able to move. The $753,500 tender is fully priced, with nothing left open.",
  },
  {
    target: "readeval",
    title: "Read the evaluation",
    line: "Behind every card sits the full evaluation: every question we put to the builder, their answer to each one, and every flag and warning our reading raised.",
    example:
      "The lowest tender carries 2 significant flags and 6 worth attention. Open Read the evaluation and it shows you exactly what each one is and why it matters.",
  },
  {
    target: "compare",
    title: "The decision grid",
    line: "The same questions, side by side. Every row is the builders' own answers lined up, and a teal cell marks the strongest answer on that row.",
    example:
      "The scope row reads 133 of 171 trades in the lowest price against 171 of 171 in the other two. That one row explains most of the price gap.",
  },
  {
    target: "scores",
    title: "The score",
    line: "Every tender scores out of 100 across six dimensions: price firmness, scope coverage, preparation, credentials, delivery and programme confidence. Teal marks who leads each one.",
    example:
      "The lowest price scores 25 on price firmness because so much of it can still move. A cheap number with a weak score is the pattern this table exists to catch.",
  },
  {
    target: "differ",
    title: "Where the tenders differ",
    line: "Anything the three tenders treat differently is pulled into its own table, item by item, so nothing hides in the fine print.",
    example:
      "38 items are treated differently in this round. The driveway is one: excluded by the lowest tender, priced as documented by the other two.",
  },
  {
    target: "record",
    title: "The record",
    line: "Questions, messages, shortlists and the award all stay on the round's file, timestamped, for as long as the project lives.",
    example:
      "Ask a builder to firm up an allowance and both the question and the answer sit here on the record, not in a lost email thread.",
  },
  {
    target: "quickread",
    title: "And when you are short on time",
    line: "The quick read plays this whole round as ninety seconds of cards: the prices, the catch in the fine print, the clock.",
    example:
      "Press it when the tour ends. Ninety seconds, and the catch in the lowest price is impossible to miss.",
  },
];

type Phase =
  | { kind: "closed" }
  | { kind: "welcome" }
  | { kind: "scope" }
  | { kind: "stop"; index: number }
  | { kind: "finale" };

/** Ancestors that trap z-index — normalised while their child is lit. */
function makesStackingContext(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  return (
    s.transform !== "none" ||
    s.filter !== "none" ||
    s.backdropFilter !== "none" ||
    (s.opacity !== "" && Number(s.opacity) < 1) ||
    s.willChange.includes("transform") ||
    s.willChange.includes("opacity") ||
    s.perspective !== "none" ||
    (s.position !== "static" && s.zIndex !== "auto")
  );
}

export function ExampleWalkthrough({
  role,
  uploadHref,
}: {
  role: "owner" | "architect";
  uploadHref: string;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "closed" });
  const litRef = useRef<Array<[HTMLElement, string | null]>>([]);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revert = useCallback(() => {
    for (const [el, prev] of litRef.current) {
      if (prev === null) el.removeAttribute("style");
      else el.setAttribute("style", prev);
    }
    litRef.current = [];
  }, []);

  const close = useCallback(() => {
    revert();
    document.body.style.overflow = "";
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setPhase({ kind: "closed" });
  }, [revert]);

  // Auto-open once per browser; the banner can reopen any time.
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    const t = setTimeout(() => {
      if (!seen) setPhase({ kind: "welcome" });
    }, 450);
    const onOpen = () => setPhase({ kind: "welcome" });
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      clearTimeout(t);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase.kind !== "closed") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase.kind, close]);

  /** Light a stop: centre it, lift it over the scrim, pin the panel. */
  const goToStop = useCallback(
    (start: number) => {
      revert();
      document.body.style.overflow = "";
      // A missing anchor never strands the tour: walk forward to the
      // next stop that exists on this page.
      let index = start;
      let el: HTMLElement | null = null;
      while (
        index < STOPS.length &&
        !(el = document.getElementById(STOPS[index]!.target))
      ) {
        index++;
      }
      if (!el) {
        setPhase({ kind: "finale" });
        return;
      }
      setPhase({ kind: "stop", index });
      el.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      const settle = reduceMotion ? 60 : 420;
      setTimeout(() => {
        const pairs: Array<[HTMLElement, string | null]> = [];
        pairs.push([el, el.getAttribute("style")]);
        let a = el.parentElement;
        while (a && a !== document.body) {
          if (makesStackingContext(a)) pairs.push([a, a.getAttribute("style")]);
          a = a.parentElement;
        }
        for (const [node] of pairs) {
          node.style.opacity = "1";
          node.style.transform = "none";
          node.style.willChange = "auto";
          node.style.zIndex = "60";
          if (getComputedStyle(node).position === "static") {
            node.style.position = "relative";
          }
        }
        litRef.current = pairs;
        document.body.style.overflow = "hidden";
      }, settle);
    },
    [reduceMotion, revert],
  );

  const leaveStops = useCallback(
    (next: Phase) => {
      revert();
      document.body.style.overflow = "";
      setPhase(next);
      if (next.kind === "finale" || next.kind === "welcome") {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    },
    [reduceMotion, revert],
  );

  if (phase.kind === "closed") return null;

  /* ── full-screen slides ──────────────────────────────────────────── */
  if (phase.kind === "welcome" || phase.kind === "scope" || phase.kind === "finale") {
    return (
      <div
        className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(250,248,243,0.96)] backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close the walkthrough"
          className="fixed top-5 right-5 inline-flex items-center justify-center size-10 rounded-full border border-border-subtle bg-white/80 text-text-muted hover:text-text transition-colors"
        >
          <X className="size-4" />
        </button>

        <div className="min-h-full flex items-center justify-center px-6 py-16">
          <div className="max-w-[560px] text-center">
            {phase.kind === "welcome" ? (
              <>
                <p className="text-[10px] tracking-[0.34em] uppercase text-accent-light font-ui font-semibold">
                  The example round
                </p>
                <h2 className="mt-4 font-display uppercase tracking-[-0.018em] text-[38px] sm:text-[52px] leading-[0.95] text-text">
                  Welcome to BuilderHQ
                </h2>
                <div className="mt-6 text-left mx-auto max-w-[52ch] space-y-4 text-[14.5px] leading-[1.75] text-text-muted">
                  <p>
                    BuilderHQ runs your whole tender, start to finish.{" "}
                    {role === "architect"
                      ? "Your practice uploads a project,"
                      : "You upload your project,"}{" "}
                    we read every document and write the scope of works,
                    verified builders price that same list, and every tender
                    comes back structured, scored and ready to compare side by
                    side. You question, shortlist and award, all in one place
                    {role === "architect"
                      ? ", with your practice's name on the evaluation."
                      : "."}
                  </p>
                  <p>
                    To show you, we prepared an example: three builders priced
                    one home, and everything they answered is on this page.
                    Five minutes here shows you the whole journey.
                  </p>
                </div>
                <div className="mt-9 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPhase({ kind: "scope" })}
                    className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]"
                  >
                    Begin the walkthrough
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="text-[12px] text-text-dim hover:text-text transition-colors"
                  >
                    Explore on my own
                  </button>
                </div>
              </>
            ) : phase.kind === "scope" ? (
              <>
                <p className="text-[10px] tracking-[0.34em] uppercase text-accent-light font-ui font-semibold">
                  Before the tenders
                </p>
                <h2 className="mt-4 font-display uppercase tracking-[-0.018em] text-[34px] sm:text-[46px] leading-[0.95] text-text">
                  It starts with a scope of works
                </h2>
                <div className="mt-6 text-left mx-auto max-w-[52ch] space-y-4 text-[14.5px] leading-[1.75] text-text-muted">
                  <p>
                    Within 24 hours of upload, we read every page of every
                    document and write a scope of works from them. This
                    round&apos;s came from{" "}
                    <span className="text-text font-semibold">
                      211 pages across nine documents
                    </span>{" "}
                    and runs to{" "}
                    <span className="text-text font-semibold">242 items</span>,
                    each traced to the page it came from.
                  </p>
                  <p>
                    Every builder prices that same list, item by item, and
                    marks what their price does with each one: included, a
                    provisional sum, or excluded. That is why the tenders on
                    this page can be compared like for like, not guessed at
                    from three different PDFs.
                  </p>
                  <p className="inline-flex items-start gap-2 text-[13px] text-text-dim">
                    <BookOpenCheck className="size-4 mt-0.5 shrink-0 text-accent-light" />
                    The full list lives under Scope on this project, any time
                    you want to read it.
                  </p>
                </div>
                <div className="mt-9">
                  <button
                    type="button"
                    onClick={() => goToStop(0)}
                    className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors"
                  >
                    Now, the tenders
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] tracking-[0.34em] uppercase text-accent-light font-ui font-semibold">
                  That is the whole journey
                </p>
                <h2 className="mt-4 font-display uppercase tracking-[-0.018em] text-[38px] sm:text-[52px] leading-[0.95] text-text">
                  Ready to run your own?
                </h2>
                <p className="mt-5 text-[15px] leading-[1.75] text-text-muted max-w-[48ch] mx-auto">
                  Upload your project and the same happens for you: we read the
                  documents, write the scope of works, verified builders price
                  it, and the comparison lands here
                  {role === "architect"
                    ? ", with your practice's name on the evaluation."
                    : "."}
                </p>
                <div className="mt-9 flex flex-col items-center gap-3">
                  <a
                    href={uploadHref}
                    onClick={close}
                    className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]"
                  >
                    Upload your first project
                    <ArrowRight className="size-4" />
                  </a>
                  <button
                    type="button"
                    onClick={close}
                    className="text-[12px] text-text-dim hover:text-text transition-colors"
                  >
                    Stay in the example
                  </button>
                  <p className="mt-3 text-[11.5px] text-text-dim max-w-[44ch]">
                    The example stays on your desk for reference. Remove it any
                    time from the bar at the top of this page.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── spotlight stop ──────────────────────────────────────────────── */
  const i = phase.index;
  const stop = STOPS[i]!;
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-[50] bg-[rgba(24,34,44,0.42)] backdrop-blur-[3px]"
        onClick={close}
      />
      <div
        role="dialog"
        aria-label={stop.title}
        className="fixed z-[65] right-4 bottom-4 sm:right-6 sm:bottom-6 w-[min(420px,calc(100vw-32px))] rounded-2xl bg-white border border-border-subtle p-5 shadow-[0_0_0_1px_rgba(0,212,200,0.25),_0_24px_60px_-24px_rgba(24,34,44,0.45)]"
      >
        <p className="text-[9.5px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold tabular-nums">
          {i + 1} of {STOPS.length}
        </p>
        <h3 className="mt-1.5 font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
          {stop.title}
        </h3>
        <p className="mt-2 text-[12.5px] leading-[1.65] text-text-muted">
          {stop.line}
        </p>
        <p className="mt-2.5 border-l-2 border-border-accent/50 pl-2.5 text-[12px] leading-[1.6] text-text-muted">
          <span className="font-ui font-semibold text-accent-light">
            For instance:
          </span>{" "}
          {stop.example}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={close}
            className="text-[11.5px] text-text-dim hover:text-text transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                i === 0 ? leaveStops({ kind: "scope" }) : goToStop(i - 1)
              }
              className="inline-flex items-center justify-center size-9 rounded-full border border-border-subtle text-text-muted hover:text-text hover:border-border-strong transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                i + 1 < STOPS.length
                  ? goToStop(i + 1)
                  : leaveStops({ kind: "finale" })
              }
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[12px] hover:bg-accent-hover transition-colors"
            >
              {i + 1 < STOPS.length ? "Next" : "Finish"}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
