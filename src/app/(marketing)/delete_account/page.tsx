import Link from "next/link";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";
import { ArrowUpRight, Mail } from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";

/**
 * /delete_account, the utility page that tells a user how to request
 * account deletion (email us).
 *
 * Wears MarketingPageShell, the same chrome as /privacy and /terms, so it
 * belongs to the marketing surface rather than reading as a stub. It ran
 * on the retired v1 dark nav and footer until August 2026.
 *
 * App-store policy note: a public account-deletion endpoint of some kind
 * is required by Google Play (since 2023) and Apple App Store (since
 * 5.1.1(v) in 2022). An "email this address" page is the minimum
 * compliant form. When we have an in-app delete flow we will link to it
 * from here.
 */

export const metadata = {
  title: "Delete your account",
  description:
    "How to request deletion of your BuilderHQ account and all associated data.",
};

const SUPPORT_EMAIL = "info@builderhq.com.au";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Account deletion request",
)}&body=${encodeURIComponent(
  "Hi BuilderHQ team,\n\nI'd like to delete my account and all associated data. The email I signed up with is:\n\n[your email]\n\nThanks.",
)}`;

export default async function DeleteAccountPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  return (
    <MarketingPageShell
      authedHref={navAuthedHref} kicker="Legal" title="Delete your account.">
      <div className="max-w-[62ch]">
        <p className="text-[17px] leading-[1.65] text-text-muted">
          If you wish to delete your account, email us at{" "}
          <a
            href={MAILTO_HREF}
            className="text-accent-light underline underline-offset-4 hover:text-accent transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
          . We’ll permanently delete your account and all data associated
          with it.
        </p>

        <div className="mt-9">
          <Link
            href={MAILTO_HREF}
            className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast font-ui text-[15px] font-semibold tracking-[0.01em] hover:bg-accent-hover transition-colors duration-[160ms]"
          >
            <Mail className="size-4" strokeWidth={2.2} />
            Email {SUPPORT_EMAIL}
            <ArrowUpRight
              className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2.4}
            />
          </Link>
        </div>

        <p className="mt-8 text-[11px] tracking-[0.18em] uppercase text-text-muted font-ui font-semibold">
          Typically processed within 7 business days
        </p>
      </div>
    </MarketingPageShell>
  );
}
