"use client";

/**
 * App scenes — the product panel on each how-it-works card.
 *
 * Twelve miniatures, one per lens per step, each a reproduction of a
 * screen the app actually ships and each demonstrating one thing with a
 * synthetic pointer. The scenes themselves live one directory down, a
 * file each, built from the shared atoms in scenes/kit.tsx; this module
 * is only the dispatcher.
 *
 * Two scenes are shared rather than duplicated. The intake is the same
 * screen for an owner and a practice, because it is literally the same
 * route (the architect wizard is a re-export of the owner one), and the
 * scope register is the same read.
 *
 * `active` is true only for the card the visitor is reading. The deck
 * pins four cards at one offset, so a scene cannot work this out from
 * its own visibility and must be told: see useCardInView in
 * scene-motion.tsx.
 */

import type { Role } from "./content";

import { OwnerUploadScene } from "./scenes/owner-upload";
import { OwnerScopeScene } from "./scenes/owner-scope";
import { OwnerRoundScene } from "./scenes/owner-round";
import { OwnerEvaluationScene } from "./scenes/owner-evaluation";
import { BuilderBrowseScene } from "./scenes/builder-browse";
import { BuilderScheduleScene } from "./scenes/builder-schedule";
import { BuilderStandoutScene } from "./scenes/builder-standout";
import { BuilderWinScene } from "./scenes/builder-win";
import { ArchitectRoundSetupScene } from "./scenes/architect-round-setup";
import { ArchitectSubmissionsScene } from "./scenes/architect-submissions";
import { ArchitectRecommendScene } from "./scenes/architect-recommend";

type SceneFn = (props: { active: boolean }) => React.ReactElement;

const DECK: Record<Role, [SceneFn, SceneFn, SceneFn, SceneFn]> = {
  homeowner: [
    OwnerUploadScene,      // 01 upload the plans
    OwnerScopeScene,       // 02 the plans become one list
    OwnerRoundScene,       // 03 every builder prices that list
    OwnerEvaluationScene,  // 04 see what each price covers
  ],
  builder: [
    BuilderBrowseScene,    // 01 find your next project
    BuilderScheduleScene,  // 02 the scope is already written
    BuilderStandoutScene,  // 03 priced on more than the number
    BuilderWinScene,       // 04 win it, and keep all of it
  ],
  architect: [
    OwnerUploadScene,          // 01 upload once, for your client
    ArchitectRoundSetupScene,  // 02 the list, and who prices it
    ArchitectSubmissionsScene, // 03 every submission in one shape
    ArchitectRecommendScene,   // 04 hand your client the answer
  ],
};

export function AppScene({
  role,
  step,
  active = false,
}: {
  role: Role;
  step: number;
  active?: boolean;
}) {
  const Scene = DECK[role][Math.min(step, 3) as 0 | 1 | 2 | 3];
  return <Scene active={active} />;
}
