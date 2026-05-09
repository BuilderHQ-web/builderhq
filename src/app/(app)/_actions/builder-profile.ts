"use server";

/**
 * Server actions for the builder public profile page.
 *
 * Most field updates re-use the existing `upsertBuilderProfile` /
 * `setBuilderServiceAreas` / `setBuilderProjectCategories` /
 * `addBuilderLicence` / `removeBuilderLicence` actions originally
 * written for the onboarding wizard. They were always meant to be
 * reusable; we just import them here so the profile page doesn't
 * have to know about /onboarding.
 *
 * Logo upload is the new piece — direct server-side upload to R2,
 * size + type validated, key written to builderProfiles.logoR2Key.
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { auth } from "@/modules/auth";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import {
  clearBuilderLogo,
  setBuilderLogo,
} from "@/modules/profiles";
import { r2, presignDownload } from "@/modules/documents";

// 2 MB cap — logos are vector-ish PNGs / SVGs, never huge.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

function extOf(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

/**
 * Upload a logo. Action takes a FormData with one `file` field.
 * Returns the resulting object key + a short-lived signed URL the UI
 * can render immediately while the page hasn't refreshed.
 */
export async function uploadBuilderLogoAction(
  formData: FormData,
): Promise<Result<{ key: string; url: string }>> {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) return fail("forbidden", "Sign in required.");
  if (role !== "builder" && role !== "admin") {
    return fail("forbidden", "Only builders can upload a logo.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("validation", "No file provided.");
  }
  if (file.size === 0) {
    return fail("validation", "File is empty.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    return fail("validation", "Logo must be under 2 MB.");
  }
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return fail(
      "validation",
      "Logo must be a PNG, JPEG, WebP, or SVG image.",
    );
  }

  const ext = extOf(file.type);
  const key = `builders/${userId}/logo/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Image cache header helps the public profile cache the logo
        // even though we serve via signed URLs.
        CacheControl: "public, max-age=86400",
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "profile.logo.upload_failed", userId, msg },
      "logo upload to R2 failed",
    );
    return fail("external_error", "Couldn't upload to storage.");
  }

  const r = await setBuilderLogo(userId, key);
  if (!r.ok) return r;

  const url = await presignDownload({ key });
  return ok({ key, url });
}

/** Clear the logo. R2 object stays for 30 days (cheap audit) — DB key wiped. */
export async function clearBuilderLogoAction(): Promise<Result<{ ok: true }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("forbidden", "Sign in required.");
  return clearBuilderLogo(userId);
}
