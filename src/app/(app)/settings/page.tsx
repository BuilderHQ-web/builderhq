import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Hammer,
  Lock,
  Sliders,
  User,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { getOwnerProfile } from "@/modules/profiles";
import { PageHeader } from "@/components/app/page-header";
import { Reveal } from "@/components/app/reveal";
import { cn } from "@/lib/utils";

import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { OwnerSettingsForm } from "./owner-form";
import { PreferencesForm } from "./preferences-form";
import { DeleteAccountForm } from "./delete-account-form";
import { getMarketingEmailsEnabled } from "./actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings");
  const userId = session.user.id;
  const role = session.user.role;

  const [user] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) redirect("/login");

  // Owner profile (entity type, contact pref, defaults) — only for owners.
  const ownerProfile = role === "project_owner" ? await getOwnerProfile(userId) : null;

  // Marketing-class email toggle state — same flag the unsubscribe
  // route flips. Loaded server-side so the toggle hydrates with the
  // right value on first render (no flash of wrong state).
  const marketingEmailsEnabled = await getMarketingEmailsEnabled();

  // Quick-jump nav entries — built role-aware so builders / owners see
  // only the sections that apply. The same hash anchors hang off each
  // <SettingsSection> so the sticky list stays in sync.
  const navItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "identity", label: "Identity", icon: <User className="size-3" /> },
  ];
  if (role === "project_owner") {
    navItems.push({
      id: "owner-prefs",
      label: "Your projects",
      icon: <Briefcase className="size-3" />,
    });
  }
  if (role === "builder") {
    navItems.push({
      id: "public-profile",
      label: "Public profile",
      icon: <Hammer className="size-3" />,
    });
  }
  navItems.push(
    { id: "password", label: "Password", icon: <Lock className="size-3" /> },
    {
      id: "preferences",
      label: "Preferences",
      icon: <Sliders className="size-3" />,
    },
  );
  if (role !== "admin") {
    navItems.push({
      id: "danger",
      label: "Danger zone",
      icon: <AlertTriangle className="size-3" />,
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description={
          role === "builder"
            ? "Identity, password, and per-device preferences. Your public builder profile, including company, licences and service areas, lives in its own editor."
            : role === "project_owner"
              ? "Identity, password, project defaults, and per-device preferences."
              : "Your identity, security, and preferences across BuilderHQ."
        }
      />

      <div className="px-4 sm:px-6 lg:px-10 py-8 lg:py-10 mx-auto max-w-[1080px] grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-8 lg:gap-10">
        {/* Sticky quick-jump nav — collapses to a horizontal scroller
              on mobile via flex-wrap. Keeps long settings lists scannable. */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 flex flex-col gap-1 text-[12.5px]">
            <span className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-medium mb-2 px-3">
              Sections
            </span>
            {navItems.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 rounded-sm",
                  "text-text-muted hover:text-text hover:bg-[rgba(24,34,44,0.045)]",
                  "transition-colors duration-[140ms]",
                )}
              >
                <span className="text-text-faint group-hover:text-accent-light transition-colors">
                  {n.icon}
                </span>
                {n.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex flex-col gap-5 min-w-0">
          {/* Account — name, phone, email */}
          <Reveal immediate delay={0.04}>
            <SettingsSection
              id="identity"
              kicker="Profile"
              icon={<User className="size-3.5" />}
              title="Identity"
              description="Your name, contact phone, and email across BuilderHQ. Email changes need re-verification. Contact support to swap addresses."
            >
              <ProfileForm
                defaultFirstName={user.firstName ?? ""}
                defaultLastName={user.lastName ?? ""}
                defaultPhone={user.phone ?? ""}
                email={user.email}
              />
            </SettingsSection>
          </Reveal>

          {/* Owner-only — entity type + defaults + contact preference */}
          {role === "project_owner" ? (
            <Reveal immediate delay={0.10}>
              <SettingsSection
                id="owner-prefs"
                kicker="Project preferences"
                icon={<Briefcase className="size-3.5" />}
                title="Your projects"
                description="How builders see you when they unlock a project, plus saved defaults for new project uploads."
              >
                <OwnerSettingsForm
                  defaults={{
                    entityType: ownerProfile?.entityType ?? null,
                    companyName: ownerProfile?.companyName ?? null,
                    defaultSuburb: ownerProfile?.defaultSuburb ?? null,
                    defaultState: ownerProfile?.defaultState ?? null,
                    defaultPostcode: ownerProfile?.defaultPostcode ?? null,
                    contactPref: ownerProfile?.contactPref ?? "email",
                  }}
                />
              </SettingsSection>
            </Reveal>
          ) : null}

          {/* Builder-only — pointer to public profile editor */}
          {role === "builder" ? (
            <Reveal immediate delay={0.10}>
              <SettingsSection
                id="public-profile"
                kicker="Public profile"
                icon={<Hammer className="size-3.5" />}
                title="What owners see"
                description="Your company identity, licences, service areas, and the rest of the public-facing profile live in their own editor."
              >
                <Link
                  href="/builder/profile"
                  className={cn(
                    "group inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-full",
                    "border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light",
                    "text-[12.5px] font-semibold tracking-[0.04em]",
                    "hover:bg-[rgba(0,212,200,0.10)] transition-colors duration-[140ms]",
                    "active:scale-[0.985] active:duration-[80ms]",
                    "max-sm:w-full",
                  )}
                >
                  Open public profile
                  <ArrowUpRight className="size-3.5 transition-transform duration-[140ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </SettingsSection>
            </Reveal>
          ) : null}

          {/* Security — password */}
          <Reveal immediate delay={0.16}>
            <SettingsSection
              id="password"
              kicker="Security"
              icon={<Lock className="size-3.5" />}
              title="Password"
              description={
                user.passwordHash
                  ? "Choose a strong password of at least 10 characters. You will be signed out of this device after changing."
                  : "You signed in with a magic link. Optionally add a password for faster sign-in next time. Minimum 10 characters."
              }
            >
              <PasswordForm hasPassword={Boolean(user.passwordHash)} />
            </SettingsSection>
          </Reveal>

          {/* Preferences — real toggles instead of placeholder bullets */}
          <Reveal immediate delay={0.20}>
            <SettingsSection
              id="preferences"
              kicker="Preferences"
              icon={<Sliders className="size-3.5" />}
              title="App behaviour"
              description="Per-device settings that follow you on this browser."
            >
              <PreferencesForm
                initialMarketingEmailsEnabled={marketingEmailsEnabled}
                // Marketing-class email is the bulk new-project blast,
                // which only goes to builders. Hide the toggle for
                // project owners — they'd never get the email anyway.
                showMarketingToggle={role !== "project_owner"}
              />
            </SettingsSection>
          </Reveal>

          {/* Danger zone — only for non-admins. Admin self-deletion is
              blocked at the service layer too; we hide the UI here so
              admins aren't tempted to try. */}
          {role !== "admin" ? (
            <Reveal immediate delay={0.24}>
              <SettingsSection
                id="danger"
                tone="danger"
                kicker="Danger zone"
                icon={<AlertTriangle className="size-3.5" />}
                title="Permanent actions"
                description="Delete your account. Your personal details are removed; projects and tenders you transacted on stay visible to the other party under a 'Deleted user' label."
              >
                <DeleteAccountForm />
              </SettingsSection>
            </Reveal>
          ) : null}
        </div>
      </div>
    </>
  );
}

type SectionTone = "default" | "danger";

function SettingsSection({
  id,
  kicker,
  icon,
  title,
  description,
  children,
  tone = "default",
}: {
  /** Anchor id used by the sidebar quick-jump nav. */
  id?: string;
  kicker: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: SectionTone;
}) {
  return (
    <section
      id={id}
      // scroll-mt accounts for the sticky app header so the section
      // header isn't hidden when the user clicks a quick-jump link.
      className={cn(
        "scroll-mt-24 rounded-md border overflow-hidden",
        "bg-surface-2",
        tone === "danger" ? "border-danger/25" : "border-border-subtle",
      )}
    >
      <header className="px-5 sm:px-7 py-5 flex flex-col gap-2 border-b border-border-subtle/60">
        <span
          className={cn(
            "inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-ui font-medium",
            tone === "danger" ? "text-warning" : "text-accent",
          )}
        >
          {icon}
          {kicker}
        </span>
        <h2 className="font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
          {title}
        </h2>
        <p className="text-[12.5px] leading-[1.6] text-text-dim max-w-prose">
          {description}
        </p>
      </header>
      <div className="px-5 sm:px-7 py-6">{children}</div>
    </section>
  );
}
