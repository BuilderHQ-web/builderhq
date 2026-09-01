"use server";

/**
 * Architect onboarding — single-step submit. Upsert the studio
 * profile, mark onboarding complete, refresh the JWT so the (app)
 * shell renders architect chrome, land on the studio dashboard.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import { auth, unstable_update } from "@/modules/auth";
import { db } from "@/lib/db";
import { users } from "@/modules/users";
import {
  sendArchitectSignupOpsEmail,
  sendArchitectWelcomeEmail,
} from "@/modules/email";
import { seedSampleRound } from "@/modules/sample";
import {
  completeArchitectOnboarding,
  getArchitectProfile,
  upsertArchitectProfile,
} from "@/modules/profiles";
import { normaliseAuPhone } from "@/lib/au-phone";
import { logger } from "@/lib/logger";

export interface ArchitectOnboardingState {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function architectOnboardingAction(
  _prev: ArchitectOnboardingState,
  formData: FormData,
): Promise<ArchitectOnboardingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You're signed out. Log in and try again." };
  }
  const userId = session.user.id;

  const nullable = (v: FormDataEntryValue | null) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  // Phone is optional for studios; when supplied it must be valid AU.
  const phoneInput = (formData.get("contactPhone") ?? "").toString().trim();
  let phoneE164: string | null = null;
  if (phoneInput !== "") {
    phoneE164 = normaliseAuPhone(phoneInput);
    if (!phoneE164) {
      return {
        fieldErrors: {
          contactPhone: "Enter a valid AU mobile or landline (e.g. 0412 345 678).",
        },
      };
    }
  }

  const result = await upsertArchitectProfile(userId, {
    practiceName: nullable(formData.get("practiceName")),
    suburb: nullable(formData.get("suburb")),
    state: nullable(formData.get("state")),
    contactPhone: phoneE164,
  });
  if (!result.ok) {
    if (result.error.code === "validation" && result.error.details?.issues) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.details.issues as Array<{
        path: (string | number)[];
        message: string;
      }>) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }
    return { error: result.error.message };
  }

  const done = await completeArchitectOnboarding(userId);
  if (!done.ok) return { error: done.error.message };

  // The example round: a finished tender waiting on the new desk.
  await seedSampleRound(userId);

  logger.info(
    { event: "onboarding.architect.completed", userId },
    "architect onboarded",
  );

  // Ops heads-up — fire-and-forget so the redirect isn't blocked on
  // Resend latency, and inside a try/catch so a mail fault can never
  // cost somebody their onboarding. Must sit ABOVE the redirect:
  // `redirect()` throws by design, so anything below it never runs.
  void (async () => {
    try {
      const [u] = await db
        .select({ email: users.email, name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const profile = await getArchitectProfile(userId);
      if (u) {
        await sendArchitectWelcomeEmail({
          to: u.email,
          firstName: u.name?.split(" ")[0] ?? null,
          practiceName: profile?.practiceName ?? null,
        });
        await sendArchitectSignupOpsEmail({
          architectName: u.name,
          architectEmail: u.email,
          // The studio's own contact number is the useful one; the
          // account phone is the fallback, and either may be absent.
          architectPhone: profile?.contactPhone ?? u.phone ?? null,
          practiceName: profile?.practiceName ?? null,
          suburb: profile?.suburb ?? null,
          state: profile?.state ?? null,
          signedUpAt: new Date(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        { event: "ops_email.architect_signup.threw", userId, msg },
        "architect signup ops email threw — continuing",
      );
    }
  })();

  // Refresh the JWT so in-token flags sync and the shell re-renders
  // with architect chrome.
  await unstable_update({ user: {} });
  revalidatePath("/", "layout");

  redirect("/architect");
}
