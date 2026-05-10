"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import {
  auth,
  unstable_update,
} from "@/modules/auth";
import {
  completeOwnerOnboarding,
  getOwnerProfile,
  upsertOwnerProfile,
} from "@/modules/profiles";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { users } from "@/modules/users/schema";
import { sendOwnerSignupOpsEmail } from "@/modules/email";

export interface OwnerOnboardingState {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Single-page owner wizard submit. Upsert the profile, mark onboarding
 * complete, refresh the JWT (no-op for owner — name doesn't change here
 * but we'll need this when role/profile-completed flags propagate),
 * redirect to the owner dashboard.
 */
export async function ownerOnboardingAction(
  _prev: OwnerOnboardingState,
  formData: FormData,
): Promise<OwnerOnboardingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You're signed out — log in and try again." };
  }
  const userId = session.user.id;

  // Translate empty strings to nulls so Zod's nullish() chain accepts them.
  const nullable = (v: FormDataEntryValue | null) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const result = await upsertOwnerProfile(userId, {
    entityType: formData.get("entityType"),
    companyName: nullable(formData.get("companyName")),
    defaultSuburb: nullable(formData.get("defaultSuburb")),
    defaultState: nullable(formData.get("defaultState")),
    defaultPostcode: nullable(formData.get("defaultPostcode")),
    contactPref: formData.get("contactPref") || "email",
  });

  if (!result.ok) {
    if (result.error.code === "validation" && result.error.details?.issues) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.details.issues as Array<{ path: (string | number)[]; message: string }>) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { fieldErrors };
    }
    return { error: result.error.message };
  }

  const complete = await completeOwnerOnboarding(userId);
  if (!complete.ok) return { error: complete.error.message };

  // Ops heads-up — fire-and-forget so the redirect isn't blocked on
  // Resend latency. Failure is logged inside the send wrapper.
  void (async () => {
    try {
      const [u] = await db
        .select({
          email: users.email,
          name: users.name,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const profile = await getOwnerProfile(userId);
      if (u) {
        await sendOwnerSignupOpsEmail({
          ownerName: u.name,
          ownerEmail: u.email,
          ownerPhone: u.phone,
          entityType: profile?.entityType ?? null,
          companyName: profile?.companyName ?? null,
          state: profile?.defaultState ?? null,
          signedUpAt: new Date(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        { event: "ops_email.owner_signup.threw", userId, msg },
        "owner signup ops email threw — continuing",
      );
    }
  })();

  // Trigger a JWT refresh so any in-token flags (role/status) sync — also
  // ensures the (app) layout re-renders sidebar with fresh role state.
  await unstable_update({ user: {} });
  revalidatePath("/", "layout");

  redirect("/owner");
}
