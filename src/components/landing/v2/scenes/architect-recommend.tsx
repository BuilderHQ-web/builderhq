"use client";

/**
 * Architect · step four — hand the client the answer.
 *
 * The evaluation surface at /owner/projects/[slug]/tenders, read from
 * the end a practice actually cares about. The scoring is already done
 * and argued elsewhere on this deck; what is left is the judgement, the
 * name that goes on it, and getting it in front of the client without
 * it turning into an email with attachments.
 *
 * One compression to be honest about: the Sharing panel lives one level
 * up, on the project page, not on the evaluation. It is brought
 * alongside here because the recommendation and the handover are a
 * single act, and a card 476px tall cannot afford a second screen to
 * say so. Everything else is where the app puts it — the round strip
 * under the header, the report a sub-route away at the top right, the
 * shortlist and award levers on the tender's own footer.
 *
 * Three beats: the practice marks its preferred tender, hands the
 * client a seat, and the seat is taken while the pointer is already
 * gone. The last state is the one that matters: the round decided, the
 * client holding it, the practice's name on the record.
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Award, FileDown, Files, Plus, Star, UserRound, Users } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, Card, Frame, GhostBtn, Kicker, ListFade, Pill, WashRow, Avatar } from "./kit";

type Seat = "none" | "sent" | "joined";
type Hot = "shortlist" | "share" | null;
type S = { rec: boolean; seat: Seat; record: boolean; hot: Hot };

/** The round scored, nothing handed over yet. Also the reduced-motion
 *  render, which is why it has to be a finished screen and not a
 *  half-filled one. */
const RESTING: S = { rec: false, seat: "none", record: false, hot: null };

/** The round strip, at the seeded example's real figures: three tenders
 *  between $712,800 and $800,800 inc GST, two significant flags. */
const STRIP: Array<{ label: string; value: string; sub: string }> = [
  { label: "Tenders received", value: "3", sub: "project live 14 days" },
  { label: "Lowest tender inc GST", value: "$712,800", sub: "highest $800,800 · 12% spread" },
  { label: "Significant flags", value: "2", sub: "raised across the round" },
];

export function ArchitectRecommendScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1600,
    script: [
      { move: "shortlist" },
      { set: { hot: "shortlist" } },
      { wait: 260 },
      { click: true },
      { set: { rec: true, hot: null } },
      { wait: 1000 },
      { move: "share" },
      { set: { hot: "share" } },
      { wait: 260 },
      { click: true },
      { set: { seat: "sent", hot: null } },
      { wait: 1100 },
      { cursor: "hide" },
      { set: { seat: "joined" } },
      { wait: 1000 },
      { set: { record: true } },
      { wait: 2200 },
    ],
  });

  const joined = state.seat === "joined";

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame
        crumb="Single dwelling · Pascoe Vale, VIC"
        avatar="SN"
        right={
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[9px] font-semibold whitespace-nowrap transition-colors duration-300"
            style={{
              borderColor: state.record ? C.tealLine : C.line2,
              background: state.record ? C.tealWash : "transparent",
              color: state.record ? C.tealInk : C.muted,
            }}
          >
            <FileDown className="size-2.5 shrink-0" strokeWidth={2.4} />
            The report
          </span>
        }
      >
        {/* The kicker sits in a flex row rather than a block: as an
            inline-flex element it would otherwise drag a 24px line box
            behind it, and at 476px there is nothing spare. */}
        <div className="shrink-0 flex items-center">
          <Kicker icon={Files}>The tender evaluation</Kicker>
        </div>

        <Card className="shrink-0 grid grid-cols-3 overflow-hidden">
          {STRIP.map((s, i) => (
            <div
              key={s.label}
              className={"px-2.5 py-1.5 min-w-0 " + (i ? "border-l" : "")}
              style={{ borderColor: C.line }}
            >
              {/* A ~100px mobile cell cannot hold these on one line, and
                  an ellipsis through "inc GST" or a price is worse than a
                  wrap; the sub line goes entirely rather than showing a
                  price cut in half. */}
              <p
                className="text-[8px] uppercase tracking-[0.11em] truncate max-sm:whitespace-normal max-sm:line-clamp-2"
                style={{ color: C.dim }}
              >
                {s.label}
              </p>
              <p
                className="mt-0.5 font-ui font-semibold text-[17px] max-sm:text-[15px] leading-none tabular-nums truncate"
                style={{ color: C.ink }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-[8.5px] leading-none truncate max-sm:hidden" style={{ color: C.muted }}>
                {s.sub}
              </p>
            </div>
          ))}
        </Card>

        {/* The recommendation: one tender marked, with the line that
            says whose judgement it is. The practice's name and the mark
            are deliberately on the same piece of paper. */}
        <Card
          className="shrink-0 overflow-hidden transition-colors duration-300"
          style={{
            borderColor: state.rec ? C.tealLine : C.line,
            background: state.rec ? C.tealWash : C.paper,
          }}
        >
          <div className="px-3 pt-2 pb-1.5">
            <div className="flex items-center gap-2.5">
              <Avatar txt="MB" size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: C.ink }}>
                  Meridian Building Co
                </p>
                <p className="mt-0.5 text-[10.5px] leading-tight truncate tabular-nums" style={{ color: C.muted }}>
                  $753,500 inc GST
                  {/* Beside the pill the mobile line holds ~150px: the
                      price survives whole, the programme tail does not,
                      and a price cut mid-figure is the one crime here. */}
                  <span className="max-sm:hidden" style={{ color: C.dim }}> · 36 weeks · keys Jul – Aug 2027</span>
                </p>
              </div>
              <span className="shrink-0">
                <Pill tone={state.rec ? "good" : "ink"}>{state.rec ? "Shortlisted" : "Submitted"}</Pill>
              </span>
            </div>
            <p className="mt-1.5 text-[9.5px] truncate" style={{ color: C.dim }}>
              Fully priced, no allowances · No significant flags
            </p>
          </div>
          {/* The practice's name is the record; squeezed beside the two
              buttons it folds into 84px of drivel. On mobile it takes
              the full width and the buttons drop to their own row. */}
          <div
            className="flex max-sm:flex-wrap items-center justify-between gap-2 border-t px-3 py-1.5"
            style={{ borderColor: C.line }}
          >
            <p
              className="min-w-0 text-[9px] leading-tight transition-colors duration-300"
              style={{ color: state.record ? C.muted : C.dim }}
            >
              Prepared by{" "}
              <span style={{ color: state.record ? C.ink : C.muted, fontWeight: 500 }}>
                Studio North Architecture
              </span>{" "}
              with BuilderHQ
            </p>
            <span className="flex shrink-0 items-center gap-1.5 max-sm:ml-auto">
              <GhostBtn cursorKey="shortlist" hot={state.rec || state.hot === "shortlist"}>
                <Star className="size-3 shrink-0" strokeWidth={2.2} fill={state.rec ? "currentColor" : "none"} />
                {state.rec ? "Shortlisted" : "Shortlist"}
              </GhostBtn>
              <span
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold"
                style={{ background: C.ink, color: C.paper }}
              >
                <Award className="size-3 shrink-0" strokeWidth={2.2} />
                Award
              </span>
            </span>
          </div>
        </Card>

        {/* The handover. The seat list is the only thing on this screen
            that grows, so it takes the slack on a tall card and clips
            under the fade on a short one. */}
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* The action sits on the header rule rather than under the
              list, which is where the evaluation surface puts a section's
              button, and which leaves the seat row clear of the fade on
              the shortest card the deck can hand us. */}
          <div className="shrink-0 px-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <Kicker icon={Users}>Sharing</Kicker>
              <GhostBtn cursorKey="share" hot={state.hot === "share"}>
                <Plus className="size-3 shrink-0" strokeWidth={2.4} />
                Share the project
              </GhostBtn>
            </div>
            {/* Secondary prose, and the 35px that decide whether the
                seat row — the payoff — clears the mobile fold. */}
            <p className="mt-1.5 text-[9.5px] leading-[1.5] line-clamp-2 max-sm:hidden" style={{ color: C.muted }}>
              Give your client a seat at the round. A seat sees the project and the evaluation; a
              Deciding seat can also shortlist and award.
            </p>
          </div>

          <div className="relative flex-1 min-h-0 overflow-hidden px-3 pt-2 pb-1.5">
            <AnimatePresence mode="wait" initial={false}>
              {state.seat === "none" ? (
                <motion.div
                  key="empty"
                  className="rounded-md border border-dashed px-3 py-3 text-center"
                  style={{ borderColor: C.line2 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-[10px]" style={{ color: C.muted }}>
                    Not shared with anyone yet.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="seat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <WashRow className="flex items-center gap-2.5 px-2.5 py-2" hot={joined}>
                    <span
                      className="size-7 shrink-0 rounded-md border inline-flex items-center justify-center"
                      style={{ borderColor: C.line2, color: C.dim }}
                    >
                      <UserRound className="size-3.5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium leading-tight truncate" style={{ color: C.ink }}>
                        J. Calder
                      </p>
                      <p
                        className="mt-0.5 text-[9.5px] leading-tight truncate transition-colors duration-300"
                        style={{ color: joined ? C.tealInk : C.dim }}
                      >
                        {joined ? "Joined 12 Aug" : "Awaiting acceptance"}
                      </p>
                    </div>
                    <span className="shrink-0">
                      <Pill tone="ink">Deciding</Pill>
                    </span>
                  </WashRow>
                </motion.div>
              )}
            </AnimatePresence>
            <ListFade />
          </div>
        </Card>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}
