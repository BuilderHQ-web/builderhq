"use client";

/**
 * The three hero journeys, gathered.
 *
 * One end-to-end story per lens, played in the hero frame by
 * hero-journey.tsx. Each role's steps live in their own file because
 * they are written from inside that role's week and share nothing but
 * the kit: a homeowner's story ends with awarding a builder, a
 * builder's with winning the work, a practice's with handing their
 * client a recommendation.
 */

import type { Role } from "../content";
import type { HeroStep } from "./kit";

import { HOMEOWNER_JOURNEY } from "./journey-homeowner";
import { BUILDER_JOURNEY } from "./journey-builder";
import { ARCHITECT_JOURNEY } from "./journey-architect";

export const JOURNEYS: Record<Role, HeroStep[]> = {
  homeowner: HOMEOWNER_JOURNEY,
  builder: BUILDER_JOURNEY,
  architect: ARCHITECT_JOURNEY,
};

export type { HeroStep };
