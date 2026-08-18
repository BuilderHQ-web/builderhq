import type { Metadata } from "next";

import { HomeownerDemo } from "./homeowner";

/**
 * /demo — the guided walkthrough of a whole tender, upload to
 * decision, scripted end to end on the product's own design system.
 *
 * A route rather than a modal or a new window on purpose: it is
 * shareable, it works as a paid-traffic destination, the back button
 * behaves, and the marketing layout already carries the analytics.
 * The homeowner script runs here; the architect script lives at
 * /demo/architect on the same engine.
 */

export const metadata: Metadata = {
  title: "Watch the demo",
  description:
    "Walk through a whole tender in four minutes: your plans become a full scope of works, three verified builders price the same list, and the comparison shows what each price actually covers.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return <HomeownerDemo />;
}
