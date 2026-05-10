/**
 * VerificationCallout — dashboard nudge for unverified builders.
 *
 * Sits above the rest of the dashboard whenever a builder hasn't
 * cleared verification. Lays out the trust contract plainly:
 *
 *   - You can browse projects
 *   - You can NOT unlock until ABN + licence are verified
 *   - Click here to fix
 *
 * Renders nothing once the profile is `approved` (the parent
 * decides whether to mount it at all — this is just defence in
 * depth).
 */

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Eye, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  approvalStatus:
    | "incomplete"
    | "pending_review"
    | "approved"
    | "rejected"
    | "suspended";
}

export function VerificationCallout({
  abnVerified,
  anyLicenceVerified,
  approvalStatus,
}: Props) {
  if (approvalStatus === "approved") return null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-md border border-warning/30",
        "bg-[linear-gradient(140deg,rgba(255,181,71,0.06)_0%,rgba(6,18,30,0.6)_70%)]",
        "shadow-[0_18px_44px_-22px_rgba(255,181,71,0.20)]",
      )}
    >
      <div
        aria-hidden
        className="absolute -top-24 -right-20 size-72 rounded-full pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(255,181,71,0.22), transparent 70%)",
        }}
      />

      <div className="relative px-6 lg:px-7 py-6 lg:py-7 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="size-9 rounded-md border border-warning/40 bg-[rgba(255,181,71,0.10)] flex items-center justify-center shrink-0 text-warning"
              aria-hidden
            >
              <Eye className="size-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] tracking-[0.22em] uppercase text-warning font-ui font-medium">
                Viewer mode
              </span>
              <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
                One step from unlocking projects
              </h2>
              <p className="mt-2 text-[12.5px] leading-[1.6] text-text-muted max-w-[62ch]">
                You can browse the marketplace and view every project right
                now. To unlock and tender, we need to verify your business
                identity against the public registers — keeps the platform
                trusted and owners confident in who they&apos;re working with.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChecklistItem
            done={abnVerified}
            label="Verify your ABN"
            sub={
              abnVerified
                ? "Confirmed against ABR."
                : "Live check against the Australian Business Register."
            }
            href="/builder/profile"
          />
          <ChecklistItem
            done={anyLicenceVerified}
            label="Verify a builder licence"
            sub={
              anyLicenceVerified
                ? "Confirmed with the state register."
                : "VIC verifies live against VBA. Other states get manual review."
            }
            href="/builder/profile"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11.5px] text-text-dim leading-[1.55] max-w-[58ch]">
            Approval is automatic the moment both checks pass — no waiting on
            our team.
          </p>
          <Link
            href="/builder/profile"
            className={cn(
              "group inline-flex items-center gap-2 h-10 px-5 rounded-full",
              "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
              "hover:bg-accent-hover transition-colors duration-[140ms]",
              "active:scale-[0.985] active:duration-[80ms]",
              "shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_8px_24px_-8px_rgba(0,212,200,0.45)]",
            )}
          >
            Open profile to verify
            <ArrowUpRight className="size-3.5 transition-transform duration-[140ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ChecklistItem({
  done,
  label,
  sub,
  href,
}: {
  done: boolean;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 px-4 py-3 rounded-md border",
        "transition-[border-color,background-color,transform] duration-[160ms]",
        done
          ? "border-border-accent/45 bg-[rgba(0,212,200,0.06)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.018)] hover:border-border-strong hover:bg-[rgba(255,255,255,0.03)]",
        "active:scale-[0.997] active:duration-[100ms]",
      )}
    >
      <span
        className={cn(
          "size-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
          done
            ? "border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent"
            : "border border-border-subtle bg-surface-1 text-text-faint",
        )}
        aria-hidden
      >
        {done ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <ShieldCheck className="size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] font-medium tracking-[-0.005em]",
            done ? "text-text" : "text-text",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11.5px] leading-[1.5]",
            done ? "text-text-dim" : "text-text-muted",
          )}
        >
          {sub}
        </p>
      </div>
      {!done ? (
        <ArrowUpRight className="size-3.5 text-text-faint shrink-0 mt-1 transition-transform duration-[140ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : null}
    </Link>
  );
}
