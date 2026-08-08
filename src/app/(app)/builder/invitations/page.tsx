/**
 * /builder/invitations — the invitation register.
 *
 * Two ruled sections. Pending: every invitation awaiting an answer,
 * whether it was issued to this account or to the builder's email
 * before they had one; rows link to the invitation's own accept
 * ceremony (/invite/b/[token]), the same explicit act as accepting
 * from the email. Accepted: every invitation the builder has taken
 * up, kept on the record here and linking straight to the project.
 * The same projects also sit under Unlocked wearing the Invited mark;
 * this page is where their provenance is never in doubt.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Mail, MailCheck, MailOpen } from "lucide-react";

import { auth } from "@/modules/auth";
import {
  listInvitesForBuilder,
  listAcceptedInvitesForBuilder,
} from "@/modules/tenders";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";

export const metadata = { title: "Invitations" };
export const dynamic = "force-dynamic";

const shortDate = (d: Date) =>
  d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Melbourne",
  });

export default async function BuilderInvitationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/invitations");
  const userId = session.user.id!;

  const [pending, accepted] = await Promise.all([
    listInvitesForBuilder(userId, { email: session.user.email }),
    listAcceptedInvitesForBuilder(userId),
  ]);

  const introLine =
    pending.length > 0
      ? `${pending.length} pending invitation${pending.length === 1 ? "" : "s"}. Invited builders take part at no cost, and accepting takes one of the round's spots.`
      : accepted.length > 0
        ? "Nothing pending. Every invitation you have accepted stays on the record below."
        : "Nothing pending. When a project runner hand-picks you for a round, the invitation lands here as well as in your inbox.";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-6 sm:mb-7">
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
            <Mail className="size-3.5" />
            Invitations
          </span>
          <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[44px] leading-[0.95] text-text">
            Invitations to tender
          </h1>
          <p className="mt-2 text-[13px] text-text-muted max-w-[58ch]">
            {introLine}
          </p>
        </div>

        {pending.length === 0 && accepted.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<MailOpen className="size-5" />}
              title="No invitations yet"
              description="When a project runner hand-picks you for a round, it appears here and stays on the record once you accept."
              primary={{ label: "Browse open rounds", href: "/builder/browse" }}
            />
          </div>
        ) : (
          <div className="space-y-9">
            {pending.length > 0 ? (
              <RegisterSection title="Pending" sub="Awaiting your answer">
                {pending.map((inv, i) => (
                  <Reveal
                    key={inv.inviteId}
                    immediate
                    delay={Math.min(i * 0.05, 0.2)}
                  >
                    <Link
                      href={`/invite/b/${inv.inviteToken}`}
                      className="group flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 card-elev px-4 sm:px-5 py-4 hover:border-border-strong transition-colors"
                    >
                      <span className="size-10 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.08)] text-accent-light flex items-center justify-center shrink-0">
                        <Mail className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-ui font-semibold text-[14.5px] text-text truncate">
                          {inv.projectTitle}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-text-muted truncate">
                          Invited by {inv.inviterName}
                          {inv.projectSuburb
                            ? ` · ${inv.projectSuburb}${inv.projectState ? `, ${inv.projectState}` : ""}`
                            : ""}
                          {" · "}
                          {shortDate(inv.invitedAt)}
                        </span>
                      </span>
                      <span className="shrink-0 hidden sm:inline-flex items-center gap-1.5 text-[12px] font-ui font-semibold text-accent-light group-hover:text-accent-deep transition-colors">
                        View the invitation
                        <ArrowUpRight className="size-3.5" />
                      </span>
                      <ArrowUpRight className="sm:hidden size-4 shrink-0 text-accent-light" />
                    </Link>
                  </Reveal>
                ))}
              </RegisterSection>
            ) : null}

            {accepted.length > 0 ? (
              <RegisterSection
                title="Accepted"
                sub="On your book, under Unlocked"
              >
                {accepted.map((inv, i) => (
                  <Reveal
                    key={inv.projectId}
                    immediate
                    delay={Math.min(i * 0.05, 0.2)}
                  >
                    <Link
                      href={`/builder/projects/${inv.projectSlug}`}
                      className="group flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 card-elev px-4 sm:px-5 py-4 hover:border-border-strong transition-colors"
                    >
                      <span className="size-10 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] text-text-muted flex items-center justify-center shrink-0">
                        <MailCheck className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-ui font-semibold text-[14.5px] text-text truncate">
                          {inv.projectTitle}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-text-muted truncate">
                          Invited by {inv.inviterName}
                          {inv.projectSuburb
                            ? ` · ${inv.projectSuburb}${inv.projectState ? `, ${inv.projectState}` : ""}`
                            : ""}
                          {" · accepted "}
                          {shortDate(inv.acceptedAt)}
                        </span>
                      </span>
                      <span className="shrink-0 hidden sm:inline-flex items-center gap-1.5 text-[12px] font-ui font-semibold text-text-muted group-hover:text-text transition-colors">
                        Open the project
                        <ArrowUpRight className="size-3.5" />
                      </span>
                      <ArrowUpRight className="sm:hidden size-4 shrink-0 text-text-dim" />
                    </Link>
                  </Reveal>
                ))}
              </RegisterSection>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Ruled section header — the register's own convention. */
function RegisterSection({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3 flex items-center gap-3.5">
        <h2 className="font-display uppercase tracking-[-0.012em] text-[17px] leading-none text-text shrink-0">
          {title}
        </h2>
        <span className="text-[11.5px] text-text-dim shrink-0">{sub}</span>
        <span aria-hidden className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
