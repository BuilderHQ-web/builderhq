"use client";

/**
 * Danger-zone form: soft-delete the current user's account.
 *
 * Confirmation has two gates:
 *
 *   1. Type the literal word "delete" — guards against muscle-memory
 *      submits + auto-filled password managers.
 *   2. Re-enter the current password — proof of credential possession
 *      (same pattern as the password-change form, same guarantee:
 *      "this is really you").
 *
 * The form is hidden behind a confirm-toggle so the destructive button
 * isn't a one-click hazard. Toggling open reveals the two inputs +
 * the final red CTA.
 *
 * After successful delete the server action calls signOut({ redirectTo })
 * which throws NEXT_REDIRECT → the user lands on /login?account_deleted=1.
 * We never see a "success" state on the client side, only error states.
 */

import { useActionState, useState, useTransition } from "react";
import { Loader2, AlertTriangle, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { deleteMyAccountAction, type SettingsActionState } from "./actions";

const initial: SettingsActionState = {};

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteMyAccountAction, initial);
  const [pending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-danger/20 bg-danger/[0.04] p-4 flex flex-col gap-2">
        <div className="flex items-start gap-2.5">
          <ShieldOff className="size-3.5 text-danger mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <h3 className="font-ui font-semibold text-[13px] text-text">
              Delete my account
            </h3>
            <p className="text-[12.5px] text-text-dim leading-[1.55]">
              We&apos;ll scrub your personal details (name, email, phone, business
              address) and lock the account from future sign-ins. Projects you
              uploaded and tenders you submitted will stay visible to the people
              you transacted with, but tied to a &ldquo;Deleted user&rdquo;
              label. This action is irreversible from the UI — true erasure
              (GDPR/Privacy Act) is a separate engineering request.
            </p>
          </div>
        </div>
      </div>

      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => setOpen(true)}
          className="self-start gap-2 !border-danger/40 !text-danger hover:!bg-danger/10"
        >
          <AlertTriangle className="size-3.5" />
          Start account deletion
        </Button>
      ) : (
        <form
          action={(fd) => startTransition(() => formAction(fd))}
          className="flex flex-col gap-4 rounded-md border border-danger/25 bg-danger/[0.03] p-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-currentPassword">
              Re-enter your password
            </Label>
            <Input
              id="delete-currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(fieldError("currentPassword"))}
            />
            {fieldError("currentPassword") ? (
              <p className="text-[11px] text-danger">
                {fieldError("currentPassword")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirmation">
              Type <span className="font-mono text-danger">delete</span> to
              confirm
            </Label>
            <Input
              id="delete-confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              required
              aria-invalid={Boolean(fieldError("confirmation"))}
            />
            {fieldError("confirmation") ? (
              <p className="text-[11px] text-danger">
                {fieldError("confirmation")}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <div
              role="alert"
              className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
            >
              {state.error}
            </div>
          ) : null}

          <p className="text-[11.5px] text-text-dim">
            You&apos;ll be signed out immediately after this completes.
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={pending}
              className="gap-2"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="size-3.5" />
              )}
              {pending ? "Deleting…" : "Permanently delete my account"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
