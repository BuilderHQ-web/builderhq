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
    /**
     * One measure, held to the centre of the page.
     *
     * The heading, the copy and every field share a single column width.
     * This is the first screen of the product a practice ever sees, so
     * it is built like a page rather than a form dropped on a canvas:
     * the introduction sits on the paper, and the work sits in a card
     * under it.
     */
    <div className="mx-auto flex w-full max-w-[620px] flex-col gap-5 sm:gap-6">
      <header className="flex flex-col gap-3">
        <Eyebrow>Designer studio · setup</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] leading-[1] text-[clamp(1.8rem,2.6vw+0.9rem,2.5rem)]">
          Welcome, {firstName}
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted">
          Tell us about your practice and your studio is live. From your
          dashboard you can upload a client&apos;s project, choose how the
          tender runs, and bring your builders and your client in when
          you&apos;re ready.
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
