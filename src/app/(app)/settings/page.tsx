import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/modules/auth";
import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { PageHeader } from "@/components/app/page-header";

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

      <div className="px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-10 max-w-3xl">
        <SettingsSection
          title="Profile"
          description="Your name across BuilderHQ. Email change and avatar upload arrive in Phase 2."
        >
          <ProfileForm
            defaultFirstName={user.firstName ?? ""}
            defaultLastName={user.lastName ?? ""}
            email={user.email}
          />
        </SettingsSection>

        <SettingsSection
          title="Password"
          description="Choose a strong password — minimum 10 characters. You'll be signed out of this device after changing."
        >
          <PasswordForm />
        </SettingsSection>

        <SettingsSection
          title="Danger zone"
          description="Permanent actions. Account deletion ships in Phase 2 alongside the data-export tool."
        >
          <div className="text-[13px] text-text-dim">
            Account deletion is intentionally locked off until export is in place.
          </div>
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-1/40">
      <header className="px-7 py-5 flex flex-col gap-1">
        <h2 className="font-ui font-semibold text-[15px] tracking-[-0.005em] text-text">
          {title}
        </h2>
        <p className="text-[12.5px] leading-[20px] text-text-dim max-w-prose">{description}</p>
      </header>
      <div className="px-7 py-6 border-t border-border-subtle/60">{children}</div>
    </section>
  );
}
