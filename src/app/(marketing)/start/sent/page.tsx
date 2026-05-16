/**
 * /start/sent — Step 3 (confirmation): magic link sent.
 *
 * Reached after a successful POST /api/start/contact. Shows the email
 * we sent to, a friendly "what happens next" block, a resend button
 * (rate-limited server-side), and a quiet "wrong email?" link back
 * to /start/contact.
 *
 * Also fires the Google Ads conversion event here — this is the
 * earliest moment we have a confirmed lead (user + project + magic
 * link sent). The final magic-link click is a deeper conversion
 * event, fired from /owner on first arrival with ?welcome=.
 */

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { SentBody } from "./sent-body";
import { StepDots } from "../_components/step-dots";

export const metadata = {
  title: "Check your inbox — BuilderHQ",
};

export default function StartSentPage() {
  return (
    <div className="px-5 md:px-10 pt-10 sm:pt-16">
      <div className="mx-auto max-w-[680px]">
        <Link
          href="/start/contact"
          className="inline-flex items-center gap-1.5 text-text-faint hover:text-text text-[12.5px] font-ui transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Wrong email?
        </Link>

        <div className="mt-8 sm:mt-10">
          <Suspense fallback={null}>
            <StepDots step={3} total={3} />
          </Suspense>

          <div className="mt-6 flex items-center justify-center size-16 rounded-2xl bg-accent-muted border border-border-accent">
            <Mail size={26} strokeWidth={1.6} className="text-accent-light" />
          </div>

          <h1 className="mt-6 font-display uppercase tracking-[-0.014em] leading-[0.95] text-[clamp(2rem,5vw+0.8rem,3.6rem)]">
            <span className="text-text">Check your</span>{" "}
            <span className="text-accent">inbox.</span>
          </h1>

          <Suspense fallback={<BodySkeleton />}>
            <SentBody />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function BodySkeleton() {
  return (
    <div className="mt-6 space-y-3 animate-pulse">
      <div className="h-5 bg-surface-1 rounded w-3/4" />
      <div className="h-5 bg-surface-1 rounded w-1/2" />
    </div>
  );
}
