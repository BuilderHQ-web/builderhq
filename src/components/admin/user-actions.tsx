"use client";

/**
 * User-account status controls — suspend / unsuspend / ban / unban.
 *
 * Distinct from builder-actions because the underlying state machine
 * is on `users.status` (account access), not on `builder_profiles`.
 * A builder can be approved AND suspended simultaneously, which means
 * "your profile is approved but you can't sign in" — that's the
 * intended escape hatch for serious abuse.
 *
 * Both write operations require a reason (matches the service-layer
 * validation). Reason flows into the audit log.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, PauseOctagon, Undo2, AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  banUserAction,
  suspendUserAction,
  unbanUserAction,
  unsuspendUserAction,
} from "@/app/(app)/_actions/admin";

type UserStatus = "pending_verification" | "active" | "suspended" | "banned";
type Role = "project_owner" | "builder" | "admin" | null;
type Mode = null | "suspend" | "ban";

interface Props {
  userId: string;
  status: UserStatus;
  role: Role;
  compact?: boolean;
}

export function UserAccountActions({
  userId,
  status,
  role,
  compact = false,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode(null);
    setReason("");
  }

  const runUnsuspend = () => {
    startTransition(async () => {
      const r = await unsuspendUserAction(userId);
      if (!r.ok) {
        toast.error("Couldn't unsuspend", r.error.message);
        return;
      }
      toast.success("User reactivated");
      router.refresh();
    });
  };

  const runUnban = () => {
    startTransition(async () => {
      const r = await unbanUserAction(userId);
      if (!r.ok) {
        toast.error("Couldn't unban", r.error.message);
        return;
      }
      toast.success("User reactivated");
      router.refresh();
    });
  };

  const runWithReason = (kind: "suspend" | "ban") => {
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
        kind === "suspend"
          ? await suspendUserAction(userId, trimmed)
          : await banUserAction(userId, trimmed);
      if (!r.ok) {
        toast.error(`Couldn't ${kind}`, r.error.message);
        return;
      }
      toast.success(
        kind === "suspend" ? "User suspended" : "User banned",
      );
      reset();
      router.refresh();
    });
  };

  // Admin accounts are protected — no actions surfaced. Server-side
  // also rejects, this just keeps the UI clean.
  if (role === "admin") {
    return compact ? null : (
      <p className="text-[12px] text-text-dim">
        Admin accounts can&apos;t be changed from here.
      </p>
    );
  }

  const canSuspend = status === "active" || status === "pending_verification";
  const canUnsuspend = status === "suspended";
  const canBan = status !== "banned";
  const canUnban = status === "banned";

  return (
    <div className={cn("flex flex-col gap-3", compact ? "w-full" : "w-full")}>
      <div
        className={cn(
          "flex gap-2",
          compact ? "flex-wrap" : "flex-col sm:flex-row",
        )}
      >
        {canSuspend ? (
          <Button
            type="button"
            size="sm"
            variant={mode === "suspend" ? "danger" : "outline"}
            onClick={() => setMode(mode === "suspend" ? null : "suspend")}
            disabled={pending}
            className="gap-1.5"
          >
            <PauseOctagon className="size-3.5" />
            Suspend
          </Button>
        ) : null}
        {canUnsuspend ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={runUnsuspend}
            disabled={pending || mode !== null}
            className="gap-1.5"
          >
            <Undo2 className="size-3.5" />
            Unsuspend
          </Button>
        ) : null}
        {canBan ? (
          <Button
            type="button"
            size="sm"
            variant={mode === "ban" ? "danger" : "outline"}
            onClick={() => setMode(mode === "ban" ? null : "ban")}
            disabled={pending}
            className="gap-1.5"
          >
            <Ban className="size-3.5" />
            Ban
          </Button>
        ) : null}
        {canUnban ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={runUnban}
            disabled={pending || mode !== null}
            className="gap-1.5"
          >
            <Undo2 className="size-3.5" />
            Unban
          </Button>
        ) : null}
      </div>

      {mode !== null ? (
        <div className="rounded-md border border-border-subtle bg-surface-1/60 p-3 flex flex-col gap-2">
          <label className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-medium flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-warning" />
            Reason for {mode === "suspend" ? "suspending" : "banning"}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              mode === "suspend"
                ? "Temporary block — why?"
                : "Permanent ban — be specific."
            }
            rows={3}
            disabled={pending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => runWithReason(mode)}
              disabled={pending || reason.trim().length < 4}
              className="gap-1.5"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : mode === "suspend" ? (
                <PauseOctagon className="size-3.5" />
              ) : (
                <Ban className="size-3.5" />
              )}
              Confirm {mode}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
