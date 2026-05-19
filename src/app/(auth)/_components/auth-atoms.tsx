import * as React from "react";

/**
 * Shared atoms reused across every auth page — banners (status
 * messages above forms) and field errors (inline under inputs).
 *
 * Kept here so the auth pages render the same tones / spacing no
 * matter which surface (login / signup / forgot / claim / reset)
 * the user lands on.
 */

type Tone = "info" | "success" | "warning" | "error";

const BANNER_TONE_CLS: Record<Tone, string> = {
  info: "border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] text-text-muted",
  success: "border-accent/25 bg-accent-muted/50 text-accent-light",
  warning:
    "border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.06)] text-warning",
  error:
    "border-[rgba(255,80,80,0.22)] bg-[rgba(255,80,80,0.04)] text-danger",
};

export function AuthBanner({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`w-full rounded-md border px-3.5 py-2.5 text-[12.5px] text-left font-body leading-[1.5] ${BANNER_TONE_CLS[tone]}`}
    >
      {children}
    </div>
  );
}

export function AuthFieldError({ msg }: { msg: string }) {
  return <p className="text-[12px] text-danger text-left">{msg}</p>;
}
