"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth, unstable_update } from "@/modules/auth";
import {
  addBuilderLicence,
  removeBuilderLicence,
  setBuilderProjectCategories,
  setBuilderServiceAreas,
  submitBuilderForApproval,
  upsertBuilderProfile,
} from "@/modules/profiles";

export interface ActionState {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

function nullable(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function asInt(v: FormDataEntryValue | null) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fieldErrorsFromIssues(
  issues: Array<{ path: (string | number)[]; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.join(".");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

// ── Step 1 + 2 + 6 share a profile upsert (different fields filled per step)

export async function saveBuilderProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const result = await upsertBuilderProfile(userId, {
    companyName: String(formData.get("companyName") ?? ""),
    abn: nullable(formData.get("abn")),
    acn: nullable(formData.get("acn")),
    yearsInOperation: asInt(formData.get("yearsInOperation")),
    businessAddressLine1: nullable(formData.get("businessAddressLine1")),
    businessSuburb: nullable(formData.get("businessSuburb")),
    businessState: nullable(formData.get("businessState")),
    businessPostcode: nullable(formData.get("businessPostcode")),
    hasDifferentPostal: formData.get("hasDifferentPostal") === "on",
    postalAddressLine1: nullable(formData.get("postalAddressLine1")),
    postalSuburb: nullable(formData.get("postalSuburb")),
    postalState: nullable(formData.get("postalState")),
    postalPostcode: nullable(formData.get("postalPostcode")),
    bio: nullable(formData.get("bio")),
    website: nullable(formData.get("website")) ?? "",
    linkedinUrl: nullable(formData.get("linkedinUrl")) ?? "",
    instagramUrl: nullable(formData.get("instagramUrl")) ?? "",
  });

  if (!result.ok) {
    if (result.error.code === "validation" && result.error.details?.issues) {
      return { fieldErrors: fieldErrorsFromIssues(result.error.details.issues as never) };
    }
    return { error: result.error.message };
  }

  return { ok: true };
}

export async function saveBuilderCategoriesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const categories = formData.getAll("categories").map(String);

  const result = await setBuilderProjectCategories(userId, { categories });
  if (!result.ok) return { error: result.error.message };
  return { ok: true };
}

export async function saveBuilderServiceAreasAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  // Areas serialised as a JSON array in a single hidden input — easiest way
  // to round-trip a list-of-objects through FormData.
  let areas: unknown = [];
  try {
    areas = JSON.parse(String(formData.get("areasJson") ?? "[]"));
  } catch {
    return { error: "Couldn't read your service areas — try again." };
  }

  const result = await setBuilderServiceAreas(userId, { areas: areas as never });
  if (!result.ok) {
    if (result.error.code === "validation") {
      return { error: result.error.message };
    }
    return { error: result.error.message };
  }

  return { ok: true };
}

// Licences add/remove are simple per-row actions (not a save-and-continue).
export async function addLicenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const issuedRaw = String(formData.get("issuedAt") ?? "");
  const expiresRaw = String(formData.get("expiresAt") ?? "");

  const result = await addBuilderLicence(userId, {
    state: String(formData.get("state") ?? ""),
    licenceType: String(formData.get("licenceType") ?? ""),
    licenceNumber: String(formData.get("licenceNumber") ?? ""),
    licenceHolderName: nullable(formData.get("licenceHolderName")),
    issuedAt: issuedRaw ? new Date(issuedRaw) : null,
    expiresAt: expiresRaw ? new Date(expiresRaw) : null,
  });

  if (!result.ok) {
    if (result.error.code === "validation" && result.error.details?.issues) {
      return { fieldErrors: fieldErrorsFromIssues(result.error.details.issues as never) };
    }
    return { error: result.error.message };
  }

  return { ok: true };
}

export async function removeLicenceAction(licenceId: string): Promise<void> {
  const userId = await requireUserId();
  const result = await removeBuilderLicence(userId, licenceId);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
}

export async function submitForApprovalAction(): Promise<ActionState> {
  const userId = await requireUserId();
  const result = await submitBuilderForApproval(userId);
  if (!result.ok) return { error: result.error.message };

  await unstable_update({ user: {} });
  revalidatePath("/", "layout");
  redirect("/builder");
}
