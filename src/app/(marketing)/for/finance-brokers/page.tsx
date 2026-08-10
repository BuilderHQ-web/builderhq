import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

/**
 * /for/finance-brokers — retired. The finance lens no longer exists on the
 * landing page, but the Preferred Finance Partner programme does, so the URL
 * (indexed, and possibly linked) permanently redirects to it rather than 404s.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ForFinanceBrokersPage(): never {
  permanentRedirect("/partners/finance-brokers");
}
