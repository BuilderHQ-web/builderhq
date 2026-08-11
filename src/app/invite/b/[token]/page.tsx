/**
 * /invite/b/[token] — builder invitation redemption.
 *
 * The single-use link a project runner sends to a hand-picked builder
 * for a tender round. Resolves the token, walks the
 * builder through whatever stands between them and the project:
 *
 *   no session      → landing card with sign-in / create-account CTAs
 *                     (off-platform invitees have no account yet)
 *   wrong role      → explain the invite needs a builder account
 *   valid builder   → grant a free unlock (source "invited", still
 *                     occupies a tender spot), mark the invite joined,
 *                     land them on the project
 *
 * Every dead end gets its own card — an invited builder should never
 * see a bare 404.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Ban,
  Building2,
  Clock,
  Mail,
  UserRound,
} from "lucide-react";

import { auth } from "@/modules/auth";
import {
  getBuilderInviteByToken,
  markBuilderInviteJoined,
} from "@/modules/tenders";
import { unlockProject } from "@/modules/unlocks";
import { logger } from "@/lib/logger";

export const metadata = {
  title: "Tender invitation",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BuilderInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accept?: string }>;
}) {
  const { token } = await params;
  const { accept } = await searchParams;

  const r = await getBuilderInviteByToken(token);
  if (!r.ok) {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Invitation"
        title="This link is not valid"
        body="Check the link you were sent, or ask the person who invited you to send a fresh one."
      />
    );
  }
  const { invite, project, inviterName } = r.value;

  const TYPE_LABEL: Record<string, string> = {
    single_dwelling: "Single dwelling",
    multi_dwelling: "Multi dwelling",
    renovation: "Renovation",
    extension: "Extension",
  };
  const BUDGET_LABEL: Record<string, string> = {
    under_500k: "Under $500k",
    "500k_1m": "$500k to $1m",
    "1m_1_5m": "$1m to $1.5m",
    "1_5m_2m": "$1.5m to $2m",
    "2m_3m": "$2m to $3m",
    "3m_5m": "$3m to $5m",
    over_5m: "Over $5m",
  };
  // Preview-tier facts — what an open marketplace card would show.
  const facts = [
    TYPE_LABEL[project.type] ?? null,
    project.suburb
      ? `${project.suburb}${project.state ? `, ${project.state}` : ""}`
      : (project.state ?? null),
    project.budgetBand ? (BUDGET_LABEL[project.budgetBand] ?? null) : null,
    inviterName ? `Invited by ${inviterName}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  if (invite.status === "revoked" || invite.status === "declined") {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Invitation"
        title="This invitation has been withdrawn"
        body="The project runner has withdrawn this invitation. If you think that is a mistake, get in touch with them directly."
      />
    );
  }

  const session = await auth();

  // Not signed in — land them on a proper invitation page instead of a
  // blind redirect. Off-platform invitees have no account yet.
  if (!session?.user) {
    const next = encodeURIComponent(`/invite/b/${token}`);
    return (
      <InviteCard
        icon={<Mail className="size-5" />}
        eyebrow="Tender invitation"
        title={project.title}
        meta={facts}
        body={
          invite.contactName
            ? `${invite.contactName}, you have been invited to price this project on BuilderHQ. Invited builders take part at no cost. Sign in, or create a builder account with this email to get started.`
            : "You have been invited to price this project on BuilderHQ. Invited builders take part at no cost. Sign in, or create a builder account to get started."
        }
        actions={
          <>
            <Link
              href={`/login?next=${next}`}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-accent text-navy font-ui font-semibold text-[13px] hover:opacity-90 transition-opacity"
            >
              Sign in
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href={`/signup?role=builder&next=${next}`}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text font-ui font-medium text-[13px] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              Create a builder account
            </Link>
          </>
        }
      />
    );
  }

  const userId = session.user.id!;
  const role = session.user.role;

  if (role !== "builder") {
    return (
      <InviteCard
        icon={<UserRound className="size-5" />}
        eyebrow="Tender invitation"
        title="This invitation needs a builder account"
        body="You are signed in with an account that cannot submit tenders. Sign out, then open the link again and create a builder account, or sign in with your builder account."
        actions={
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/b/${token}`)}`}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text font-ui font-medium text-[13px] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            Switch account
            <ArrowUpRight className="size-4" />
          </Link>
        }
      />
    );
  }

  // On-platform invites are addressed to one specific builder.
  if (invite.builderUserId && invite.builderUserId !== userId) {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Tender invitation"
        title="This invitation was issued to another builder"
        body="Each invitation is personal to one builder account. Ask the project runner to invite you directly."
      />
    );
  }

  // Already redeemed by this builder — straight through.
  if (invite.status === "joined" && invite.builderUserId === userId) {
    redirect(`/builder/projects/${project.slug}`);
  }

  if (project.status === "draft") {
    return (
      <InviteCard
        icon={<Clock className="size-5" />}
        eyebrow="Tender invitation"
        title={project.title}
        body="This project has not opened for tenders yet. Keep hold of this link. It will take you straight in the moment the round opens."
      />
    );
  }
  if (project.status !== "published" && project.status !== "tendering") {
    return (
      <InviteCard
        icon={<Building2 className="size-5" />}
        eyebrow="Tender invitation"
        title="This tender round has closed"
        body="This project is no longer accepting tenders. If you were expecting to take part, get in touch with the project runner."
      />
    );
  }

  // Accepting occupies one of the round's tender spots, so it is an
  // explicit step — a stray click from a dashboard row or an email
  // preview must not consume a spot silently.
  if (accept !== "1") {
    return (
      <InviteCard
        icon={<Mail className="size-5" />}
        eyebrow="Tender invitation"
        title={project.title}
        meta={facts}
        body="You have been invited to price this project. Accepting takes one of the round's tender spots and opens the full project to you, at no cost. The drawings, specifications and requirements are ready once you are in."
        actions={
          <Link
            href={`/invite/b/${token}?accept=1`}
            className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-accent text-navy font-ui font-semibold text-[13px] hover:opacity-90 transition-opacity"
          >
            Accept the invitation
            <ArrowUpRight className="size-4" />
          </Link>
        }
      />
    );
  }

  // Grant the free unlock — still occupies a tender spot, so the cap
  // transaction can reject a full round.
  const unlock = await unlockProject(userId, project.id, {
    source: "invited",
  });
  if (!unlock.ok) {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Tender invitation"
        title="This round is already full"
        body={unlock.error.message ?? "All tender spots on this project have been taken. The project runner can see this and may adjust the round."}
      />
    );
  }

  await markBuilderInviteJoined(invite.id, userId);
  logger.info(
    {
      event: "tender_invite.redeemed",
      inviteId: invite.id,
      projectId: project.id,
      builderId: userId,
    },
    "builder invite redeemed",
  );

  redirect(`/builder/projects/${project.slug}`);
}

// ── card shell (mirrors /unsubscribe styling) ────────────────────────────

function InviteCard({
  icon,
  eyebrow,
  title,
  meta,
  body,
  actions,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  /** Quiet facts line under the title (type, locality, budget). */
  meta?: string;
  body: string;
  actions?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      <section className="w-full max-w-[520px] rounded-lg border border-border-subtle bg-surface-1 card-elev shadow-[0_18px_44px_-22px_rgba(0,166,155,0.25)] overflow-hidden">
        <div className="px-5 sm:px-7 py-7 sm:py-8">
          <span className="size-11 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent-light flex items-center justify-center mb-5">
            {icon}
          </span>

          <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
            {eyebrow}
          </span>

          <h1 className="mt-1 font-display uppercase tracking-[-0.012em] text-[28px] leading-[1.05] text-text">
            {title}
          </h1>

          {meta ? (
            <p className="mt-2.5 text-[11px] tracking-[0.06em] uppercase text-text-dim font-ui font-medium">
              {meta}
            </p>
          ) : null}

          <p className="mt-3 text-[13.5px] leading-[1.65] text-text-muted">
            {body}
          </p>

          {actions ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {actions}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
