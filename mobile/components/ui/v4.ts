/**
 * v4 primitive barrel — the entire v4 design system surface in one
 * import.
 *
 *   import { ScreenV4, Hero, Surface, Row, Pill, BigNumber, ... } from "@/components/ui/v4";
 *
 * Anything not exported here isn't part of the v4 contract — legacy
 * primitives (glass-card, blur-header, glass-tab-bar) stay in their
 * own files and are imported directly until each consumer is ported.
 */

export { Press } from "./press";
export { Surface } from "./surface";
export { Pill } from "./pill";
export { BigNumber } from "./big-number";
export { Hero } from "./hero";
export { Row } from "./row";
export { AvatarV4 } from "./avatar-v4";
export { ScreenV4 } from "./screen-v4";
export { ScreenHeader } from "./screen-header";
export { Sheet } from "./sheet";
export { StickyCTA } from "./sticky-cta";
export { Moment } from "./moment";

// v4.1 — the chrome the user pointed at (Revolut)
export { GlassTopBar, useTopBarHeight, TOP_BAR_HEIGHT } from "./glass-top-bar";
export { ProjectCard } from "./project-card";
export { ActivityRow } from "./activity-row";
