/**
 * /invite/p/[token] — participant seat redemption.
 *
 * The single-use, email-bound link a project runner sends when they
 * share a project (flagship case: an architect bringing their client
 * into the tender file). Resolves the token and walks the invitee
 * through whatever stands between them and the project:
 *
 *   no session        → landing card with sign-in / create-account CTAs
 *   builder account   → refused; a builder cannot hold a seat on a
 *                       round they could be competing in
 *   wrong email       → refused; the seat is bound to the invited
 *                       mailbox, not to whoever holds the link
 *   valid             → explicit accept, then the seat flips to
 *                       joined and they land on the project
 *
 * Every dead end gets its own card — a client should never see a bare
 * 404 on a link their architect sent them.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Ban,
  Clock,
  Mail,
  UserRound,
} from "lucide-react";

import { auth } from "@/modules/auth";
import {
  getParticipantInviteByToken,
  claimParticipantInvite,
  dispatchParticipantJoined,
  PARTICIPANT_ROLE_LABEL,
} from "@/modules/projects";
import { logger } from "@/lib/logger";

export const metadata = {
  title: "Project access",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function sharedProjectPath(role: string | null | undefined, slug: string) {
  return role === "architect"
    ? `/architect/projects/${slug}`
    : `/owner/projects/${slug}`;
}

export default async function ParticipantInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accept?: string }>;
}) {
  const { token } = await params;
  const { accept } = await searchParams;

  const r = await getParticipantInviteByToken(token);
  if (!r.ok) {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Project access"
        title="This link is not valid"
        body="Check the link you were sent, or ask the person who shared the project to send a fresh one."
      />
    );
  }
  const { participant, state, project, inviter } = r.value;
  const inviterName =
    inviter.practiceName ?? inviter.name ?? "The project runner";
  const roleLabel = PARTICIPANT_ROLE_LABEL[participant.role];

  if (state === "revoked") {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Project access"
        title="This invitation has been withdrawn"
        body={`${inviterName} has withdrawn this invitation. If you think that is a mistake, get in touch with them directly.`}
      />
    );
  }
  if (state === "expired") {
    return (
      <InviteCard
        icon={<Clock className="size-5" />}
        eyebrow="Project access"
        title="This invitation has expired"
        body={`Invitation links stay live for 14 days. Ask ${inviterName} to send a fresh one — it takes them one click.`}
      />
    );
  }

  const session = await auth();

  // Not signed in — a proper landing, not a blind redirect. Most
  // invitees have no account yet.
  if (!session?.user) {
    const next = encodeURIComponent(`/invite/p/${token}`);
    return (
      <InviteCard
        icon={<Mail className="size-5" />}
        eyebrow="Project access"
        title={project.title}
        body={`${inviterName} has shared this project with you on BuilderHQ, with ${roleLabel.toLowerCase()} access. Sign in, or create an account with the email address this invitation was sent to.`}
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
              href={`/signup?next=${next}`}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text font-ui font-medium text-[13px] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              Create an account
            </Link>
          </>
        }
      />
    );
  }

  const role = session.user.role;
  const sessionEmail = (session.user.email ?? "").toLowerCase();

  // A builder cannot hold a seat — they could be competing in the very
  // round the seat watches.
  if (role === "builder") {
    return (
      <InviteCard
        icon={<UserRound className="size-5" />}
        eyebrow="Project access"
        title="This invitation cannot go to a builder account"
        body="Project sharing is for clients and collaborators, and you are signed in as a builder. If this project was meant to reach you as a tender, ask the runner to send a builder invitation instead."
      />
    );
  }

  // Already redeemed by this account — straight through.
  if (state === "joined") {
    if (participant.userId === session.user.id) {
      redirect(sharedProjectPath(role, project.slug));
    }
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Project access"
        title="This invitation has already been used"
        body={`Each invitation works once, for one account. If you need access, ask ${inviterName} to share the project with your email address.`}
      />
    );
  }

  // Email binding, surfaced BEFORE the accept click so nobody accepts
  // into a dead end.
  if (participant.email.toLowerCase() !== sessionEmail) {
    return (
      <InviteCard
        icon={<Mail className="size-5" />}
        eyebrow="Project access"
        title="This invitation was addressed to a different email"
        body={`The invitation is bound to the address it was sent to, and you are signed in as ${session.user.email ?? "another account"}. Sign in with the invited address, or ask ${inviterName} to share the project with this one.`}
        actions={
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/p/${token}`)}`}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text font-ui font-medium text-[13px] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            Switch account
            <ArrowUpRight className="size-4" />
          </Link>
        }
      />
    );
  }

  // Explicit accept — a mail scanner or a stray preview click must not
  // consume the single-use token.
  if (accept !== "1") {
    const body =
      participant.role === "decider"
        ? `${inviterName} has shared this project with you. Your access includes the decision: you can review every tender alongside the evaluation and take part in shortlisting and awarding.`
        : `${inviterName} has shared this project with you. You can follow the round as it unfolds: the project file, the tenders as they arrive, and the full evaluation.`;
    return (
      <InviteCard
        icon={<Mail className="size-5" />}
        eyebrow="Project access"
        title={project.title}
        body={body}
        actions={
          <Link
            href={`/invite/p/${token}?accept=1`}
            className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-accent text-navy font-ui font-semibold text-[13px] hover:opacity-90 transition-opacity"
          >
            Open the project
            <ArrowUpRight className="size-4" />
          </Link>
        }
      />
    );
  }

  const claim = await claimParticipantInvite(token, {
    userId: session.user.id!,
    userEmail: session.user.email ?? "",
  });
  if (!claim.ok) {
    return (
      <InviteCard
        icon={<Ban className="size-5" />}
        eyebrow="Project access"
        title="This invitation could not be accepted"
        body={claim.error.message}
      />
    );
  }

  logger.info(
    {
      event: "participant_invite.redeemed",
      participantId: participant.id,
      projectId: project.id,
      userId: session.user.id,
    },
    "participant invite redeemed",
  );
  await dispatchParticipantJoined(participant.id);

  redirect(sharedProjectPath(role, claim.value.projectSlug));
}

// ── card shell (mirrors /invite/b styling) ───────────────────────────────

function InviteCard({
  icon,
  eyebrow,
  title,
  body,
  actions,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
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
