/**
 * GET /api/mobile/conversations
 *
 * Inbox — every conversation the caller is a participant in, sorted
 * by `lastMessageAt desc nulls last` (matches the web inbox order).
 * Returns `MobileConversationListItem[]` directly under `items`.
 *
 * Bearer-token authed. No role gate — both owners and builders have
 * conversations.
 *
 *
 * POST /api/mobile/conversations
 *
 * Find-or-create the conversation for a (project × builder) pair so the
 * app can deep-link straight into a thread from a project/builder screen.
 * Conversations are normally created at unlock time; this is the explicit
 * "Message …" entry point and is robust to a stale client cache.
 *
 * Body: { projectSlug: string, builderId?: string }
 *   · Builder caller → messages the project owner; builder = caller,
 *     gated on having unlocked the project.
 *   · Owner caller   → messages a specific builder (builderId required),
 *     gated on owning the project + that builder having unlocked it.
 *
 * Returns { conversation: MobileConversationListItem }.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  listForUser,
  getOrCreateConversation,
  getListItem,
} from "@/modules/messaging";
import { getBySlugForOwner, getFullForUnlockedBuilder } from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
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

function notFound() {
  return NextResponse.json(
    { error: { code: "not_found", message: "Project not found." } },
    { status: 404 },
  );
}

function forbidden(message: string) {
  return NextResponse.json(
    { error: { code: "forbidden", message } },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  const { userId, role } = auth.value;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const projectSlug = typeof body.projectSlug === "string" ? body.projectSlug.trim() : "";
  if (!projectSlug) {
    return NextResponse.json(
      { error: { code: "validation", message: "A projectSlug is required." } },
      { status: 400 },
    );
  }

  let projectId: string;
  let builderId: string;

  if (role === "builder") {
    const proj = await getFullForUnlockedBuilder(projectSlug);
    if (!proj.ok) return notFound();
    projectId = proj.value.id;
    builderId = userId;
    if (!(await isUnlocked(builderId, projectId))) {
      return forbidden("Unlock this project to message the owner.");
    }
  } else if (role === "project_owner") {
    const proj = await getBySlugForOwner(userId, projectSlug);
    if (!proj.ok) return notFound();
    projectId = proj.value.id;
    const bid = typeof body.builderId === "string" ? body.builderId.trim() : "";
    if (!bid) {
      return NextResponse.json(
        { error: { code: "validation", message: "A builderId is required." } },
        { status: 400 },
      );
    }
    builderId = bid;
    if (!(await isUnlocked(builderId, projectId))) {
      return forbidden("This builder hasn't unlocked your project.");
    }
  } else {
    return forbidden("Messaging isn't available for this account.");
  }

  const convo = await getOrCreateConversation(projectId, builderId);
  if (!convo.ok) {
    const status = convo.error.code === "conflict" ? 409 : convo.error.code === "not_found" ? 404 : 500;
    return NextResponse.json(
      { error: { code: convo.error.code, message: convo.error.message } },
      { status },
    );
  }

  const item = await getListItem(userId, convo.value.id);
  if (!item) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Conversation unavailable." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ conversation: conversationToPayload(item) });
}
