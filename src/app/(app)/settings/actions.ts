"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import {
  auth,
  changePassword,
  signOut,
  unstable_update,
  updateProfile,
} from "@/modules/auth";
import { upsertOwnerProfile } from "@/modules/profiles";
import { db } from "@/lib/db";
import { users } from "@/modules/users/schema";
import { fail, ok, type Result } from "@/lib/result";

export interface SettingsActionState {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function updateProfileAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Not authenticated." };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  // Phone is optional. Empty string clears it.
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : "";

  const result = await updateProfile(userId, { firstName, lastName, phone });

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

  // The topbar reads from the JWT, not the DB — so we must rewrite the
  // session token in place. unstable_update() triggers the jwt() callback
  // with trigger:'update' and our payload as `session`, where it copies
  // `name` into the token. Without this, the user has to log out/in to
  // see the new name.
  await unstable_update({ user: { name: `${firstName} ${lastName}` } });

  // Re-render server components so any code that pulled session/DB data
  // sees the fresh values on the next paint.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePasswordAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Not authenticated." };

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (newPassword !== confirm) {
    return { fieldErrors: { confirm: "Passwords don't match" } };
  }

  const result = await changePassword(userId, {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword,
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

  // Sign out current device after password change. Other devices' JWTs
  // remain valid for up to 7d (architecture note in service.ts).
  await signOut({ redirectTo: "/login?password_changed=1" });
  return { ok: true };
}

/**
 * Owner-only — patch the project_owner_profiles row (entity type,
 * company, contact preference, defaults). Mirrors the onboarding
 * action's input shape so we can reuse `upsertOwnerProfile`.
 */
export async function updateOwnerSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Not authenticated." };

  const nullable = (v: FormDataEntryValue | null) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  const result = await upsertOwnerProfile(userId, {
    entityType: String(formData.get("entityType") ?? "homeowner"),
    companyName: nullable(formData.get("companyName")),
    defaultSuburb: nullable(formData.get("defaultSuburb")),
    defaultState: nullable(formData.get("defaultState")),
    defaultPostcode: nullable(formData.get("defaultPostcode")),
    contactPref: String(formData.get("contactPref") ?? "email"),
  });

  if (!result.ok) {
    if (result.error.code === "validation" && result.error.details?.issues) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.details.issues as Array<{
        path: (string | number)[];
        message: string;
      }>) {
        const k = issue.path.join(".");
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      return { fieldErrors };
    }
    return { error: result.error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Preferences (per-user, server-side) ───────────────────────────────

/**
 * Per-user marketing email opt-in. Used by the Preferences card on the
 * settings page. Returns the resulting flag value so the client can
 * sync state without a refetch — and any error so we can surface a
 * toast.
 */
export async function setMarketingEmailsEnabledAction(
  enabled: boolean,
): Promise<Result<{ enabled: boolean }>> {
  const userId = await requireUserId();
  if (!userId) return fail("forbidden", "Not authenticated.");

  await db
    .update(users)
    .set({ marketingEmailsEnabled: enabled })
    .where(eq(users.id, userId));

  return ok({ enabled });
}

/**
 * Read the current flag — used by the settings page's server load so
 * the toggle hydrates with the right state on first render.
 */
export async function getMarketingEmailsEnabled(): Promise<boolean> {
  const userId = await requireUserId();
  if (!userId) return true;
  const [row] = await db
    .select({ enabled: users.marketingEmailsEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.enabled ?? true;
}
