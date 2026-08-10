import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

/**
 * /for/finance-brokers, retired.
 *
 * Finance was one of the four audience lenses on the old landing page.
 * The lens system is gone and finance brokers are not a side of a
 * tender round, so the story now lives entirely on the Preferred
 * Partner register. Old ad links, email signatures and inbound links
 * keep working and land where the content actually is.
 *
 * A 308 rather than a rewrite: the URL is genuinely retired, and search
 * engines should consolidate it onto the partner register. Kept as a
 * route file, next to the pages it replaced, rather than buried in
 * next.config, so it is obvious to whoever reads this folder next.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ForFinanceBrokersPage() {
  permanentRedirect("/partners/finance-brokers");
}
