/**
 * messaging · service.
 *
 * One conversation per (project × builder). Created the moment a builder
 * unlocks a project; messages append from there. System messages are
 * posted by other modules (unlocks → "I've unlocked this project",
 * tenders → "Tender submitted") and rendered as centered chips.
 *
 * Reads + writes are scoped to participants in the calling layer
 * (server action gates on `canRead` / `canPost` from policies.ts).
 *
 * Per the user's spec, NO email is dispatched for chat messages — only
 * the existing tender-state-transition emails are kept. The sidebar
 * badge counts via this module's own per-conversation read pointers.
 */

import "server-only";
import { and, asc, count, desc, eq, gt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import {
  conversations,
  messages,
  type ConversationRow,
  type MessageRow,
} from "./schema";
import type {
  ConversationListItem,
  PostMessageInput,
  PostSystemMessageInput,
} from "./types";

import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users/schema";
import { builderProfiles } from "@/modules/profiles/schema";

import { dispatchUserMessage } from "./dispatch";

const PREVIEW_LEN = 140;
const MAX_BODY_LEN = 4000;

function preview(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length > PREVIEW_LEN
    ? collapsed.slice(0, PREVIEW_LEN - 1) + "…"
    : collapsed;
}

function initialsOf(displayName: string): string {
  return (
    displayName
      .split(/\s+/)
      .map((s) => s.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

// ── conversation creation ───────────────────────────────────────────────

/**
 * Idempotent. If a conversation already exists for (projectId, builderId),
 * returns it. Otherwise creates one (sniffs ownerId off the project row).
 *
 * Caller is responsible for permission checks; we just operate on
 * whatever ids we're handed. The unique index on (projectId, builderId)
 * + onConflictDoNothing makes this safe under concurrent unlock requests.
 */
export async function getOrCreateConversation(
  projectId: string,
  builderId: string,
): Promise<Result<ConversationRow>> {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.projectId, projectId),
        eq(conversations.builderId, builderId),
      ),
    )
    .limit(1);
  if (existing) return ok(existing);

  const [proj] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) return fail("not_found", "Project not found.");

  // Belt + braces — owner can't be the builder on their own project.
  if (proj.ownerId === builderId) {
    return fail(
      "conflict",
      "You can't start a conversation with yourself on your own project.",
    );
  }

  const [row] = await db
    .insert(conversations)
    .values({
      projectId,
      builderId,
      ownerId: proj.ownerId,
    })
    .onConflictDoNothing({
      target: [conversations.projectId, conversations.builderId],
    })
    .returning();
  if (row) return ok(row);

  // Conflict path — re-read.
  const [row2] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.projectId, projectId),
        eq(conversations.builderId, builderId),
      ),
    )
    .limit(1);
  if (!row2) return fail("internal", "Could not create conversation.");
  return ok(row2);
}

// ── posting messages ────────────────────────────────────────────────────

/**
 * Append a user message to a conversation. Bumps `last_message_*`
 * pointers so the inbox can sort by recency without scanning. Returns
 * the inserted row so the UI can append optimistically and reconcile
 * by id.
 */
export async function postUserMessage(
  senderId: string,
  input: PostMessageInput,
): Promise<Result<MessageRow>> {
  const trimmed = input.body.trim();
  if (trimmed.length === 0) {
    return fail("validation", "Message can't be empty.");
  }
  if (trimmed.length > MAX_BODY_LEN) {
    return fail(
      "validation",
      `Message is too long — keep it under ${MAX_BODY_LEN} characters.`,
    );
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.conversationId))
    .limit(1);
  if (!conv) return fail("not_found", "Conversation not found.");
  if (conv.builderId !== senderId && conv.ownerId !== senderId) {
    return fail("forbidden", "Not your conversation.");
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderId,
        kind: "user",
        body: trimmed,
      })
      .returning();
    if (!row) return fail("internal", "Could not send message.");

    await tx
      .update(conversations)
      .set({
        lastMessageAt: row.createdAt,
        lastMessagePreview: preview(trimmed),
      })
      .where(eq(conversations.id, conv.id));

    return ok(row);
  });

  // Side-effect AFTER the transaction commits so a flaky Expo Push
  // call can't roll back a successful message insert. We AWAIT (vs
  // fire-and-forget) because Vercel kills the function the moment the
  // response is sent — and dispatch is internally try/catch'd, so
  // awaiting it can't propagate a failure to the caller.
  if (result.ok) {
    await dispatchUserMessage({
      conversationId: result.value.conversationId,
      messageId: result.value.id,
      senderId,
      body: trimmed,
    });
  }

  return result;
}

/**
 * Append a system message. Caller (unlocks, tenders) provides the
 * conversation id + label. No sender, no email — these are pure
 * in-app announcements.
 */
export async function postSystemMessage(
  input: PostSystemMessageInput,
): Promise<Result<MessageRow>> {
  const body = input.body.trim();
  if (body.length === 0) {
    return fail("validation", "System message body required.");
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderId: null,
        kind: "system",
        body,
        tenderId: input.tenderId ?? null,
      })
      .returning();
    if (!row) return fail("internal", "Could not post system message.");

    await tx
      .update(conversations)
      .set({
        lastMessageAt: row.createdAt,
        lastMessagePreview: preview(body),
      })
      .where(eq(conversations.id, input.conversationId));

    return ok(row);
  });
}

// ── reads ───────────────────────────────────────────────────────────────

/**
 * Inbox query — every conversation the user participates in, with the
 * other party's identity and an unread count. Sorted by lastMessageAt
 * desc (NULLS LAST so brand-new conversations don't bury established
 * threads).
 */
export async function listForUser(
  userId: string,
): Promise<ConversationListItem[]> {
  const ownerUsers = alias(users, "owner_users");
  const builderUsers = alias(users, "builder_users");

  const rows = await db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      builderId: conversations.builderId,
      ownerId: conversations.ownerId,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      builderLastReadAt: conversations.builderLastReadAt,
      ownerLastReadAt: conversations.ownerLastReadAt,
      ownerName: ownerUsers.name,
      builderName: builderUsers.name,
      builderCompany: builderProfiles.companyName,
    })
    .from(conversations)
    .innerJoin(projects, eq(projects.id, conversations.projectId))
    .innerJoin(ownerUsers, eq(ownerUsers.id, conversations.ownerId))
    .innerJoin(builderUsers, eq(builderUsers.id, conversations.builderId))
    .leftJoin(
      builderProfiles,
      eq(builderProfiles.userId, conversations.builderId),
    )
    .where(
      or(
        eq(conversations.ownerId, userId),
        eq(conversations.builderId, userId),
      ),
    )
    .orderBy(
      sql`${conversations.lastMessageAt} desc nulls last`,
      desc(conversations.createdAt),
    );

  if (rows.length === 0) return [];

  // Unread per-conversation. We count messages where the sender ≠ caller
  // AND the message is newer than the caller's per-side read pointer.
  // One scan over messages joined to conversations does it.
  const counts = await db
    .select({
      conversationId: messages.conversationId,
      count: count(),
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        or(
          eq(conversations.ownerId, userId),
          eq(conversations.builderId, userId),
        ),
        // System messages have null senderId; they count as unread for
        // both sides until read, which is what we want. Use IS DISTINCT
        // FROM via not-equal to handle the null path safely:
        or(
          sql`${messages.senderId} is null`,
          ne(messages.senderId, userId),
        ),
        or(
          and(
            eq(conversations.builderId, userId),
            or(
              sql`${conversations.builderLastReadAt} is null`,
              gt(messages.createdAt, conversations.builderLastReadAt),
            ),
          ),
          and(
            eq(conversations.ownerId, userId),
            or(
              sql`${conversations.ownerLastReadAt} is null`,
              gt(messages.createdAt, conversations.ownerLastReadAt),
            ),
          ),
        ),
      ),
    )
    .groupBy(messages.conversationId);

  const unreadByConv = new Map<string, number>();
  for (const c of counts) unreadByConv.set(c.conversationId, c.count);

  return rows.map((r) => {
    const isOwnerSide = r.ownerId === userId;
    const otherId = isOwnerSide ? r.builderId : r.ownerId;
    const otherDisplay = isOwnerSide
      ? r.builderCompany ?? r.builderName ?? "Builder"
      : r.ownerName ?? "Project owner";
    const otherLastReadAt = isOwnerSide
      ? r.builderLastReadAt
      : r.ownerLastReadAt;
    return {
      id: r.id,
      projectId: r.projectId,
      projectSlug: r.projectSlug,
      projectTitle: r.projectTitle,
      other: {
        id: otherId,
        name: isOwnerSide ? r.builderName : r.ownerName,
        displayName: otherDisplay,
        initials: initialsOf(otherDisplay),
        role: isOwnerSide ? "builder" : "project_owner",
        lastReadAt: otherLastReadAt,
      },
      lastMessageAt: r.lastMessageAt,
      lastMessagePreview: r.lastMessagePreview,
      unreadCount: unreadByConv.get(r.id) ?? 0,
    };
  });
}

/** Single conversation row by id. Caller checks policy. */
export async function getById(
  conversationId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return row ?? null;
}

/**
 * Subset of listForUser scoped to a single project — drives the inline
 * messaging panel on project detail pages. Returns:
 *
 *   - For an owner viewing their own project → every conversation on
 *     that project (one per builder who's unlocked).
 *   - For a builder viewing a project they've unlocked → their single
 *     conversation with the owner (length 0 or 1).
 *
 * Built on top of listForUser to avoid duplicating the join + unread
 * computation. Filtering at the JS layer is fine here: a single user
 * is never going to have thousands of conversations.
 */
export async function listForUserOnProject(
  userId: string,
  projectId: string,
): Promise<ConversationListItem[]> {
  const all = await listForUser(userId);
  return all.filter((c) => c.projectId === projectId);
}

/**
 * The list-item shape (other party + project context) for a single
 * conversation. Built on top of `listForUser` to avoid duplicating
 * the join. Returns null if the user isn't a participant.
 */
export async function getListItem(
  userId: string,
  conversationId: string,
): Promise<ConversationListItem | null> {
  const all = await listForUser(userId);
  return all.find((c) => c.id === conversationId) ?? null;
}

/**
 * Page of messages, oldest first (we render top-to-bottom and stick
 * scroll to the latest). For now a single-page load with a generous
 * cap; pagination is a "load older" affordance to wire later.
 */
export async function listMessages(
  conversationId: string,
  opts: { limit?: number } = {},
): Promise<MessageRow[]> {
  const { limit = 200 } = opts;
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(limit);
  return rows;
}

// ── unread tracking ─────────────────────────────────────────────────────

/**
 * Bump the caller's "last_read_at" pointer to now. Cheap idempotent
 * write — called when the user opens a thread, and on focus return.
 */
export async function markRead(
  userId: string,
  conversationId: string,
): Promise<Result<{ ok: true }>> {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv) return fail("not_found", "Conversation not found.");
  if (conv.builderId !== userId && conv.ownerId !== userId) {
    return fail("forbidden", "Not your conversation.");
  }
  const now = new Date();
  if (conv.builderId === userId) {
    await db
      .update(conversations)
      .set({ builderLastReadAt: now })
      .where(eq(conversations.id, conversationId));
  } else {
    await db
      .update(conversations)
      .set({ ownerLastReadAt: now })
      .where(eq(conversations.id, conversationId));
  }
  return ok({ ok: true });
}

/**
 * Total unread messages for a user across ALL their conversations.
 * Backs the sidebar badge.
 */
export async function countUnreadForUser(userId: string): Promise<number> {
  const [r] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        or(
          sql`${messages.senderId} is null`,
          ne(messages.senderId, userId),
        ),
        or(
          and(
            eq(conversations.builderId, userId),
            or(
              sql`${conversations.builderLastReadAt} is null`,
              gt(messages.createdAt, conversations.builderLastReadAt),
            ),
          ),
          and(
            eq(conversations.ownerId, userId),
            or(
              sql`${conversations.ownerLastReadAt} is null`,
              gt(messages.createdAt, conversations.ownerLastReadAt),
            ),
          ),
        ),
      ),
    );
  return r?.value ?? 0;
}

// ── helpers other modules call ──────────────────────────────────────────

/**
 * Convenience used by the unlocks service: drop a system message in
 * the (just-created) conversation announcing the unlock. Pulls the
 * builder display name itself so the unlock service stays light.
 */
export async function postUnlockSystemMessage(
  conversationId: string,
  builderId: string,
): Promise<Result<MessageRow>> {
  const [row] = await db
    .select({
      builderName: users.name,
      builderCompany: builderProfiles.companyName,
    })
    .from(users)
    .leftJoin(builderProfiles, eq(builderProfiles.userId, users.id))
    .where(eq(users.id, builderId))
    .limit(1);
  const name = row?.builderCompany ?? row?.builderName ?? "Builder";
  return postSystemMessage({
    conversationId,
    body: `${name} unlocked this project — say hi.`,
  });
}

/**
 * Convenience used by the tenders service: drop a system message
 * announcing a tender submission, with a back-pointer for the UI
 * to render a "View tender" affordance.
 */
export async function postTenderSubmittedSystemMessage(
  conversationId: string,
  builderId: string,
  tenderId: string,
): Promise<Result<MessageRow>> {
  const [row] = await db
    .select({
      builderName: users.name,
      builderCompany: builderProfiles.companyName,
    })
    .from(users)
    .leftJoin(builderProfiles, eq(builderProfiles.userId, users.id))
    .where(eq(users.id, builderId))
    .limit(1);
  const name = row?.builderCompany ?? row?.builderName ?? "The builder";
  return postSystemMessage({
    conversationId,
    body: `${name} submitted a tender on this project.`,
    tenderId,
  });
}
