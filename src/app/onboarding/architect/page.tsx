import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { getArchitectProfile } from "@/modules/profiles";
import { displayAuPhoneFromE164 } from "@/lib/au-phone";
import { Eyebrow } from "@/components/brand/section";

import { ArchitectForm } from "./architect-form";

export const metadata = { title: "Get set up", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ArchitectOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Pre-fill any in-progress profile so returning users never retype.
  const existing = await getArchitectProfile(session.user.id);

  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <header className="flex flex-col gap-3">
        <Eyebrow>Architect studio · setup</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[clamp(2.25rem,5vw+1rem,3.75rem)] leading-[0.95]">
          Welcome, {firstName}
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted max-w-[46ch]">
          Two quick details and your studio is live. From your dashboard you
          can upload a client&apos;s project, choose how the tender runs, and
          bring your builders and your client in when you&apos;re ready.
        </p>
      </header>

      <ArchitectForm
        defaults={{
          practiceName: existing?.practiceName ?? null,
          suburb: existing?.suburb ?? null,
          state: existing?.state ?? null,
          contactPhone: displayAuPhoneFromE164(existing?.contactPhone ?? null),
        }}
      />
    </div>
  );
}
