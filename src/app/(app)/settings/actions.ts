"use server";

import { revalidatePath } from "next/cache";

import { auth, changePassword, signOut, updateProfile } from "@/modules/auth";

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

  const result = await updateProfile(userId, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
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

  // Refresh the layout so the topbar's name updates.
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
