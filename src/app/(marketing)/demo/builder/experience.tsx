"use client";

/**
 * The builder walkthrough: the builder script and surfaces, assembled
 * onto the shared engine.
 */

import { DemoExperience, type DemoConfig } from "../engine";
import {
  BUILDER_CLOSE,
  BUILDER_CRUMBS,
  BUILDER_DISCLAIMER,
  BUILDER_SCRIPT,
} from "./content";
import {
  BuilderAwardSurface,
  BuilderCompareSurface,
  BuilderFindSurface,
  BuilderProjectSurface,
  BuilderScopeSurface,
  BuilderTenderSurface,
} from "./surfaces";

const CONFIG: DemoConfig = {
  id: "builder",
  script: BUILDER_SCRIPT,
  crumbs: BUILDER_CRUMBS,
  surfaces: {
    find: BuilderFindSurface,
    project: BuilderProjectSurface,
    scope: BuilderScopeSurface,
    tender: BuilderTenderSurface,
    compare: BuilderCompareSurface,
    award: BuilderAwardSurface,
  },
  close: BUILDER_CLOSE,
  disclaimer: BUILDER_DISCLAIMER,
};

export function BuilderDemo() {
  return <DemoExperience config={CONFIG} />;
}
