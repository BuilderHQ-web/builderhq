/**
 * /start/contact — Step 2: capture email + phone + name + Turnstile.
 *
 * This is the conversion moment. Submitting creates the user + draft
 * project and sends the magic link. After this the user is on /start/sent
 * waiting for the email — they've converted in our funnel data even if
 * they never click the link.
 *
 * The page must have:
 *   · A clear reason to give email/phone (not generic "register")
 *   · Friction minimums (4 fields total)
 *   · Visible trust signal (Turnstile + "we never share contact details")
 *   · Inline validation that doesn't punish first-pass typing
 *   · Prominent next-step preview ("we email you a link to publish")
 */

import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ContactForm } from "./contact-form";
import { StepDots } from "../_components/step-dots";
import { env } from "@/lib/env";

export const metadata = {
  title: "Almost there — BuilderHQ",
};

export default function StartContactPage() {
  return (
    <div className="px-5 md:px-10 pt-10 sm:pt-16">
      <div className="mx-auto max-w-[1080px]">
        <Link
          href="/start/type"
          className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12.5px] font-ui transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Back
        </Link>

        <div className="mt-8 sm:mt-10 mb-10 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-start">
          <div>
            <Suspense fallback={null}>
              <StepDots step={2} total={3} />
            </Suspense>
            <h1 className="mt-5 font-display uppercase tracking-[-0.014em] leading-[0.95] text-[clamp(2rem,5vw+0.8rem,3.8rem)]">
              <span className="text-text">Where do we</span>{" "}
              <span className="text-accent">send your link?</span>
            </h1>
            <p className="mt-4 text-text-muted text-[15px] sm:text-[16px] leading-[1.55] max-w-[460px] font-body">
              We&apos;ll email a one-click link to publish your project. Your
              details stay private — no builder sees them until you award a
              tender.
            </p>

            <ul className="mt-7 space-y-2.5 text-[13px] font-body text-text-muted">
              <Bullet>Email + phone so verified builders can reach you</Bullet>
              <Bullet>Your project stays private until you confirm</Bullet>
              <Bullet>We never share your details with non-verified parties</Bullet>
            </ul>
          </div>

          <Suspense fallback={<FormSkeleton />}>
            <ContactForm
              turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden
        className="mt-1.5 size-1 rounded-full bg-accent shrink-0"
      />
      <span>{children}</span>
    </li>
  );
}

function FormSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface-1/40 p-6 sm:p-7 h-[420px] animate-pulse" />
  );
}
