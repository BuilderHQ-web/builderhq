"use client";

/**
 * The homeowner walkthrough: the homeowner script and surfaces,
 * assembled onto the shared engine. /demo renders this; the architect
 * demo assembles its own config the same way at /demo/architect.
 */

import { DemoExperience, type DemoConfig } from "./engine";
import { DEMO_CLOSE, DEMO_DISCLAIMER, HOMEOWNER_SCRIPT } from "./content";
import {
  CompareSurface,
  ReadingSurface,
  RoundSurface,
  ScopeSurface,
  TenderSurface,
  UploadSurface,
} from "./surfaces";

const CONFIG: DemoConfig = {
  id: "homeowner",
  script: HOMEOWNER_SCRIPT,
  crumbs: {
    upload: "New project",
    reading: "Reading your documents",
    scope: "Scope of works",
    live: "Your round",
    tenders: "Tenders",
    compare: "The comparison",
    close: "Done",
  },
  surfaces: {
    upload: UploadSurface,
    reading: ReadingSurface,
    scope: ScopeSurface,
    live: RoundSurface,
    tenders: TenderSurface,
    compare: CompareSurface,
  },
  close: DEMO_CLOSE,
  disclaimer: DEMO_DISCLAIMER,
};

export function HomeownerDemo() {
  return <DemoExperience config={CONFIG} />;
}
