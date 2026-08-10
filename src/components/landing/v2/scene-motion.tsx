"use client";

/**
 * Scene motion — a tiny timeline engine for the product scenes in the
 * how-it-works deck.
 *
 * The scenes are real DOM, not screenshots, so a demonstration can be
 * exactly that: the pointer lands on a real control and the real
 * control responds. A script is a list of beats; the runner walks them
 * on timers, moving a synthetic cursor between elements it finds by
 * `data-cursor`, and merging patches into a state bag the scene reads.
 * Nothing here knows what a scope of works is; the scene supplies both
 * the resting state and the script.
 *
 * Three rules the engine enforces, because they are what separate this
 * from a looping GIF:
 *
 *   · It runs only while `enabled`. The deck pins four cards at the
 *     same offset, so without this, four timelines would run behind
 *     each other, none of them visible and all of them compositing.
 *   · It resets to the resting state the moment it stops, so a card
 *     scrolled past and returned to starts from the top rather than
 *     mid-gesture.
 *   · Under `prefers-reduced-motion` it never starts, and the scene
 *     renders its resting state, which is the static scene as it was.
 *
 * Everything animated is transform and opacity, so the timeline stays
 * on the compositor and off the layout thread.
 */

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

/* ── Script ──────────────────────────────────────────────────────── */

export type Beat<S> =
  /** Glide to the centre of `[data-cursor="<key>"]` inside the scene.
   *  `ms` overrides the travel time: a long reach across a screen wants
   *  longer than a nudge to the next row, and matching the two is most
   *  of what makes a pointer look like a hand. */
  | { move: string; ms?: number }
  /** Press and release. Purely visual; the state change is a `set`. */
  | { click: true }
  /** Merge a patch into the scene's state bag. */
  | { set: Partial<S> }
  /** Hold. */
  | { wait: number }
  /** Take the cursor off the scene (used before a loop restarts). */
  | { cursor: "hide" | "show" };

/** How long each beat occupies the timeline. */
const DUR = { move: 620, click: 260, set: 0, cursor: 220 } as const;

export type Cursor = {
  x: number;
  y: number;
  down: boolean;
  shown: boolean;
  /** Place without travelling. The first move of a loop must not glide
   *  in from the scene's top left corner; the pointer fades in already
   *  standing on its first target. */
  snap: boolean;
};

const RESTING_CURSOR: Cursor = { x: 0, y: 0, down: false, shown: false, snap: true };

export function useSceneScript<S extends object>({
  enabled,
  resting,
  script,
  rootRef,
  loopPause = 1400,
}: {
  enabled: boolean;
  /** The scene with nothing having happened yet. Also the reduced-motion render. */
  resting: S;
  script: Array<Beat<S>>;
  rootRef: React.RefObject<HTMLElement | null>;
  loopPause?: number;
}): { state: S; cursor: Cursor; clicks: number } {
  const reduced = useReducedMotion();
  const [state, setState] = React.useState<S>(resting);
  const [cursor, setCursor] = React.useState<Cursor>(RESTING_CURSOR);
  const [clicks, setClicks] = React.useState(0);

  // The script is written inline at the call site, so a fresh array
  // arrives on every render. Hold it in a ref and key the timeline on
  // `enabled` alone, or it restarts on each parent render. Synced in an
  // effect rather than during render: refs written mid-render can be
  // torn between a render that was thrown away and the one that landed.
  // This effect is declared first, so it has run before the timeline
  // below reads either ref.
  const scriptRef = React.useRef(script);
  const restingRef = React.useRef(resting);
  React.useEffect(() => {
    scriptRef.current = script;
    restingRef.current = resting;
  });

  React.useEffect(() => {
    if (!enabled || reduced) {
      setState(restingRef.current);
      setCursor(RESTING_CURSOR);
      return;
    }

    let timer: number | undefined;
    let cancelled = false;
    let i = 0;
    // Whether the pointer is already on the scene, so the first move of
    // each loop can place rather than travel.
    const shownRef = { current: false };

    const centreOf = (key: string): { x: number; y: number } | null => {
      const root = rootRef.current;
      const el = root?.querySelector<HTMLElement>(`[data-cursor="${key}"]`);
      if (!root || !el) return null;
      const r = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
    };

    const step = () => {
      if (cancelled) return;

      if (i >= scriptRef.current.length) {
        // Loop: clear the cursor, restore the resting scene, breathe.
        setCursor((c) => ({ ...c, shown: false, down: false }));
        shownRef.current = false;
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setState(restingRef.current);
          i = 0;
          timer = window.setTimeout(step, 420);
        }, loopPause);
        return;
      }

      const beat = scriptRef.current[i++];
      if (!beat) return;
      let hold: number = DUR.set;

      if ("move" in beat) {
        const at = centreOf(beat.move);
        if (at) {
          setCursor((c) => ({ ...c, ...at, shown: true, down: false, snap: !c.shown }));
          hold = shownRef.current ? (beat.ms ?? DUR.move) : DUR.cursor;
          shownRef.current = true;
        }
      } else if ("click" in beat) {
        setCursor((c) => ({ ...c, down: true }));
        setClicks((n) => n + 1);
        window.setTimeout(() => {
          if (!cancelled) setCursor((c) => ({ ...c, down: false }));
        }, 110);
        hold = DUR.click;
      } else if ("set" in beat) {
        setState((s) => ({ ...s, ...beat.set }));
      } else if ("wait" in beat) {
        hold = beat.wait;
      } else {
        setCursor((c) => ({ ...c, shown: beat.cursor === "show" }));
        if (beat.cursor === "hide") shownRef.current = false;
        hold = DUR.cursor;
      }

      timer = window.setTimeout(step, hold);
    };

    // A beat late, so the card has settled at the pin before the
    // pointer appears and the first measurement is taken.
    timer = window.setTimeout(step, 520);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, reduced, rootRef, loopPause]);

  return { state, cursor, clicks };
}

/* ── The pointer ─────────────────────────────────────────────────── */

/**
 * A pointer with weight. The spring gives it the small overshoot and
 * settle a hand has; linear movement is what makes these read as a
 * cheap animation rather than a recording. The ripple is keyed on the
 * click count so each press mounts a fresh one.
 */
export function SceneCursor({ cursor, clicks }: { cursor: Cursor; clicks: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-30"
      initial={false}
      animate={{
        x: cursor.x,
        y: cursor.y,
        opacity: cursor.shown ? 1 : 0,
        scale: cursor.down ? 0.86 : 1,
      }}
      transition={{
        x: cursor.snap ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20, mass: 1.05 },
        y: cursor.snap ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20, mass: 1.05 },
        opacity: { duration: 0.24 },
        scale: { duration: 0.12 },
      }}
    >
      {cursor.shown ? (
        <motion.span
          key={clicks}
          className="absolute -left-3 -top-3 block size-6 rounded-full"
          style={{ border: "1.5px solid rgba(0,212,200,0.9)" }}
          initial={{ scale: 0.25, opacity: 0.9 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}

      {/* The arrow itself, drawn rather than an emoji cursor: it has to
          sit legibly on a near-black product surface. */}
      <svg width="19" height="23" viewBox="0 0 19 23" fill="none" className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]">
        <path
          d="M2 1.6 15.4 12.2l-5.9.5-2.6 6.4z"
          fill="#ffffff"
          stroke="#0a1119"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

/* ── Which card is the visitor actually looking at ───────────────── */

/** A card's vertical extent in viewport coordinates. */
export type Span = { top: number; bottom: number };

/**
 * Which card is being read, given where they all are.
 *
 * The rule has to survive two different layouts. On desktop the deck
 * pins every card at the same offset, so once you are into it several
 * cards occupy the identical rectangle and the one you can actually see
 * is the last of them, the one drawn on top. On a phone there is no
 * sticky at all, just a column, and exactly one card straddles the
 * middle of the screen at a time.
 *
 * "Covers the centre line, highest index wins" answers both. When
 * nothing covers it, which happens in the gap between two cards and
 * before the deck is reached, fall back to whichever visible card is
 * nearest, so the answer never goes blank mid-scroll.
 *
 * Pure, and exported, because this is the part worth testing: it is
 * where the previous implementation was wrong.
 */
export function pickActiveCard(spans: Array<Span | null>, mid: number, viewportH: number): number {
  let covering = -1;
  for (let i = 0; i < spans.length; i++) {
    const s = spans[i];
    if (!s || s.bottom - s.top <= 0) continue;
    if (s.top <= mid && s.bottom >= mid) covering = i;
  }
  if (covering !== -1) return covering;

  let nearest = -1;
  let best = Infinity;
  for (let i = 0; i < spans.length; i++) {
    const s = spans[i];
    if (!s || s.bottom < 0 || s.top > viewportH) continue;
    const d = Math.abs((s.top + s.bottom) / 2 - mid);
    if (d <= best) {
      best = d;
      nearest = i;
    }
  }
  return nearest;
}

/**
 * The live version of the above.
 *
 * This used to be an IntersectionObserver with the root inset 50% top
 * and bottom, which reads well and does not work: insetting by exactly
 * half in both directions collapses the root to zero height, and a
 * zero-area intersection is reported as not intersecting. The callback
 * therefore never fired, `active` never moved off its initial 0, and
 * only the first card in the deck ever animated. Measuring four
 * rectangles on scroll is less clever and actually correct.
 */
export function useCardInView(count: number): {
  active: number;
  setCardRef: (i: number) => (el: HTMLElement | null) => void;
} {
  const refs = React.useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = React.useState(0);

  const setCardRef = React.useCallback(
    (i: number) => (el: HTMLElement | null) => {
      refs.current[i] = el;
    },
    [],
  );

  React.useEffect(() => {
    // Scroll events are already delivered at most once a frame, and four
    // getBoundingClientRect reads with no writes between them do not
    // force a second layout, so there is nothing to throttle.
    const measure = () => {
      const vh = window.innerHeight;
      const spans = refs.current.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
      const next = pickActiveCard(spans, vh / 2, vh);
      if (next !== -1) setActive(next);
    };

    measure();
    // Again once the fonts have settled, since the first pass can run
    // against a layout that is about to change height.
    const settle = window.setTimeout(measure, 400);

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [count]);

  return { active, setCardRef };
}
