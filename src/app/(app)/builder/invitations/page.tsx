/**
 * /builder/invitations — the invitation register.
 *
 * Every pending invitation addressed to this builder, whether it was
 * issued to their account or to their email before they had one. The
 * nav tab that leads here is earned: it appears once a builder has
 * ever been invited and then stays. Rows link to the invitation's own
 * accept ceremony (/invite/b/[token]) — accepting from here is the
 * same explicit act as accepting from the email.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Mail, MailOpen } from "lucide-react";

import { auth } from "@/modules/auth";
import { listInvitesForBuilder } from "@/modules/tenders";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";

export const metadata = { title: "Invitations" };
export const dynamic = "force-dynamic";

export default async function BuilderInvitationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/builder/invitations");

  const invites = await listInvitesForBuilder(session.user.id!, {
    email: session.user.email,
  });

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
            {invites.length === 0
              ? "Nothing pending. When a project runner hand-picks you for a round, the invitation lands here as well as in your inbox."
              : `${invites.length} pending invitation${invites.length === 1 ? "" : "s"}. Invited builders take part at no cost, and accepting takes one of the round's spots.`}
          </p>
        </div>

        {invites.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<MailOpen className="size-5" />}
              title="No pending invitations"
              description="Invitations you have already accepted live with their projects under Unlocked."
              primary={{ label: "Browse open rounds", href: "/builder/browse" }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invites.map((inv, i) => (
              <Reveal key={inv.inviteId} immediate delay={Math.min(i * 0.05, 0.2)}>
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
                      {inv.invitedAt.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-ui font-semibold text-accent-light group-hover:text-accent-deep transition-colors">
                    View the invitation
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
