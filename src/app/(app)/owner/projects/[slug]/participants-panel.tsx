"use client";

/**
 * ParticipantsPanel — the sharing card on the project page (runner
 * only). The runner hands seats to the people who should see the
 * round without running it; the flagship case is an architect giving
 * their client the file.
 *
 * Two roles, worn warm: "Following" (watches the round and the
 * evaluation) and "Deciding" (can also shortlist, decline, award).
 * Invitations are email-bound, single-use, and lapse after 14 days;
 * pending rows expose copy-link and re-send, and any seat can be
 * removed, joined or not — the runner controls who watches their
 * client's file.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  inviteParticipantAction,
  listParticipantsAction,
  resendParticipantInviteAction,
  revokeParticipantAction,
  setParticipantRoleAction,
} from "@/app/(app)/_actions/participants";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ParticipantRole, ProjectParticipantRow } from "@/modules/projects";

type SeatRow = ProjectParticipantRow & {
  joinedUserName: string | null;
  expired: boolean;
  expiresAt: Date;
};

const ROLE_LABEL: Record<ParticipantRole, string> = {
  viewer: "Following",
  decider: "Deciding",
};
const ROLE_SUB: Record<ParticipantRole, string> = {
  viewer: "Sees the project, the tenders and the full evaluation.",
  decider: "Everything above, plus shortlisting and the award.",
};

export function ParticipantsPanel({
  projectId,
  audience = "architect",
}: {
  projectId: string;
  /** Who is doing the sharing. An architect shares with their client;
   *  an owner shares with their building designer or a co-owner. Same
   *  seats, different sentence. */
  audience?: "owner" | "architect";
}) {
  const [seats, setSeats] = useState<SeatRow[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const refresh = useCallback(async () => {
    const r = await listParticipantsAction(projectId);
    if (r.ok) setSeats(r.value);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const live = seats ?? [];

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 py-3 border-b border-border-subtle/60 flex items-center gap-2">
        <span className="text-accent-light [&_svg]:size-3">
          <Users />
        </span>
        <h3 className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold">
          Sharing
        </h3>
      </header>
      <div className="p-5">
        <p className="text-[12.5px] text-text-muted leading-relaxed">
          {audience === "owner"
            ? "Bring someone into the round: your building designer, or a co-owner of the project. A Following seat sees the project, the tenders and the evaluation; a Deciding seat can also shortlist and award."
            : "Give your client a seat at the round. A seat sees the project and the evaluation; a Deciding seat can also shortlist and award."}
        </p>

        {seats === null ? (
          <div className="flex items-center gap-2 py-5 justify-center text-text-dim">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-[12px]">Loading</span>
          </div>
        ) : live.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border-subtle px-3.5 py-4 text-center">
            <p className="text-[12.5px] text-text-muted">
              Not shared with anyone yet.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {live.map((seat) => (
              <SeatRowItem key={seat.id} seat={seat} onChanged={refresh} />
            ))}
          </ul>
        )}

        {formOpen ? (
          <InviteForm
            projectId={projectId}
            onDone={(sent) => {
              setFormOpen(false);
              if (sent) void refresh();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-strong text-text text-[12px] tracking-[0.02em] hover:bg-bg-elev transition-colors"
          >
            <Plus className="size-3.5" />
            Share the project
          </button>
        )}
      </div>
    </section>
  );
}

function SeatRowItem({
  seat,
  onChanged,
}: {
  seat: SeatRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const joined = seat.status === "joined";
  const displayName = seat.joinedUserName ?? seat.name ?? seat.email;
  const statusLine = joined
    ? `Joined${seat.joinedAt ? ` ${seat.joinedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}`
    : seat.expired
      ? "Invitation expired"
      : "Awaiting acceptance";

  const run = useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, doneMsg?: string) => {
      setBusy(true);
      const r = await fn();
      setBusy(false);
      if (!r.ok) {
        toast.error(("error" in r && r.error?.message) || "That did not work. Try again.");
        return;
      }
      if (doneMsg) toast.success(doneMsg);
      onChanged();
    },
    [onChanged],
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invite/p/${seat.inviteToken}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the link.");
    }
  }, [seat.inviteToken]);

  const nextRole: ParticipantRole = seat.role === "viewer" ? "decider" : "viewer";

  return (
    <li className="rounded-md border border-border-subtle bg-bg-elev/40 px-3.5 py-3">
      <div className="flex items-center gap-3">
        <span className="size-8 rounded-md border border-border-subtle text-text-dim flex items-center justify-center shrink-0">
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-ui font-medium text-[13px] text-text truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-text-dim truncate">
            {seat.email} ·{" "}
            <span className={cn(joined ? "text-[#0a7d73]" : seat.expired ? "text-[#8a6414]" : undefined)}>
              {statusLine}
            </span>
          </p>
        </div>
        <span className="shrink-0 px-2 py-1 rounded-sm border border-border-subtle text-[9.5px] tracking-[0.14em] uppercase text-text-muted font-ui font-semibold">
          {ROLE_LABEL[seat.role]}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11">
        <RowAction
          disabled={busy}
          onClick={() =>
            run(
              () => setParticipantRoleAction(seat.id, nextRole),
              `Access changed to ${ROLE_LABEL[nextRole]}.`,
            )
          }
        >
          Make {ROLE_LABEL[nextRole].toLowerCase()}
        </RowAction>
        {!joined ? (
          <>
            <RowAction disabled={busy} onClick={copyLink}>
              {copied ? (
                <span className="inline-flex items-center gap-1 text-[#0a7d73]">
                  <Check className="size-3" /> Copied
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Copy className="size-3" /> Copy link
                </span>
              )}
            </RowAction>
            <RowAction
              disabled={busy}
              onClick={() =>
                run(
                  () => resendParticipantInviteAction(seat.id),
                  "Invitation re-sent.",
                )
              }
            >
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="size-3" /> Re-send
              </span>
            </RowAction>
          </>
        ) : null}
        <RowAction
          disabled={busy}
          tone="danger"
          onClick={() =>
            run(() => revokeParticipantAction(seat.id), "Seat removed.")
          }
        >
          <span className="inline-flex items-center gap-1">
            <X className="size-3" /> Remove
          </span>
        </RowAction>
      </div>
    </li>
  );
}

function RowAction({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-[11px] transition-colors disabled:opacity-50",
        tone === "danger"
          ? "text-text-dim hover:text-[#b2483f]"
          : "text-text-dim hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function InviteForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: (sent: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<ParticipantRole>("viewer");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (!email.trim()) return;
    setBusy(true);
    const r = await inviteParticipantAction(projectId, {
      email: email.trim(),
      name: name.trim() || undefined,
      role,
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error.message ?? "Could not send the invitation.");
      return;
    }
    toast.success(
      r.value.emailed
        ? `Invitation sent to ${r.value.email}.`
        : "Seat created. The email could not be sent, so copy the link from the list.",
    );
    onDone(true);
  }, [email, name, role, projectId, onDone]);

  return (
    <div className="mt-4 rounded-md border border-border-subtle bg-bg-elev/40 p-3.5">
      <div className="grid grid-cols-1 gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="h-10 px-3 rounded-md border border-border-subtle bg-surface-1 text-[13px] text-text placeholder:text-text-faint outline-none focus:border-border-accent"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name (optional)"
          className="h-10 px-3 rounded-md border border-border-subtle bg-surface-1 text-[13px] text-text placeholder:text-text-faint outline-none focus:border-border-accent"
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {(Object.keys(ROLE_LABEL) as ParticipantRole[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left transition-colors",
              role === r
                ? "border-border-accent bg-[rgba(0,212,200,0.06)]"
                : "border-border-subtle hover:border-border-strong",
            )}
          >
            <span className="block text-[12px] font-ui font-semibold text-text">
              {ROLE_LABEL[r]}
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-snug text-text-dim">
              {ROLE_SUB[r]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={submit}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Mail className="size-3.5" />
          )}
          Send the invitation
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDone(false)}
          className="text-[12px] text-text-dim hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>
      <p className="mt-2.5 text-[10.5px] leading-snug text-text-dim">
        The invitation is bound to this email address, works once, and lapses
        after 14 days. You can change their access or remove the seat at any
        time.
      </p>
    </div>
  );
}
