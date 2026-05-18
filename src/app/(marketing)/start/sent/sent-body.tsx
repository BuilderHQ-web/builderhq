"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";

import { env } from "@/lib/env";

/**
 * Confirmation body + resend handler + Google Ads conversion event.
 *
 * Fires the lead conversion event ONCE per page mount (idempotent
 * via sessionStorage marker keyed on the project id). Value is
 * passed in from the parent server component, sourced from the
 * quiz's budget tier so Google Ads gets a weighted signal.
 */

type GtagFn = (...args: unknown[]) => void;

interface Props {
  email: string | null;
  projectId: string | null;
  projectTitle: string | null;
  /** AUD value for the conversion event. Tier-mapped from budget band. */
  conversionValue: number;
  /** Was step 7 "uploaded" (plans attached) or "skipped"? Drives copy. */
  plansOutcome: "uploaded" | "skipped";
}

export function SentBody({
  email,
  projectId,
  projectTitle,
  conversionValue,
  plansOutcome,
}: Props) {
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  // Conversion event — once per project, this session only.
  useEffect(() => {
    if (!projectId) return;
    const key = `ads_funnel_conv:${projectId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const adsId = env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    const label = env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
    const w = window as unknown as { gtag?: GtagFn };
    if (adsId && label && typeof w.gtag === "function") {
      w.gtag("event", "conversion", {
        send_to: `${adsId}/${label}`,
        value: conversionValue,
        currency: "AUD",
        transaction_id: projectId,
      });
    }
  }, [projectId, conversionValue]);

  const handleResend = useCallback(async () => {
    if (!email || !projectId) return;
    setResendState("sending");
    try {
      const res = await fetch("/api/start/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, projectId }),
      });
      if (res.ok) {
        setResendState("sent");
      } else {
        setResendState("error");
      }
    } catch {
      setResendState("error");
    }
  }, [email, projectId]);

  const adsId = env.NEXT_PUBLIC_GOOGLE_ADS_ID;

  const headline =
    plansOutcome === "uploaded"
      ? "We've got your plans."
      : "We've saved your project.";
  const lead =
    plansOutcome === "uploaded" ? (
      <>
        Open the email and tap the link — your project goes live to verified
        Australian builders the moment you confirm.
      </>
    ) : (
      <>
        Open the email and tap the link. You&apos;ll land in your dashboard,
        ready to add plans whenever you have them.
      </>
    );

  return (
    <>
      {/* Google Ads tag loader. Only loads here, not on the landing —
              keeps the public hero clean of marketing scripts. */}
      {adsId ? (
        <>
          <Script
            id="gtag-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${adsId}');
            `}
          </Script>
        </>
      ) : null}

      <p className="mt-6 text-accent-light text-[11px] tracking-[0.22em] uppercase font-ui font-semibold">
        {headline}
      </p>
      <p className="mt-3 text-text-muted text-[16px] sm:text-[17px] leading-[1.55] font-body">
        We sent a one-click link to{" "}
        <strong className="text-text">{email ?? "your email"}</strong>.{" "}
        {lead}
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface-1/40 p-5">
        <p className="text-[10px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold">
          What happens next
        </p>
        <ol className="mt-4 space-y-3 text-[13.5px] font-body text-text-muted">
          <Step n={1}>Open the email and tap the magic link.</Step>
          <Step n={2}>
            {plansOutcome === "uploaded" ? (
              <>
                Your project{projectTitle ? <> — <em>{projectTitle}</em></> : null} goes live to verified Australian builders.
              </>
            ) : (
              <>You land in your dashboard. Add plans when ready to go live.</>
            )}
          </Step>
          <Step n={3}>Compare up to three tenders side-by-side. Pick one.</Step>
        </ol>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={
            !email ||
            !projectId ||
            resendState === "sending" ||
            resendState === "sent"
          }
          className="inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-[13px] font-ui font-semibold border border-border-strong bg-surface-1/60 text-text hover:bg-surface-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resendState === "sending" ? (
            <>
              <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
              Sending…
            </>
          ) : resendState === "sent" ? (
            <>
              <CheckCircle2
                size={14}
                strokeWidth={2.2}
                className="text-accent-light"
              />
              Link resent
            </>
          ) : (
            "Resend the link"
          )}
        </button>
        <span className="text-[12px] text-text-faint font-ui">
          Didn&apos;t arrive? Check your spam folder.
        </span>
      </div>

      {resendState === "error" ? (
        <p
          role="alert"
          className="mt-4 text-[12.5px] text-warning font-body"
        >
          Couldn&apos;t resend right now. Try again in a minute, or email{" "}
          <a
            className="underline"
            href="mailto:info@builderhq.com.au"
          >
            info@builderhq.com.au
          </a>
          .
        </p>
      ) : null}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center size-5 rounded-full border border-border-strong bg-surface-0/60 text-[11px] text-text-faint font-ui font-semibold shrink-0">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
