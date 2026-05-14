/**
 * POST /api/mobile/conversations/[id]/messages
 *
 * Append a user message to a conversation. Hands off to
 * `postUserMessage` which:
 *   · validates non-empty + max 4000 chars
 *   · verifies the caller is a participant
 *   · bumps `lastMessageAt` + `lastMessagePreview` on the conversation
 *     in the same transaction as the insert
 *
 * Returns the inserted message in mobile-payload shape so the client
 * can swap the optimistic temp-id row for the real one without
 * re-fetching the whole thread.
 *
 * Body: { body: string }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { postUserMessage } from "@/modules/messaging";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import { messageToPayload } from "../../../_lib/conversationPayload";

export const runtime = "nodejs";

const BodySchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: parsed.error.issues[0]?.message ?? "Message body required.",
        },
      },
      { status: 400 },
    );
  }

  const r = await postUserMessage(auth.value.userId, {
    conversationId: id,
    body: parsed.data.body,
  });
  if (!r.ok) {
    const status =
      r.error.code === "not_found" ? 404 :
      r.error.code === "forbidden" ? 403 :
      r.error.code === "validation" ? 400 :
      500;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }
  return NextResponse.json({ message: messageToPayload(r.value) });
}
