"use server";

import { revalidatePath } from "next/cache";

import {
  auth,
  changePassword,
  signOut,
  unstable_update,
  updateProfile,
} from "@/modules/auth";

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

  const result = await updateProfile(userId, { firstName, lastName });

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
