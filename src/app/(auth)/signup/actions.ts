"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { signUp, signUpSchema } from "@/modules/auth";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import {
  metaEventId,
  metaRequestContext,
  sendMetaConversion,
} from "@/lib/meta-capi";
import { safeInternalPath } from "../_lib/next-path";

/** Form-state shape consumed by useFormState / useActionState on the client. */
export interface SignupActionState {
  ok?: true;
  error?: string;
  /** Field-level errors keyed by Zod path. */
  fieldErrors?: Record<string, string>;
}

/**
 * Server action invoked by the /signup form.
 *
 * Returns errors as state (for inline display) on failure; redirects to
 * /verify-email on success — the user's verification email has been sent
 * by the service.
 */
export async function signupAction(
  _prev: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  // Per-IP rate gate on account creation. Stops obvious flooding;
  // legitimate signups land well under the limit.
  const ip = clientIpFromHeaders(await headers());
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return {
      error: "Too many signup attempts from this network. Wait a few minutes.",
    };
  }

  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
  };

  // Field-level Zod first so we can show inline errors before the service hits.
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  // Continuation path (e.g. an invitation the user was following) —
  // sanitised to internal paths, threaded through the verification
  // email so the journey survives the round-trip.
  const next = safeInternalPath(String(formData.get("next") ?? ""));

  const result = await signUp(parsed.data, next ? { next } : {});
  if (!result.ok) {
    if (result.error.code === "conflict") {
      return { fieldErrors: { email: result.error.message } };
    }
    return { error: result.error.message };
  }

  // Report the registration to Meta from here, because the browser
  // cannot. Everything past this action is the signed-in application,
  // where the pixel deliberately does not mount, so the server is the
  // only witness to the conversion a campaign is actually buying.
  //
  // The context is captured NOW, while the request still has its
  // headers and cookies; `after` runs the send once the response is
  // finished, and it runs even though `redirect` below throws. The id
  // is derived from the new user rather than random, so a retried
  // submission reports the same conversion instead of a second one.
  const metaContext = await metaRequestContext();
  const { userId, email } = result.value;
  after(() =>
    sendMetaConversion({
      eventName: "CompleteRegistration",
      eventId: metaEventId("reg", userId),
      context: metaContext,
      user: {
        email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        externalId: userId,
      },
      // Which side of the marketplace signed up, so campaigns can be
      // optimised per audience rather than against one blended number.
      customData: { content_name: parsed.data.role },
    }),
  );

  // Success — redirect to the verify-email page. We pass the email as a
  // query param so the next page can show "we sent a link to <email>".
  redirect(
    `/verify-email?email=${encodeURIComponent(result.value.email)}${
      next ? `&next=${encodeURIComponent(next)}` : ""
    }`,
  );
}
