"use server";

/**
 * Architect onboarding — single-step submit. Upsert the studio
 * profile, mark onboarding complete, refresh the JWT so the (app)
 * shell renders architect chrome, land on the studio dashboard.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, unstable_update } from "@/modules/auth";
import {
  completeArchitectOnboarding,
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

  logger.info(
    { event: "onboarding.architect.completed", userId },
    "architect onboarded",
  );

  // Refresh the JWT so in-token flags sync and the shell re-renders
  // with architect chrome.
  await unstable_update({ user: {} });
  revalidatePath("/", "layout");

  redirect("/architect");
}
