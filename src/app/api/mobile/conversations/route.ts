/**
 * GET /api/mobile/conversations
 *
 * Inbox — every conversation the caller is a participant in, sorted
 * by `lastMessageAt desc nulls last` (matches the web inbox order).
 * Returns `MobileConversationListItem[]` directly under `items`.
 *
 * Bearer-token authed. No role gate — both owners and builders have
 * conversations.
 */

import { NextResponse, type NextRequest } from "next/server";

import { listForUser } from "@/modules/messaging";
import { requireMobileAuth } from "../_lib/requireMobileAuth";
import { conversationToPayload } from "../_lib/conversationPayload";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const conversations = await listForUser(auth.value.userId);
  return NextResponse.json({
    items: conversations.map(conversationToPayload),
    totalUnread: conversations.reduce((s, c) => s + c.unreadCount, 0),
  });
}
