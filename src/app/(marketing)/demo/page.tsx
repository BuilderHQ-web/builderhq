import type { Metadata } from "next";

import { DemoExperience } from "./engine";

/**
 * /demo — the guided walkthrough of a full tender round, upload to
 * decision, scripted end to end on the product's own design system.
 *
 * A route rather than a modal or a new window on purpose: it is
 * shareable, it works as a paid-traffic destination, the back button
 * behaves, and the marketing layout already carries the analytics.
 * The homeowner script runs here; the architect script will live at
 * /demo/architects on the same engine.
 */

export const metadata: Metadata = {
  title: "Watch the demo",
  description:
    "Walk through a full tender round in four minutes: your plans become a cited scope of works, three verified builders price the same list, and the comparison shows what each price actually covers.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return <DemoExperience />;
}
