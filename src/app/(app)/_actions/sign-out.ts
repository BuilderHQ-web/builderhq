"use server";

import { signOut } from "@/modules/auth";

/** Server action invoked by the topbar's "Log out" menu item. */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
