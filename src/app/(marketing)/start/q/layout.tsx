import type { Metadata } from "next";
import * as React from "react";

/**
 * /start/q, the funnel steps.
 *
 * The /start landing is the page we want ranking. The steps behind it are
 * partial states of one form, so they are kept out of the index. The
 * parent /start layout declares `index: true` for the landing; this
 * segment overrides it for everything underneath. Step pages set only a
 * title, so this `robots` value survives the merge.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function StartFunnelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
