/**
 * messaging · dispatch.
 *
 * Fan-out for a freshly posted user message. Today this fires exactly
 * one side-effect — a push notification to the OTHER party in the
 * conversation. The recipient sees the chat copy land in their lock
 * screen / banner, with a deep link straight to the thread.
 *
 * We intentionally don't write to the existing in-app `notifications`
 * table here — that table backs the bell dropdown, and chat messages
 * already show up as unread badges on the messages tab. Surfacing
 * them in the bell too would double-count.
 *
 * No emails either — per the service-layer comment, chat is in-app
 * only by design (the unlock + tender state transitions already
 * carry email weight).
 *
 * Why not inside the postUserMessage transaction:
 *   We don't want a flaky Expo API call to roll back a successful
 *   message insert. Caller (service.postUserMessage) awaits this
 *   AFTER the transaction commits, and the function is internally
 *   try/catch'd so any failure here is logged + swallowed.
 *
 * System messages don't dispatch through here — those are triggered
 * by another module's event (tender submitted, unlock, etc.) which
 * already runs its own push via its own dispatch.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import { sendToUser } from "@/modules/push";
import { builderProfiles } from "@/modules/profiles/schema";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users/schema";

import { conversations } from "./schema";

const PREVIEW_LEN = 120;

/**
 * Trim + collapse a message body for use as the push body text. We
 * don't fully strip markdown / mentions — Expo renders them as plain
 * text which is the right fallback.
 */
function preview(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length > PREVIEW_LEN
    ? collapsed.slice(0, PREVIEW_LEN - 1) + "…"
    : collapsed;
}

/**
 * Public entrypoint. Called from messaging.service.postUserMessage
 * after the insert transaction commits.
 *
 * Returns void; never throws. All errors logged.
 */
export async function dispatchUserMessage(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
  body: string;
}): Promise<void> {
  try {
    // One join pulls everything we need: the conversation participants
    // (so we know who's NOT the sender → recipient), the project title
    // (push body), and the sender's display name (push title).
    const senderUsers = alias(users, "sender_users");
    const senderBuilderProfile = alias(builderProfiles, "sender_builder_profile");

    const [ctx] = await db
      .select({
        ownerId: conversations.ownerId,
        builderId: conversations.builderId,
        projectTitle: projects.title,
        senderName: senderUsers.name,
        senderCompany: senderBuilderProfile.companyName,
      })
      .from(conversations)
      .innerJoin(projects, eq(projects.id, conversations.projectId))
      .innerJoin(senderUsers, eq(senderUsers.id, input.senderId))
      .leftJoin(
        senderBuilderProfile,
        eq(senderBuilderProfile.userId, input.senderId),
      )
      .where(eq(conversations.id, input.conversationId))
      .limit(1);

    if (!ctx) {
      logger.warn(
        {
          event: "messaging.dispatch.no_context",
          conversationId: input.conversationId,
          messageId: input.messageId,
        },
        "messaging dispatch — no context found",
      );
      return;
    }

    // Recipient is whichever side ISN'T the sender. If the sender is
    // somehow neither (shouldn't happen — service layer gates this)
    // we bail rather than spamming both parties.
    let recipientId: string | null = null;
    if (input.senderId === ctx.ownerId) recipientId = ctx.builderId;
    else if (input.senderId === ctx.builderId) recipientId = ctx.ownerId;
    if (!recipientId) {
      logger.warn(
        {
          event: "messaging.dispatch.sender_not_participant",
          conversationId: input.conversationId,
          senderId: input.senderId,
        },
        "messaging dispatch — sender isn't a participant",
      );
      return;
    }

    // Title is the sender's display identity. Builders post as their
    // company; owners as their name. Falls back to "New message" so
    // the banner never reads as "null: …".
    const title =
      ctx.senderCompany ?? ctx.senderName ?? "New message";

    await sendToUser(recipientId, {
      title,
      body: preview(input.body),
      data: {
        kind: "message",
        conversationId: input.conversationId,
        messageId: input.messageId,
        url: `/(main)/messages/${input.conversationId}`,
      },
    });

    logger.info(
      {
        event: "messaging.dispatch.ok",
        conversationId: input.conversationId,
        messageId: input.messageId,
      },
      "messaging dispatch completed",
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(
      {
        event: "messaging.dispatch.failed",
        conversationId: input.conversationId,
        messageId: input.messageId,
        msg,
      },
      "messaging dispatch failed — continuing",
    );
  }
}
