/**
 * /api/unsubscribe/[token] — RFC 8058 one-click + GET fallback.
 *
 * This is the URL we put in the marketing email's `List-Unsubscribe`
 * header (and as the visible link in the email footer). Two methods:
 *
 *   GET  → redirect to /unsubscribe/[token] which is the browser-
 *          friendly confirmation page. Users who click the email
 *          footer link land here first.
 *   POST → Gmail / Outlook one-click unsubscribe button. Flips the
 *          flag and returns 200 JSON. RFC 8058 spec.
 *
 * Token IS auth — the per-user UUID stored on users.unsubscribe_token.
 *
 * Why split this from /unsubscribe/[token]/page.tsx: Next.js can't
 * have both `page.tsx` and `route.ts` in the same directory. Easier
 * to put the API handler under /api/ and have it 302 to the page for
 * GETs. Same URL handles both POST (one-click) and GET (link click)
 * from the email's perspective.
 */

import { NextResponse } from "next/server";

import {
  findUserByUnsubscribeToken,
  setMarketingEmailsEnabled,
} from "@/modules/projects/unsubscribe";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const user = await findUserByUnsubscribeToken(token);
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  if (user.marketingEmailsEnabled) {
    await setMarketingEmailsEnabled(user.id, false);
    logger.info(
      { event: "unsubscribe.one_click", userId: user.id },
      "one-click unsubscribe via mail-provider POST",
    );
  }
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  // Bounce to the user-facing page; that page does the actual flag
  // toggle + shows confirmation. Keeps the GET handler stateless.
  return NextResponse.redirect(`${base}/unsubscribe/${token}`, 302);
}
