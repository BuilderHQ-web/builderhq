"use client";

/**
 * HeroJourney — the whole platform, walked through by hand.
 *
 * The first attempt at this cut between screens on a timer. It was
 * choppy for a reason worth writing down: nothing CAUSED the change.
 * A screen would simply be replaced by the next one, which reads as a
 * slideshow of screenshots no matter how nicely it crossfades.
 *
 * So the navigation is now motivated. A pointer moves, hovers over a
 * real control, presses it, and the app responds by going somewhere.
 * The screen changes because somebody changed it. That single
 * difference is most of the distance between a demo and a recording,
 * and it is why there is no longer a step index underneath: when the
 * pointer is doing the explaining, a progress bar is furniture that
 * says what the picture already said.
 *
 * The frame is chrome and nothing else. Everything inside it, including
 * every transition between screens, belongs to the role's own scene and
 * runs on the same timeline engine the deck cards use, so the pointer
 * never blinks out between two screens the way it would if the scenes
 * were mounted and unmounted from out here.
 *
 * Under prefers-reduced-motion the scene holds its resting state, which
 * is a complete first screen.
 */

import * as React from "react";
import { Lock } from "lucide-react";

import type { Role } from "./content";
import { ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { C } from "./scenes/kit";
import { HomeownerJourney } from "./scenes/journey-homeowner";
import { BuilderJourney } from "./scenes/journey-builder";
import { ArchitectJourney } from "./scenes/journey-architect";

const JOURNEY: Record<Role, (p: { active: boolean }) => React.ReactElement> = {
  homeowner: HomeownerJourney,
  builder: BuilderJourney,
  architect: ArchitectJourney,
};

/**
 * Is the frame worth animating? Scroll measurement rather than
 * IntersectionObserver, for the reason documented in scene-motion.tsx:
 * a root inset by half in both directions collapses to zero height and
 * never reports.
 */
function useOnScreen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [on, setOn] = React.useState(true);

  React.useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setOn(
        r.bottom > 0 &&
          r.top < window.innerHeight &&
          document.visibilityState === "visible",
      );
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
    };
  }, [ref]);

  return on;
}

/** Keyed on the lens, so switching audience starts the story over
 *  rather than resuming somebody else's from the middle. */
export function HeroJourney() {
  const { role } = useRole();
  return <Frame key={role} role={role} />;
}

function Frame({ role }: { role: Role }) {
  const pal = ROLE_PALETTE[role];
  const box = React.useRef<HTMLDivElement>(null);
  const active = useOnScreen(box);
  const Journey = JOURNEY[role];

  return (
    <div ref={box} className="relative w-full sm:max-w-[560px] lg:max-w-[660px]">
      {/* Role-hued bloom behind the frame — re-lights per lens. */}
      <div
        aria-hidden
        className="absolute -inset-10 sm:-inset-16 pointer-events-none"
        style={{
          background: `radial-gradient(closest-side, ${pal.glow1}, transparent 74%)`,
          transition: "background 900ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      <div
        className="relative rounded-[16px] sm:rounded-[20px] border overflow-hidden"
        style={{
          borderColor: "rgba(24,34,44,0.12)",
          background: "#ffffff",
          boxShadow:
            "0 60px 120px -48px rgba(24,34,44,0.5), 0 20px 44px -26px rgba(24,34,44,0.3)",
        }}
      >
        {/* Browser chrome. Fixed, so the session has one home. */}
        <div
          className="relative flex items-center px-4 h-10 sm:h-11 border-b"
          style={{ borderColor: "rgba(24,34,44,0.08)", background: "#fbfaf6" }}
        >
          {/* Traffic lights are a desktop browser's furniture; a phone
              shows only the address pill, so the mock does too. */}
          <span className="hidden sm:flex items-center gap-1.5" aria-hidden>
            <span className="size-[9px] rounded-full bg-[#f6b9b3]" />
            <span className="size-[9px] rounded-full bg-[#f3d9a4]" />
            <span className="size-[9px] rounded-full bg-[#bfe3c0]" />
          </span>
          <span
            className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-6 px-3.5 rounded-full text-[11px]"
            style={{ background: "rgba(24,34,44,0.05)", color: "#53606b" }}
          >
            <Lock className="size-2.5" aria-hidden />
            builderhq.com.au
          </span>
        </div>

        {/* One height for the whole session, so the frame never resizes
            under the reader and the pointer's coordinates stay honest.

            A phone used to get 270px of a 460px scene, cropped from the
            top with a fade over the wound. That read as a broken layout,
            not a deliberate crop, because the acts kept playing below
            the cut. So on a phone the frame is now portrait — the shape
            a phone screen actually is — and the scene gets ALL of it:
            every screen composes itself for this box with max-sm rules
            rather than being amputated by it. */}
        <div
          data-stage="hero"
          className="relative h-[clamp(360px,calc(100svh-330px),446px)] sm:h-[476px] lg:h-[528px] overflow-hidden"
          style={{ background: C.canvas }}
        >
          <Journey active={active} />
        </div>
      </div>
    </div>
  );
}
