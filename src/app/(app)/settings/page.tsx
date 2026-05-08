import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AlertTriangle, Lock, User } from "lucide-react";

import { auth } from "@/modules/auth";
import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { PageHeader } from "@/components/app/page-header";
import { Reveal } from "@/components/app/reveal";
import { cn } from "@/lib/utils";

import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings");

  const [user] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Update your name and password. Email change and notification preferences land in Phase 2."
      />

      <div className="px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-6 max-w-3xl">
        <Reveal immediate delay={0.04}>
          <SettingsSection
            kicker="Profile"
            icon={<User className="size-3.5" />}
            title="Identity"
            description="Your name across BuilderHQ. Email change and avatar upload arrive in Phase 2."
          >
            <ProfileForm
              defaultFirstName={user.firstName ?? ""}
              defaultLastName={user.lastName ?? ""}
              email={user.email}
            />
          </SettingsSection>
        </Reveal>

        <Reveal immediate delay={0.10}>
          <SettingsSection
            kicker="Security"
            icon={<Lock className="size-3.5" />}
            title="Password"
            description="Choose a strong password — minimum 10 characters. You'll be signed out of this device after changing."
          >
            <PasswordForm />
          </SettingsSection>
        </Reveal>

        <Reveal immediate delay={0.16}>
          <SettingsSection
            tone="danger"
            kicker="Danger zone"
            icon={<AlertTriangle className="size-3.5" />}
            title="Permanent actions"
            description="Account deletion ships in Phase 2 alongside the data-export tool."
          >
            <div className="text-[13px] text-text-dim flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(255,181,71,0.5)]" />
              Account deletion is intentionally locked off until export is in
              place.
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
