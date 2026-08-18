import type { Metadata } from "next";

import { BuilderDemo } from "./experience";

/**
 * /demo/builder — the guided walkthrough from the builder's chair:
 * real projects with the scope already written, one list every
 * builder prices, and a comparison where nobody wins by leaving
 * things out. Same engine as /demo, its own script.
 */

export const metadata: Metadata = {
  title: "Watch the builder demo",
  description:
    "See a tender round from the builder's chair in four minutes: real projects with the scope of works already written, one list every builder prices, and a comparison where nobody wins by leaving things out.",
  alternates: { canonical: "/demo/builder" },
};

export default function BuilderDemoPage() {
  return <BuilderDemo />;
}
