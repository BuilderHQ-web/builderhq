"use client";

/**
 * Builder-action controls — approve / reject / suspend / reinstate.
 *
 * Two flavours:
 *
 *   <BuilderInlineActions />  — used in the builder list. Compact: an
 *      "Approve" button (one-click for pending_review/rejected/suspended)
 *      plus a "Reject" / "Suspend" trigger that opens an inline reason
 *      prompt. No modal — the row expands to fit a small textarea.
 *
 *   <BuilderDetailActions />  — used on the detail page. Generous: a
 *      vertical stack of buttons, each opening the same reason prompt
 *      below. Same handlers, richer affordance.
 *
 * Both call into the admin server actions and surface Result<...>
 * errors via the toast bus. Successful writes trigger a router refresh
 * so the row/page rerenders with the new approval status pulled from
 * the cache-invalidated server data.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  PauseOctagon,
  Undo2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  approveBuilderAction,
  rejectBuilderAction,
  suspendBuilderAction,
  unsuspendBuilderAction,
} from "@/app/(app)/_actions/admin";

type ApprovalStatus =
  | "incomplete"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

interface CommonProps {
  builderId: string;
  status: ApprovalStatus;
  /** Hides the descriptive subhead used on the detail card. */
  compact?: boolean;
}

type Mode = null | "reject" | "suspend";

export function BuilderInlineActions({ builderId, status }: CommonProps) {
  return <ActionsCore builderId={builderId} status={status} compact />;
}

export function BuilderDetailActions({ builderId, status }: CommonProps) {
  return <ActionsCore builderId={builderId} status={status} compact={false} />;
}

function ActionsCore({ builderId, status, compact = false }: CommonProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode(null);
    setReason("");
  }

  const runApprove = () => {
    startTransition(async () => {
      const r = await approveBuilderAction(builderId);
      if (!r.ok) {
        toast.error("Couldn't approve", r.error.message);
        return;
      }
      toast.success("Builder approved");
      router.refresh();
    });
  };

  const runUnsuspend = () => {
    startTransition(async () => {
      const r = await unsuspendBuilderAction(builderId);
      if (!r.ok) {
        toast.error("Couldn't reinstate", r.error.message);
        return;
      }
      toast.success("Builder reinstated");
      router.refresh();
    });
  };

  const runWithReason = (kind: "reject" | "suspend") => {
    const trimmed = reason.trim();
    if (trimmed.length < 4) {
      toast.error(
        "Reason required",
        "Give at least a short note — it's logged to the audit trail.",
      );
      return;
    }
    startTransition(async () => {
      const r =
        kind === "reject"
          ? await rejectBuilderAction(builderId, trimmed)
          : await suspendBuilderAction(builderId, trimmed);
      if (!r.ok) {
        toast.error(`Couldn't ${kind}`, r.error.message);
        return;
      }
      toast.success(kind === "reject" ? "Builder rejected" : "Builder suspended");
      reset();
      router.refresh();
    });
  };

  // Visibility matrix — different controls per current state.
  const canApprove =
    status === "pending_review" ||
    status === "rejected" ||
    status === "suspended";
  const canReject = status === "pending_review";
  const canSuspend = status === "approved";
  const canReinstate = status === "rejected" || status === "suspended";

  const hasAny = canApprove || canReject || canSuspend || canReinstate;
  if (!hasAny) {
    return compact ? null : (
      <p className="text-[12px] text-text-dim">
        No actions available — profile still incomplete.
      </p>
    );
  }

  // Buttons use `sm` size (h-8 ≈ 32px) at desktop where the table is dense,
  // but bump to a 44px minimum-tap-target on touch via responsive class.
  const touchSize = "max-sm:!h-11 max-sm:!px-5 max-sm:!text-[13px]";
  // In the detail (non-compact) view the buttons own their full row width
  // so they look balanced when stacked.
  const detailWidth = !compact ? "max-sm:w-full" : "";

  return (
    <div className={cn("flex flex-col gap-3", compact ? "w-full" : "w-full")}>
      {/* row of action buttons */}
      <div
        className={cn(
          "flex gap-2",
          compact ? "flex-wrap" : "flex-col sm:flex-row",
        )}
      >
        {canApprove ? (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={runApprove}
            disabled={pending || mode !== null}
            className={cn("gap-1.5", touchSize, detailWidth)}
          >
            {pending && mode === null ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Approve
          </Button>
        ) : null}
        {canReject ? (
          <Button
            type="button"
            size="sm"
            variant={mode === "reject" ? "danger" : "outline"}
            onClick={() => setMode(mode === "reject" ? null : "reject")}
            disabled={pending}
            className={cn("gap-1.5", touchSize, detailWidth)}
          >
            <X className="size-3.5" />
            Reject
          </Button>
        ) : null}
        {canSuspend ? (
          <Button
            type="button"
            size="sm"
            variant={mode === "suspend" ? "danger" : "outline"}
            onClick={() => setMode(mode === "suspend" ? null : "suspend")}
            disabled={pending}
            className={cn("gap-1.5", touchSize, detailWidth)}
          >
            <PauseOctagon className="size-3.5" />
            Suspend
          </Button>
        ) : null}
        {canReinstate && !canApprove ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={runUnsuspend}
            disabled={pending || mode !== null}
            className={cn("gap-1.5", touchSize, detailWidth)}
          >
            <Undo2 className="size-3.5" />
            Reinstate
          </Button>
        ) : null}
      </div>

      {/* reason capture — shown only when reject/suspend mode is on */}
      {mode !== null ? (
        <div className="rounded-md border border-border-subtle bg-surface-1/60 p-3 flex flex-col gap-2">
          <label className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-medium flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-warning" />
            Reason for {mode === "reject" ? "rejecting" : "suspending"}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              mode === "reject"
                ? "What's missing or wrong? The builder sees this."
                : "Why are we suspending? Stays internal."
            }
            rows={3}
            disabled={pending}
          />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={pending}
              className={cn(touchSize)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => runWithReason(mode)}
              disabled={pending || reason.trim().length < 4}
              className={cn("gap-1.5", touchSize)}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : mode === "reject" ? (
                <X className="size-3.5" />
              ) : (
                <PauseOctagon className="size-3.5" />
              )}
              Confirm {mode === "reject" ? "reject" : "suspend"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
