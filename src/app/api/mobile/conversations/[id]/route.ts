/**
 * GET /api/mobile/conversations/[id]
 *
 * Thread bundle: conversation header (same shape as the inbox row) +
 * the message tail oldest-first + the caller's own `lastReadAt` so
 * the mobile UI can render the "unread divider" and per-bubble
 * read-receipt states.
 *
 * Bearer-token authed. 404 if the caller isn't a participant
 * (collapse-to-not-found, same as the web pattern).
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversations } from "@/modules/messaging/schema";
import {
  getListItem,
  listMessages,
} from "@/modules/messaging";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";
import {
  conversationToPayload,
  messageToPayload,
  type MobileThreadPayload,
} from "../../_lib/conversationPayload";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  // Permission check + decorated row in one call.
  const item = await getListItem(auth.value.userId, id);
  if (!item) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Conversation not found." } },
      { status: 404 },
    );
  }

  // Raw conversation row — needed for the calling side's `lastReadAt`
  // which isn't on ConversationListItem.
  const [rawConv] = await db
    .select({
      builderId: conversations.builderId,
      ownerId: conversations.ownerId,
      builderLastReadAt: conversations.builderLastReadAt,
      ownerLastReadAt: conversations.ownerLastReadAt,
    })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  const myLastReadAt =
    rawConv?.builderId === auth.value.userId
      ? rawConv.builderLastReadAt
      : rawConv?.ownerLastReadAt ?? null;

  const messageRows = await listMessages(id, { limit: 200 });

  const payload: MobileThreadPayload = {
    conversation: conversationToPayload(item),
    serverNowIso: new Date().toISOString(),
    myLastReadAtIso: myLastReadAt ? myLastReadAt.toISOString() : null,
    messages: messageRows.map(messageToPayload),
  };
  return NextResponse.json(payload);
}
