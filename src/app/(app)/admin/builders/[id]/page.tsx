/**
 * Admin · builder detail.
 *
 * Single-builder review surface. Layout:
 *
 *   header               — name, email, status pills, "back to list"
 *   action card          — sticky-feeling primary CTA stack (approve /
 *                           reject / suspend) with reason capture
 *   identity grid        — ABN / ACN / state / website etc.
 *   verification panel   — ABN + licences with verification status
 *   action history       — every prior admin action on this builder
 *
 * The page hydrates two server calls:
 *   getBuilderForAdmin(id)   → user + profile + licences + history
 *
 * No client-side data fetching — every interaction round-trips through
 * the admin server actions which revalidate this path.
 */

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Link2,
  MapPin,
  Hash,
  Calendar,
  ShieldCheck,
  Hammer,
  History,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { getBuilderForAdmin } from "@/modules/admin";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import {
  ApprovalStatusBadge,
  UserStatusBadge,
  RoleBadge,
  ActionKindBadge,
} from "@/components/admin/badges";
import { BuilderDetailActions } from "@/components/admin/builder-actions";
import { UserAccountActions } from "@/components/admin/user-actions";

export const metadata = {
  title: "Admin · builder",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminBuilderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/owner");
  const { id } = await props.params;

  const data = await getBuilderForAdmin(id);
  if (!data) notFound();

  const { user, profile, licences, abnVerified, anyLicenceVerified, history } =
    data;
  const headline = profile?.companyName ?? user.name ?? user.email;

  return (
    <>
      <PageHeader
        eyebrow="Admin · builder detail"
        title={headline}
        description={user.email}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {profile ? (
              <ApprovalStatusBadge status={profile.approvalStatus} />
            ) : (
              <Badge variant="outline">No profile</Badge>
            )}
            <UserStatusBadge status={user.status} />
            <RoleBadge role={user.role} />
          </div>
        }
      />

      <div className="px-6 lg:px-10 pt-5">
        <Link
          href="/admin/builders"
          className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to builders
        </Link>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* ── LEFT column ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* identity card */}
          <section className="rounded-md border border-border-subtle bg-surface-1/40 p-6">
            <h2 className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
              Identity
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
              <Detail
                icon={<Hammer className="size-3.5" />}
                label="Legal entity"
                value={profile?.companyName ?? "—"}
              />
              <Detail
                icon={<Hammer className="size-3.5" />}
                label="Trading name"
                value={profile?.tradingName ?? "—"}
              />
              <Detail
                icon={<Hash className="size-3.5" />}
                label="ABN"
                value={profile?.abn ?? "—"}
              />
              <Detail
                icon={<Hash className="size-3.5" />}
                label="ACN"
                value={profile?.acn ?? "—"}
              />
              <Detail
                icon={<MapPin className="size-3.5" />}
                label="Business state"
                value={profile?.businessState ?? "—"}
              />
              <Detail
                icon={<MapPin className="size-3.5" />}
                label="Postcode"
                value={profile?.businessPostcode ?? "—"}
              />
              <Detail
                icon={<Calendar className="size-3.5" />}
                label="Years operating"
                value={
                  profile?.yearsInOperation != null
                    ? String(profile.yearsInOperation)
                    : "—"
                }
              />
              <Detail
                icon={<Calendar className="size-3.5" />}
                label="Joined"
                value={user.createdAt.toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            </div>

            {(profile?.website ||
              profile?.linkedinUrl ||
              profile?.instagramUrl) && (
              <div className="mt-5 pt-4 border-t border-border-subtle flex flex-wrap items-center gap-3 text-[12px]">
                {profile.website ? (
                  <ExternalLinkChip
                    href={profile.website}
                    icon={<Globe className="size-3.5" />}
                    label="Website"
                  />
                ) : null}
                {profile.linkedinUrl ? (
                  <ExternalLinkChip
                    href={profile.linkedinUrl}
                    icon={<Link2 className="size-3.5" />}
                    label="LinkedIn"
                  />
                ) : null}
                {profile.instagramUrl ? (
                  <ExternalLinkChip
                    href={profile.instagramUrl}
                    icon={<Link2 className="size-3.5" />}
                    label="Instagram"
                  />
                ) : null}
              </div>
            )}

            {profile?.bio ? (
              <div className="mt-5 pt-4 border-t border-border-subtle">
                <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
                  Bio
                </div>
                <p className="mt-2 text-[13px] text-text-muted whitespace-pre-line">
                  {profile.bio}
                </p>
              </div>
            ) : null}
          </section>

          {/* verification card */}
          <section className="rounded-md border border-border-subtle bg-surface-1/40 p-6">
            <header className="flex items-start justify-between gap-3">
              <h2 className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
                Verification
              </h2>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={abnVerified ? "success" : "outline"}
                  className="!normal-case tracking-normal"
                >
                  ABN {abnVerified ? "verified" : "unverified"}
                </Badge>
                <Badge
                  variant={anyLicenceVerified ? "success" : "outline"}
                  className="!normal-case tracking-normal"
                >
                  Licence {anyLicenceVerified ? "verified" : "unverified"}
                </Badge>
              </div>
            </header>

            {licences.length === 0 ? (
              <p className="mt-5 text-[13px] text-text-dim">
                No licences submitted yet.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-2">
                {licences.map((l) => {
                  const verified = l.verificationStatus === "verified";
                  return (
                    <li
                      key={l.id}
                      className="rounded-md border border-border-subtle bg-bg-deep/50 px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_auto] gap-3 items-start"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-ui text-[13px] text-text truncate">
                          {l.licenceType}
                        </span>
                        <span className="text-[11.5px] text-text-dim truncate">
                          #{l.licenceNumber} · {l.state}
                          {l.licenceHolderName ? ` · ${l.licenceHolderName}` : ""}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-text-dim">
                        {l.expiresAt
                          ? `Expires ${l.expiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
                          : "No expiry"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            verified
                              ? "success"
                              : l.verificationStatus === "rejected"
                                ? "danger"
                                : l.verificationStatus === "expired"
                                  ? "warning"
                                  : "outline"
                          }
                        >
                          {l.verificationStatus}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* history card */}
          <section className="rounded-md border border-border-subtle bg-surface-1/40 overflow-hidden">
            <header className="px-6 py-4 flex items-center justify-between gap-3 border-b border-border-subtle">
              <h2 className="font-ui font-semibold text-[13px] text-text inline-flex items-center gap-2">
                <History className="size-3.5 text-text-faint" />
                Audit history
              </h2>
              <span className="text-[11px] text-text-dim">
                {history.length} action{history.length === 1 ? "" : "s"}
              </span>
            </header>
            {history.length === 0 ? (
              <EmptyState
                title="No admin actions yet"
                description="Approvals, suspensions and reinstatements show up here for this builder."
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="px-6 py-3 grid grid-cols-[auto_1fr_auto] gap-3 items-start"
                  >
                    <ActionKindBadge kind={h.kind} />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {h.reason ? (
                        <p className="text-[12.5px] text-text-muted">
                          “{h.reason}”
                        </p>
                      ) : null}
                      <p className="text-[11px] text-text-dim">
                        Actor {h.actorId?.slice(0, 8) ?? "system"}…
                      </p>
                    </div>
                    <span className="text-[11px] text-text-dim tabular-nums">
                      {h.createdAt.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── RIGHT column ────────────────────────────────────────── */}
        <aside className="flex flex-col gap-6 min-w-0">
          {/* approval actions */}
          <section className="rounded-md border border-border-subtle bg-surface-1/40 p-6">
            <header className="flex flex-col gap-1">
              <h2 className="font-ui font-semibold text-[14px] text-text inline-flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-text-faint" />
                Approval
              </h2>
              <p className="text-[12px] text-text-dim">
                Approving unlocks the platform for this builder. Rejecting
                surfaces your reason to them; suspending hides their public
                presence and blocks new tenders.
              </p>
            </header>
            {profile ? (
              <div className="mt-4">
                <BuilderDetailActions
                  builderId={user.id}
                  status={profile.approvalStatus}
                />
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] text-text-dim">
                This account doesn&apos;t have a builder profile yet.
              </p>
            )}

            {profile?.rejectionReason ? (
              <div className="mt-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-[12.5px] text-text-muted">
                <div className="text-[10px] uppercase tracking-[0.18em] text-danger font-ui mb-1">
                  Rejection reason on file
                </div>
                {profile.rejectionReason}
              </div>
            ) : null}

            {profile?.approvedAt ? (
              <div className="mt-4 text-[11.5px] text-text-dim flex flex-col gap-0.5">
                <span>
                  Approved{" "}
                  {profile.approvedAt.toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {profile.approvedVia ? (
                  <span>via {profile.approvedVia}</span>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* account-status actions */}
          <section className="rounded-md border border-border-subtle bg-surface-1/40 p-6">
            <header className="flex flex-col gap-1">
              <h2 className="font-ui font-semibold text-[14px] text-text inline-flex items-center gap-2">
                <AlertOctagon className="size-3.5 text-text-faint" />
                Account status
              </h2>
              <p className="text-[12px] text-text-dim">
                Distinct from approval — this controls whether the user can
                sign in at all. Reserve banning for serious abuse.
              </p>
            </header>
            <div className="mt-4">
              <UserAccountActions
                userId={user.id}
                status={user.status}
                role={user.role}
              />
            </div>
            {user.lastSeenAt ? (
              <div className="mt-4 text-[11.5px] text-text-dim">
                Last seen{" "}
                {user.lastSeenAt.toLocaleString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            ) : null}
          </section>

        </aside>
      </div>
    </>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-medium">
        <span className="text-text-faint">{icon}</span>
        {label}
      </span>
      <span className="text-text truncate">{value}</span>
    </div>
  );
}

function ExternalLinkChip({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-3 h-7 text-[12px] text-text-muted hover:text-text hover:border-border transition-colors"
    >
      <span className="text-text-faint">{icon}</span>
      {label}
      <ExternalLink className="size-3 text-text-faint" />
    </a>
  );
}
