"use client";

/**
 * Wizard step 4 — the tender round.
 *
 * Who gets to price this project, and how many spots exist. Three
 * modes (open / private / hybrid), a 2-5 spot selector, and — for
 * private and hybrid rounds — the invitation manager: pick approved
 * builders from the BuilderHQ directory or invite a builder the
 * runner already works with by email. Invited builders join free via
 * a single-use link; open spots stay paid unlocks.
 *
 * Mode and spots ride the wizard's autosave pipeline (setField) and
 * lock once the project is live (service enforces). Invitations are
 * independent of publish state: runners can add builders to a live
 * round, which is exactly when they need to.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Globe2,
  Lock,
  Combine,
  Check,
  Link2,
  Loader2,
  Mail,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  createBuilderInviteAction,
  listBuilderInvitesAction,
  revokeBuilderInviteAction,
  listApprovedBuildersAction,
} from "@/app/(app)/_actions/tender-invites";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { Project, UpdateProjectInput } from "@/modules/projects";
import type { TenderBuilderInviteRow } from "@/modules/tenders";
import type { DirectoryBuilder } from "@/modules/profiles";

type InviteRow = TenderBuilderInviteRow & { builderName: string | null };
type TenderMode = NonNullable<Project["tenderMode"]>;

const MODES: Array<{
  id: TenderMode;
  title: string;
  sub: string;
  icon: React.ReactNode;
}> = [
  {
    id: "open",
    title: "Open",
    sub: "Approved builders across the BuilderHQ network can take a spot.",
    icon: <Globe2 className="size-4" />,
  },
  {
    id: "private",
    title: "Private",
    sub: "Only builders you invite can price it. It never appears in the marketplace.",
    icon: <Lock className="size-4" />,
  },
  {
    id: "hybrid",
    title: "Hybrid",
    sub: "Your invited builders, plus open spots for the network to fill.",
    icon: <Combine className="size-4" />,
  },
];

/** Step-by-step expectation setting per mode — what happens next. */
const MODE_FLOW: Record<TenderMode, string[]> = {
  open: [
    "Your project goes live to approved builders in the network.",
    "Builders take a spot and price from your documents.",
    "You compare every submission side by side.",
  ],
  private: [
    "You invite the builders you want pricing this project.",
    "Each builder joins through their own link, at no cost to them.",
    "You compare every submission side by side.",
  ],
  hybrid: [
    "You invite your builders. They join free through their own link.",
    "Remaining spots open to approved builders in the network.",
    "You compare every submission side by side.",
  ],
};

export function TenderRoundStep({
  project,
  setField,
  disabled,
}: {
  project: Project;
  setField: <K extends keyof UpdateProjectInput>(
    k: K,
    v: UpdateProjectInput[K],
  ) => void;
  disabled: boolean;
}) {
  const mode: TenderMode = project.tenderMode ?? "open";
  const spots = project.tenderSpots ?? 3;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display uppercase tracking-[-0.018em] text-[24px] sm:text-[32px] leading-[0.95] text-text">
          Tender round
        </h2>
        <p className="mt-2 text-[13px] sm:text-[13.5px] leading-[1.6] text-text-muted">
          Decide who prices this project and how many spots exist. You can
          publish first and invite builders later.
        </p>
      </div>

      {/* Mode */}
      <StepCard
        icon={<Globe2 className="size-4" />}
        title="Who can tender"
        sub={
          disabled
            ? "Round settings are locked while the project is live."
            : "Pick how builders come to this round."
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => setField("tenderMode", m.id)}
                aria-pressed={active}
                className={cn(
                  "text-left rounded-md border p-4 transition-colors",
                  active
                    ? "border-border-accent bg-[rgba(0,212,200,0.05)]"
                    : "border-border-subtle bg-[rgba(24,34,44,0.02)] hover:border-border-strong",
                  disabled && "opacity-60 cursor-not-allowed",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "size-8 rounded-md border flex items-center justify-center shrink-0",
                      active
                        ? "border-border-accent text-accent-light bg-[rgba(0,212,200,0.08)]"
                        : "border-border-subtle text-text-dim bg-transparent",
                    )}
                  >
                    {m.icon}
                  </span>
                  {active ? (
                    <span className="size-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-ui font-semibold text-[13.5px] text-text">
                  {m.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-[1.55] text-text-dim">
                  {m.sub}
                </p>
              </button>
            );
          })}
        </div>

        {/* What happens next */}
        <div className="mt-4 rounded-md border border-border-subtle/70 bg-[rgba(24,34,44,0.025)] px-4 py-3.5">
          <p className="text-[10.5px] font-ui font-semibold uppercase tracking-[0.1em] text-text-dim">
            How this round runs
          </p>
          <ol className="mt-2 space-y-1.5">
            {MODE_FLOW[mode].map((line, i) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-[12.5px] leading-[1.55] text-text-muted"
              >
                <span className="mt-[1px] size-[18px] rounded-full border border-border-subtle text-[10px] font-ui font-semibold text-text-dim flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
          <p className="mt-3 pt-3 border-t border-border-subtle/60 text-[11.5px] leading-[1.55] text-text-dim">
            Whoever you share this project with sees everything either way.
            The mode only controls which builders can take part.
          </p>
        </div>
      </StepCard>

      {/* Spots */}
      <StepCard
        icon={<UserRound className="size-4" />}
        title="Tender spots"
        sub="How many builders can price this project."
      >
        <div className="flex items-center gap-2">
          {[2, 3, 4, 5].map((n) => {
            const active = spots === n;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => setField("tenderSpots", n)}
                aria-pressed={active}
                className={cn(
                  "h-11 w-14 rounded-md border font-ui font-semibold text-[14px] transition-colors",
                  active
                    ? "border-border-accent bg-[rgba(0,212,200,0.07)] text-text"
                    : "border-border-subtle bg-[rgba(24,34,44,0.03)] text-text-muted hover:border-border-strong",
                  disabled && "opacity-60 cursor-not-allowed",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11.5px] leading-[1.55] text-text-dim">
          Three is the sweet spot for most projects: real competition without
          wasting builders&rsquo; time. Invited builders count towards these
          spots.
        </p>
      </StepCard>

      {/* Invitations — private + hybrid only */}
      {mode !== "open" ? (
        <InvitesManager projectId={project.id} spots={spots} mode={mode} />
      ) : null}
    </div>
  );
}

// ── invitations manager ──────────────────────────────────────────────────

function InvitesManager({
  projectId,
  spots,
  mode,
}: {
  projectId: string;
  spots: number;
  mode: TenderMode;
}) {
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [panel, setPanel] = useState<"none" | "directory" | "email">("none");

  const refresh = useCallback(async () => {
    const r = await listBuilderInvitesAction(projectId);
    if (r.ok) setInvites(r.value);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const live = invites ?? [];

  return (
    <StepCard
      icon={<Mail className="size-4" />}
      title="Invited builders"
      sub={
        mode === "private"
          ? "Only these builders can price the project. They join free."
          : "These builders join free. Remaining spots open to the network."
      }
    >
      {/* Count vs spots */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[12px] text-text-muted">
          <span className="font-ui font-semibold text-text">{live.length}</span>{" "}
          invited · {spots} spots in the round
        </p>
        {live.length > spots ? (
          <p className="text-[11px] text-text-dim">
            Spots fill first come, first served.
          </p>
        ) : null}
      </div>

      {/* Invite list */}
      {invites === null ? (
        <div className="flex items-center gap-2 py-6 justify-center text-text-dim">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-[12px]">Loading invitations</span>
        </div>
      ) : live.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center">
          <p className="text-[13px] text-text-muted">
            No builders invited yet.
          </p>
          <p className="mt-1 text-[11.5px] text-text-dim">
            Pick from the BuilderHQ directory, or invite a builder you already
            work with by email.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {live.map((inv) => (
            <InviteRowItem key={inv.id} invite={inv} onChanged={refresh} />
          ))}
        </ul>
      )}

      {/* Add actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPanel(panel === "directory" ? "none" : "directory")}
          className={cn(
            "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-[12px] tracking-[0.02em] transition-colors",
            panel === "directory"
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
              : "border-border-strong text-text hover:bg-surface-1",
          )}
        >
          <Search className="size-3.5" />
          From the directory
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "email" ? "none" : "email")}
          className={cn(
            "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-[12px] tracking-[0.02em] transition-colors",
            panel === "email"
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
              : "border-border-strong text-text hover:bg-surface-1",
          )}
        >
          <Plus className="size-3.5" />
          Invite by email
        </button>
      </div>

      {panel === "directory" ? (
        <DirectoryPicker
          projectId={projectId}
          invited={live}
          onInvited={() => {
            refresh();
          }}
        />
      ) : null}
      {panel === "email" ? (
        <EmailInviteForm
          projectId={projectId}
          onInvited={() => {
            setPanel("none");
            refresh();
          }}
        />
      ) : null}
    </StepCard>
  );
}

function InviteRowItem({
  invite,
  onChanged,
}: {
  invite: InviteRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const name =
    invite.builderName ??
    invite.company ??
    invite.contactName ??
    invite.email ??
    "Builder";
  const detail = invite.builderUserId
    ? "BuilderHQ builder"
    : (invite.email ?? "");
  const joined = invite.status === "joined";

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/invite/b/${invite.inviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the link.");
    }
  }, [invite.inviteToken]);

  const revoke = useCallback(async () => {
    setBusy(true);
    const r = await revokeBuilderInviteAction(invite.id);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error.message ?? "Could not revoke the invitation.");
      return;
    }
    onChanged();
  }, [invite.id, onChanged]);

  return (
    <li className="flex items-center gap-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.02)] px-3.5 py-3">
      <span className="size-8 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] text-text-dim flex items-center justify-center shrink-0">
        <UserRound className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-ui font-medium text-[13px] text-text truncate">
          {name}
        </p>
        {detail ? (
          <p className="text-[11px] text-text-dim truncate">{detail}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "text-[10.5px] font-ui font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-full border shrink-0",
          joined
            ? "border-border-accent text-accent-light bg-[rgba(0,212,200,0.06)]"
            : "border-border-subtle text-text-dim",
        )}
      >
        {joined ? "Joined" : "Invited"}
      </span>
      <button
        type="button"
        onClick={copyLink}
        title="Copy invite link"
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border-subtle text-[11px] text-text-muted hover:border-border-strong transition-colors shrink-0"
      >
        {copied ? (
          <Check className="size-3.5 text-accent-light" />
        ) : (
          <Link2 className="size-3.5" />
        )}
        {copied ? "Copied" : "Link"}
      </button>
      {!joined ? (
        <button
          type="button"
          onClick={revoke}
          disabled={busy}
          title="Revoke invitation"
          className="size-8 rounded-md border border-border-subtle text-text-dim hover:text-danger hover:border-[rgba(255,80,80,0.45)] transition-colors flex items-center justify-center shrink-0"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
        </button>
      ) : null}
    </li>
  );
}

// ── directory picker ─────────────────────────────────────────────────────

function DirectoryPicker({
  projectId,
  invited,
  onInvited,
}: {
  projectId: string;
  invited: InviteRow[];
  onInvited: () => void;
}) {
  const [builders, setBuilders] = useState<DirectoryBuilder[] | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    listApprovedBuildersAction().then((r) => {
      if (r.ok) setBuilders(r.value);
      else setBuilders([]);
    });
  }, []);

  const invitedIds = useMemo(
    () => new Set(invited.map((i) => i.builderUserId).filter(Boolean)),
    [invited],
  );

  const filtered = useMemo(() => {
    if (!builders) return [];
    const q = query.trim().toLowerCase();
    if (!q) return builders;
    return builders.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.suburb ?? "").toLowerCase().includes(q) ||
        (b.state ?? "").toLowerCase().includes(q),
    );
  }, [builders, query]);

  const invite = useCallback(
    async (b: DirectoryBuilder) => {
      setBusyId(b.userId);
      const r = await createBuilderInviteAction(projectId, {
        builderUserId: b.userId,
      });
      setBusyId(null);
      if (!r.ok) {
        toast.error(r.error.message ?? "Could not send the invitation.");
        return;
      }
      if (r.value.deferred) {
        toast.success(
          `${b.name} invited.`,
          "They will be emailed the moment this project goes live.",
        );
      } else if (r.value.emailed) {
        toast.success(
          `${b.name} invited.`,
          "They have been emailed and notified on BuilderHQ.",
        );
      } else {
        toast.message(
          `${b.name} invited, but the email could not be sent.`,
          "Copy their private link from the list and send it directly.",
        );
      }
      onInvited();
    },
    [projectId, onInvited],
  );

  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.02)] p-3.5">
      <div className="relative">
        <Search className="size-3.5 text-text-dim absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search approved builders by name or suburb"
          className="w-full h-10 pl-9 pr-3.5 rounded-md border border-border-subtle bg-surface-1 text-[13px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-border-accent transition-colors"
        />
      </div>

      {builders === null ? (
        <div className="flex items-center gap-2 py-5 justify-center text-text-dim">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-[12px]">Loading the directory</span>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-5 text-center text-[12px] text-text-dim">
          No builders match that search.
        </p>
      ) : (
        <ul className="mt-2.5 max-h-[300px] overflow-y-auto space-y-1.5 pr-0.5">
          {filtered.map((b) => {
            const already = invitedIds.has(b.userId);
            return (
              <li
                key={b.userId}
                className="flex items-center gap-3 rounded-md border border-border-subtle/70 bg-surface-1 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-ui font-medium text-[12.5px] text-text truncate">
                    {b.name}
                  </p>
                  <p className="text-[11px] text-text-dim truncate">
                    {[b.suburb, b.state].filter(Boolean).join(", ") ||
                      "Approved builder"}
                    {b.yearsInOperation
                      ? ` · ${b.yearsInOperation} yrs`
                      : ""}
                  </p>
                </div>
                {already ? (
                  <span className="text-[10.5px] font-ui font-semibold uppercase tracking-[0.08em] text-text-dim px-2 py-1">
                    Invited
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => invite(b)}
                    disabled={busyId === b.userId}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-border-strong text-[11.5px] text-text hover:bg-[rgba(0,212,200,0.05)] hover:border-border-accent transition-colors shrink-0"
                  >
                    {busyId === b.userId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Invite
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── email invite form ────────────────────────────────────────────────────

function EmailInviteForm({
  projectId,
  onInvited,
}: {
  projectId: string;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = useCallback(async () => {
    if (!emailOk) return;
    setBusy(true);
    const r = await createBuilderInviteAction(projectId, {
      email: email.trim(),
      contactName: contactName.trim() || undefined,
      company: company.trim() || undefined,
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error.message ?? "Could not create the invitation.");
      return;
    }
    setEmail("");
    setContactName("");
    setCompany("");
    if (r.value.deferred) {
      toast.success(
        "Invitation saved.",
        "We will email the builder the moment this project goes live. The link is in the list if you want to share it sooner.",
      );
    } else if (r.value.emailed) {
      toast.success(
        "Invitation sent.",
        "We have emailed the builder their private link. You can copy it from the list if you want to follow up directly.",
      );
    } else {
      toast.message(
        "Invitation created, but the email could not be sent.",
        "Copy the builder's private link from the list and send it to them directly.",
      );
    }
    onInvited();
  }, [projectId, email, contactName, company, emailOk, onInvited]);

  const fieldCls =
    "w-full h-10 px-3.5 rounded-md border border-border-subtle bg-surface-1 text-[13px] text-text placeholder:text-text-dim/70 focus:outline-none focus:border-border-accent transition-colors";

  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.02)] p-3.5 space-y-3">
      <p className="text-[11.5px] leading-[1.55] text-text-dim">
        For a builder you already work with who is not on BuilderHQ yet. We
        email them a personal invitation with their private link; it takes
        them straight to this project, at no cost to them.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contact name"
          className={fieldCls}
        />
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className={fieldCls}
        />
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="builder@company.com.au"
        className={fieldCls}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!emailOk || busy}
        className={cn(
          "inline-flex items-center gap-1.5 h-10 px-5 rounded-full font-ui font-semibold text-[12px] tracking-[0.02em] transition-colors",
          emailOk && !busy
            ? "bg-accent text-accent-contrast hover:opacity-90"
            : "bg-surface-2 text-text-dim cursor-not-allowed",
        )}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Create invitation
      </button>
    </div>
  );
}

// ── local card shell (mirrors the wizard's Card) ─────────────────────────

function StepCard({
  icon,
  title,
  sub,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-1 card-elev overflow-hidden shadow-[0_18px_44px_-22px_rgba(15,23,32,0.19)]">
      <header className="px-4 sm:px-6 py-4 border-b border-border-subtle/60 flex items-start gap-3">
        {icon ? (
          <span className="size-8 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] text-accent-light flex items-center justify-center shrink-0">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-ui font-semibold text-[13.5px] text-text">
            {title}
          </h3>
          {sub ? (
            <p className="text-[11.5px] text-text-dim mt-0.5">{sub}</p>
          ) : null}
        </div>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
