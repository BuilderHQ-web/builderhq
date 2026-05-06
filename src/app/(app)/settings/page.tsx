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

  // Fetch the canonical user row — JWT may be stale.
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
        description="Update your name and password. Email change and notification preferences ship in Phase 2."
      />

      <div className="px-6 lg:px-8 py-7 flex flex-col gap-7 max-w-3xl">
        {/* Profile */}
        <SettingsSection title="Profile" description="Your name across BuilderHQ.">
          <ProfileForm
            defaultFirstName={user.firstName ?? ""}
            defaultLastName={user.lastName ?? ""}
            email={user.email}
          />
        </SettingsSection>

        {/* Password */}
        <SettingsSection
          title="Password"
          description="Choose a strong password — minimum 10 characters."
        >
          <PasswordForm />
        </SettingsSection>

        {/* Danger zone (placeholder) */}
        <SettingsSection
          title="Danger zone"
          description="Permanent actions. Available in Phase 2 with full audit + data export."
        >
          <div className="text-[13px] text-text-dim">
            Account deletion ships in Phase 2 alongside the data-export tool.
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
    <section className="rounded-md border border-border-subtle bg-surface-1">
      <header className="px-5 py-4 border-b border-border-subtle">
        <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
          {title}
        </h2>
        <p className="text-[12px] text-text-dim mt-0.5">{description}</p>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
