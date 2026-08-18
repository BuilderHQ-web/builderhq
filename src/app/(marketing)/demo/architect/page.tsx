import type { Metadata } from "next";

import { ArchitectDemo } from "./experience";

/**
 * /demo/architect — the guided walkthrough for architects and
 * building designers: the tender round they already run for clients,
 * with the admin gone. Same engine as /demo, its own script.
 */

export const metadata: Metadata = {
  title: "Watch the architect demo",
  description:
    "Run a full tender round for your client in four minutes: your documentation becomes a cited scope of works, your builders and ours price the same list, and the comparison comes back under your name.",
  alternates: { canonical: "/demo/architect" },
};

export default function ArchitectDemoPage() {
  return <ArchitectDemo />;
}
