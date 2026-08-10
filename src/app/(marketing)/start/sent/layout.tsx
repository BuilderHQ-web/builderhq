import type { Metadata } from "next";
import * as React from "react";

/**
 * /start/sent, the end of the funnel.
 *
 * Noindex: the page prints the email address the magic link was sent to,
 * so it must never be crawled or cached by a search engine. The page sets
 * only a title, so this `robots` value survives the metadata merge with
 * the parent /start layout.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function StartSentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
