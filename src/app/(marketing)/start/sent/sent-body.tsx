"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";

import { env } from "@/lib/env";

/**
 * Confirmation body + resend handler + Google Ads conversion event.
 *
 * Fires the lead-conversion event ONCE per page mount via gtag if
 * NEXT_PUBLIC_GOOGLE_ADS_ID + LABEL are set. Idempotent within a
 * session via a sessionStorage marker keyed on the project id.
 */

// gtag global is augmented elsewhere in the app (analytics layer). We
// re-declare the parts we use loosely so this file doesn't conflict
// with the project-wide signature.
type GtagFn = (...args: unknown[]) => void;

export function SentBody() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const projectId = params.get("pid") ?? "";
  const retry = params.get("retry") === "1";

  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "throttled" | "error"
  >(retry ? "error" : "idle");

  // Fire conversion event on mount (idempotent per project).
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
        transaction_id: projectId,
      });
    }
  }, [projectId]);

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

  return (
    <>
      {/* Google Ads / GA4 script — loaded once at /start/sent so it's
              only paid on conversion, not on the public landing. */}
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

      <p className="mt-6 text-text-muted text-[16px] leading-[1.55] font-body">
        We sent a one-click link to{" "}
        <strong className="text-text">{email || "your email"}</strong>. Open
        it on this device to publish your project and land in your
        dashboard — already signed in.
      </p>

      <div className="mt-7 rounded-2xl border border-border bg-surface-1/40 p-5">
        <p className="text-[10px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold">
          What happens next
        </p>
        <ol className="mt-3 space-y-2.5 text-[13.5px] font-body text-text-muted">
          <Step n={1}>Open the email and tap the link.</Step>
          <Step n={2}>Your project goes live to verified Australian builders.</Step>
          <Step n={3}>Compare up to three tenders side-by-side, then pick.</Step>
        </ol>
      </div>

      <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={handleResend}
          disabled={resendState === "sending" || resendState === "sent"}
          className="inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-[13.5px] font-ui font-semibold border border-border-strong bg-surface-1/60 text-text hover:bg-surface-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        <span className="text-[12.5px] text-text-faint font-ui">
          Didn&apos;t arrive? Check your spam folder.
        </span>
      </div>

      {resendState === "error" ? (
        <p
          role="alert"
          className="mt-4 text-[12.5px] text-warning font-body"
        >
          We couldn&apos;t resend right now. Wait a minute and try again, or
          email <a className="underline" href="mailto:info@builderhq.com.au">info@builderhq.com.au</a>.
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
