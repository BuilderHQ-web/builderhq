"use client";

/**
 * The architect walkthrough: the architect script and surfaces,
 * assembled onto the shared engine.
 */

import { DemoExperience, type DemoConfig } from "../engine";
import {
  ARCH_CLOSE,
  ARCH_CRUMBS,
  ARCH_DISCLAIMER,
  ARCHITECT_SCRIPT,
} from "./content";
import {
  ArchCompareSurface,
  ArchReadingSurface,
  ArchRoundSurface,
  ArchScopeSurface,
  ArchTenderSurface,
  ArchUploadSurface,
} from "./surfaces";

const CONFIG: DemoConfig = {
  id: "architect",
  script: ARCHITECT_SCRIPT,
  crumbs: ARCH_CRUMBS,
  surfaces: {
    upload: ArchUploadSurface,
    reading: ArchReadingSurface,
    scope: ArchScopeSurface,
    live: ArchRoundSurface,
    tenders: ArchTenderSurface,
    compare: ArchCompareSurface,
  },
  close: ARCH_CLOSE,
  disclaimer: ARCH_DISCLAIMER,
};

export function ArchitectDemo() {
  return <DemoExperience config={CONFIG} />;
}
