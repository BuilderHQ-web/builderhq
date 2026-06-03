import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/modules/auth";
import { getOwnerProfile } from "@/modules/profiles";
import { db } from "@/lib/db";
import { users } from "@/modules/users/schema";
import { displayAuPhoneFromE164 } from "@/lib/au-phone";
import { Eyebrow } from "@/components/brand/section";

import { OwnerForm } from "./owner-form";

export const metadata = { title: "Get set up", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OwnerOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Pre-fill with any in-progress profile data — owners can come back to
  // the wizard after a partial save (today there's no autosave, but the
  // shape supports it).
  const existing = await getOwnerProfile(session.user.id);

  // Phone lives on the user row, not the owner profile — fetch it so a
  // returning owner sees their number pre-filled.
  const [userRow] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <header className="flex flex-col gap-3">
        <Eyebrow>Project owner · setup</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[clamp(2.25rem,5vw+1rem,3.75rem)] leading-[0.95]">
          Welcome, {firstName}
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted max-w-[42ch]">
          Three quick questions and you&apos;re in. We use these to pre-fill
          the project upload form and keep the right kinds of builders in
          front of you.
        </p>
      </header>

      <OwnerForm
        defaults={{
          entityType: existing?.entityType ?? null,
          companyName: existing?.companyName ?? null,
          defaultSuburb: existing?.defaultSuburb ?? null,
          defaultState: existing?.defaultState ?? null,
          defaultPostcode: existing?.defaultPostcode ?? null,
          contactPref: existing?.contactPref ?? "email",
          phone: displayAuPhoneFromE164(userRow?.phone),
        }}
      />
    </div>
  );
}
