import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Hammer,
  Lock,
  Settings as SettingsIcon,
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
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) redirect("/login");

  // Owner profile (entity type, contact pref, defaults) — only for owners.
  const ownerProfile = role === "project_owner" ? await getOwnerProfile(userId) : null;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Update your profile, security, and preferences across BuilderHQ."
      />

      <div className="px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-6 max-w-3xl">
        {/* Account — name, phone, email */}
        <Reveal immediate delay={0.04}>
          <SettingsSection
            kicker="Profile"
            icon={<User className="size-3.5" />}
            title="Identity"
            description="Your name, contact phone, and email across BuilderHQ. Email change comes with re-verification — coming soon."
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
              kicker="Project preferences"
              icon={<Briefcase className="size-3.5" />}
              title="You & your projects"
              description="How builders see you when they unlock a project, plus saved defaults so new project uploads don't start from a blank state."
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
              kicker="Public profile"
              icon={<Hammer className="size-3.5" />}
              title="What owners see"
              description="Your company identity, licences, service areas, and the rest of the public-facing profile lives in its own editor — built for the depth that page deserves."
            >
              <Link
                href="/builder/profile"
                className={cn(
                  "group inline-flex items-center gap-2 h-10 px-4 rounded-full",
                  "border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light",
                  "text-[12.5px] font-semibold tracking-[0.04em]",
                  "hover:bg-[rgba(0,212,200,0.10)] transition-colors duration-[140ms]",
                  "active:scale-[0.985] active:duration-[80ms]",
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
            kicker="Security"
            icon={<Lock className="size-3.5" />}
            title="Password"
            description="Choose a strong password — minimum 10 characters. You'll be signed out of this device after changing."
          >
            <PasswordForm />
          </SettingsSection>
        </Reveal>

        {/* Preferences */}
        <Reveal immediate delay={0.20}>
          <SettingsSection
            kicker="Preferences"
            icon={<SettingsIcon className="size-3.5" />}
            title="App behaviour"
            description="Browser-side settings that live in this device. Sound on send for chat lives in the messaging thread header — toggle once and it sticks."
          >
            <ul className="text-[12.5px] text-text-muted space-y-2 leading-[1.65]">
              <li className="flex items-start gap-2">
                <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)] mt-2 shrink-0" />
                Reduced motion follows your operating system preference automatically.
              </li>
              <li className="flex items-start gap-2">
                <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)] mt-2 shrink-0" />
                Email notifications and digest frequency arrive with the
                outbound email pass.
              </li>
            </ul>
          </SettingsSection>
        </Reveal>

        {/* Danger zone */}
        <Reveal immediate delay={0.24}>
          <SettingsSection
            tone="danger"
            kicker="Danger zone"
            icon={<AlertTriangle className="size-3.5" />}
            title="Permanent actions"
            description="Account deletion ships in Phase 2 alongside the data-export tool."
          >
            <div className="text-[13px] text-text-dim flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(255,181,71,0.5)]" />
              Account deletion is intentionally locked off until export is in place.
            </div>
          </SettingsSection>
        </Reveal>
      </div>
    </>
  );
}

type SectionTone = "default" | "danger";

function SettingsSection({
  kicker,
  icon,
  title,
  description,
  children,
  tone = "default",
}: {
  kicker: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: SectionTone;
}) {
  return (
    <section
      className={cn(
        "rounded-md border overflow-hidden",
        "bg-[linear-gradient(180deg,rgba(10,28,44,0.45),rgba(6,18,30,0.55))]",
        tone === "danger" ? "border-danger/25" : "border-border-subtle",
      )}
    >
      <header className="px-7 py-5 flex flex-col gap-2 border-b border-border-subtle/60">
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
      <div className="px-7 py-6">{children}</div>
    </section>
  );
}
