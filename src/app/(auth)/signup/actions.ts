"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { signUp, signUpSchema } from "@/modules/auth";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import {
  metaEventId,
  metaRequestContext,
  sendMetaConversion,
} from "@/lib/meta-capi";
import { metaRegistrationParams } from "@/lib/meta-role";
import { readUtmAttribution, UTM_COOKIE } from "@/lib/utm";
import { safeInternalPath } from "../_lib/next-path";
import { setSignupHandoff } from "../_lib/signup-handoff";

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

  // Which campaign brought them, read from our own cookie rather than
  // from the form. The parameters were dropped on a landing page long
  // before this form existed, and a value that lands in the database
  // should not be one a stranger can type into a request.
  const jar = await cookies();
  const utm = readUtmAttribution(jar.get(UTM_COOKIE)?.value);

  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
    ...(utm.source ? { signupSource: utm.source } : {}),
    ...(utm.campaign ? { signupCampaign: utm.campaign } : {}),
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
  // The role comes back from the service, which returns what it wrote,
  // rather than from the submitted field. Advertising breaks its spend
  // down by this value, so it has to describe the account that exists.
  const { userId, email, role: createdRole } = result.value;
  const eventId = metaEventId("reg", userId);
  // Which side of the marketplace signed up, so campaigns can be
  // optimised per audience rather than against one blended number.
  // `content_name` keeps the stored role it has always carried, and
  // `role` is the advertising dimension. The browser half sends this
  // object verbatim, so the two reports of one conversion agree
  // parameter for parameter as well as on the id.
  const conversionParams = metaRegistrationParams({ role: createdRole });
  after(() =>
    sendMetaConversion({
      eventName: "CompleteRegistration",
      eventId,
      context: metaContext,
      user: {
        email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        externalId: userId,
      },
      customData: conversionParams,
    }),
  );

  // Success. Everything the next page needs travels in a short-lived
  // http-only cookie rather than the query string: the address it will
  // name, the continuation path, and the id and role of the conversion
  // just reported, which the browser has no other way to learn because
  // this action ends in a redirect and returns nothing to the client.
  // The verify-email page sends the browser's half under that id, and
  // Meta keeps one of the pair.
  //
  // None of it belongs in an address bar. The advertising pixel reads
  // the address on every event it sends, so a query string is a
  // disclosure to a third party, and this one used to carry a
  // customer's email address.
  await setSignupHandoff({
    email,
    eventId,
    role: createdRole,
    ...(next ? { next } : {}),
  });
  redirect("/verify-email");
}
