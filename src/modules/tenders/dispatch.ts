/**
 * tenders · dispatch.
 *
 * Fan-out helper. When a tender state transition lands in the service
 * (submit / withdraw / shortlist / award / reject), the relevant
 * service function calls dispatchTenderEvent — which gathers all
 * needed user + project + profile data with one SQL join, then
 * fires:
 *
 *   1. one in-app notification row (for the bell dropdown)
 *   2. one transactional email (via Resend)
 *
 * Failures are swallowed and logged. A flaky email send must not
 * roll back the tender transition the user just performed.
 *
 * Why live inside the tenders module rather than a separate "comms"
 * module: the join needed here spans tenders, projects, users, and
 * builder/owner profiles. Tenders already declares the relevant
 * schema imports for its own queries, so keeping dispatch alongside
 * keeps cross-module coupling to a single direction (tenders →
 * email + notifications) instead of needing a third module that
 * reads from four others.
 *
 * When this codebase grows an Inngest pipeline (Phase 4+), this file
 * becomes the publisher and the email/notification work moves into
 * subscribers — but the public surface (`dispatchTenderEvent`) stays
 * stable.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { tenders, tenderBuilderInvites } from "./schema";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users/schema";
import {
  builderProfiles,
  projectOwnerProfiles,
  architectProfiles,
} from "@/modules/profiles/schema";

import { create as createNotification } from "@/modules/notifications";
import { sendToUser as sendPushToUser } from "@/modules/push";
import {
  sendBuilderTenderInvitationEmail,
  sendTenderSubmittedEmail,
  sendTenderSubmittedBuilderEmail,
  sendTenderSubmittedOpsEmail,
  sendTenderShortlistedEmail,
  sendTenderAwardedEmail,
  sendTenderRejectedEmail,
  sendTenderWithdrawnEmail,
} from "@/modules/email";

export type TenderDispatchKind =
  | "submitted"
  | "withdrawn"
  | "shortlisted"
  | "awarded"
  | "rejected";

interface DispatchContext {
  tender: {
    id: string;
    totalPriceAud: number | null;
    durationWeeks: number | null;
    validityDays: number | null;
  };
  project: { id: string; slug: string; title: string };
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    name: string | null;
    phone: string | null;
  };
  builder: {
    id: string;
    email: string;
    firstName: string | null;
    company: string;
  };
}

/**
 * One SQL round-trip that pulls every field downstream emails /
 * notifications might want. We project sparingly so unrelated
 * columns don't get dragged across the wire.
 */
async function gatherContext(tenderId: string): Promise<DispatchContext | null> {
  const ownerUsers = alias(users, "owner_users");
  const builderUsers = alias(users, "builder_users");
  const [row] = await db
    .select({
      // tender
      tenderId: tenders.id,
      totalPriceAud: tenders.totalPriceAud,
      durationWeeks: tenders.durationWeeks,
      validityDays: tenders.validityDays,
      // project
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      // owner user
      ownerId: ownerUsers.id,
      ownerEmail: ownerUsers.email,
      ownerName: ownerUsers.name,
      ownerPhone: ownerUsers.phone,
      // owner profile
      ownerCompany: projectOwnerProfiles.companyName,
      // builder user
      builderId: builderUsers.id,
      builderEmail: builderUsers.email,
      builderName: builderUsers.name,
      // builder profile
      builderCompany: builderProfiles.companyName,
    })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .innerJoin(ownerUsers, eq(ownerUsers.id, projects.ownerId))
    .leftJoin(
      projectOwnerProfiles,
      eq(projectOwnerProfiles.userId, projects.ownerId),
    )
    .innerJoin(builderUsers, eq(builderUsers.id, tenders.builderId))
    .leftJoin(builderProfiles, eq(builderProfiles.userId, tenders.builderId))
    .where(eq(tenders.id, tenderId))
    .limit(1);
  if (!row) return null;

  // first-name extraction (rough — split on first space)
  const firstFromName = (n: string | null) =>
    n ? (n.split(" ")[0] ?? null) : null;

  return {
    tender: {
      id: row.tenderId,
      totalPriceAud: row.totalPriceAud,
      durationWeeks: row.durationWeeks,
      validityDays: row.validityDays,
    },
    project: {
      id: row.projectId,
      slug: row.projectSlug,
      title: row.projectTitle,
    },
    owner: {
      id: row.ownerId,
      email: row.ownerEmail,
      firstName: firstFromName(row.ownerName),
      name: row.ownerName,
      phone: row.ownerPhone,
    },
    builder: {
      id: row.builderId,
      email: row.builderEmail,
      firstName: firstFromName(row.builderName),
      // Builder shows as company name where available, falling back to
      // the user's name (e.g. for builders mid-onboarding who haven't
      // saved their profile yet).
      company:
        row.builderCompany ?? row.builderName ?? "A builder on BuilderHQ",
    },
  };
}

const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Public entrypoint. Caller (tender service functions) await this in
 * a try/catch: dispatch failures must not surface to the user, but
 * we should never block a state transition on email delivery either.
 *
 * The function is internally try/catch'd so even if the gather query
 * blows up, the transition the caller just performed isn't undone.
 */
export async function dispatchTenderEvent(
  kind: TenderDispatchKind,
  tenderId: string,
): Promise<void> {
  try {
    const ctx = await gatherContext(tenderId);
    if (!ctx) {
      logger.warn(
        { event: "tender.dispatch.no_context", tenderId, kind },
        "tender dispatch — no context found",
      );
      return;
    }

    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const reviewUrl = `${base}/owner/projects/${ctx.project.slug}/tenders`;
    const tenderUrl = `${base}/builder/projects/${ctx.project.slug}/tender`;
    const browseUrl = `${base}/builder/browse`;

    switch (kind) {
      case "submitted": {
        const priceLabel =
          ctx.tender.totalPriceAud != null
            ? formatAud(ctx.tender.totalPriceAud)
            : "Tender submitted";
        await Promise.allSettled([
          // Owner — bell + email + mobile push
          createNotification({
            userId: ctx.owner.id,
            kind: "tender_submitted",
            title: `${ctx.builder.company} sent you a tender`,
            body: `${ctx.project.title} · ${priceLabel}`,
            actionUrl: reviewUrl,
            projectId: ctx.project.id,
            tenderId: ctx.tender.id,
          }),
          sendPushToUser(ctx.owner.id, {
            title: `${ctx.builder.company} sent you a tender`,
            body: `${ctx.project.title} · ${priceLabel}`,
            data: {
              kind: "tender_submitted",
              projectSlug: ctx.project.slug,
              tenderId: ctx.tender.id,
              url: `/(main)/projects/${ctx.project.slug}/tenders`,
            },
          }),
          sendTenderSubmittedEmail({
            to: ctx.owner.email,
            ownerFirstName: ctx.owner.firstName,
            builderCompany: ctx.builder.company,
            projectTitle: ctx.project.title,
            totalPriceAud: ctx.tender.totalPriceAud ?? 0,
            durationWeeks: ctx.tender.durationWeeks ?? 0,
            validityDays: ctx.tender.validityDays ?? 0,
            reviewUrl,
          }),
          // Builder — confirmation
          sendTenderSubmittedBuilderEmail({
            to: ctx.builder.email,
            builderFirstName: ctx.builder.firstName,
            projectTitle: ctx.project.title,
            totalPriceAud: ctx.tender.totalPriceAud ?? 0,
            durationWeeks: ctx.tender.durationWeeks ?? 0,
            validityDays: ctx.tender.validityDays ?? 0,
            tenderUrl,
          }),
          // Ops — heads-up
          sendTenderSubmittedOpsEmail({
            projectTitle: ctx.project.title,
            projectUrl: tenderUrl,
            builderCompany: ctx.builder.company,
            builderEmail: ctx.builder.email,
            ownerName: ctx.owner.name,
            ownerEmail: ctx.owner.email,
            totalPriceAud: ctx.tender.totalPriceAud,
            durationWeeks: ctx.tender.durationWeeks,
            validityDays: ctx.tender.validityDays,
            submittedAt: new Date(),
          }),
        ]);
        break;
      }
      case "withdrawn": {
        await Promise.allSettled([
          createNotification({
            userId: ctx.owner.id,
            kind: "tender_withdrawn",
            title: `${ctx.builder.company} withdrew their tender`,
            body: ctx.project.title,
            actionUrl: reviewUrl,
            projectId: ctx.project.id,
            tenderId: ctx.tender.id,
          }),
          sendPushToUser(ctx.owner.id, {
            title: `${ctx.builder.company} withdrew their tender`,
            body: ctx.project.title,
            data: {
              kind: "tender_withdrawn",
              projectSlug: ctx.project.slug,
              tenderId: ctx.tender.id,
              url: `/(main)/projects/${ctx.project.slug}/tenders`,
            },
          }),
          sendTenderWithdrawnEmail({
            to: ctx.owner.email,
            ownerFirstName: ctx.owner.firstName,
            builderCompany: ctx.builder.company,
            projectTitle: ctx.project.title,
            reviewUrl,
          }),
        ]);
        break;
      }
      case "shortlisted": {
        await Promise.allSettled([
          createNotification({
            userId: ctx.builder.id,
            kind: "tender_shortlisted",
            title: `Shortlisted on ${ctx.project.title}`,
            body: "You're now one of the contenders.",
            actionUrl: tenderUrl,
            projectId: ctx.project.id,
            tenderId: ctx.tender.id,
          }),
          sendPushToUser(ctx.builder.id, {
            title: `Shortlisted on ${ctx.project.title}`,
            body: "You're now one of the contenders.",
            data: {
              kind: "tender_shortlisted",
              projectSlug: ctx.project.slug,
              tenderId: ctx.tender.id,
              url: `/(main)/tenders/${ctx.tender.id}`,
            },
          }),
          sendTenderShortlistedEmail({
            to: ctx.builder.email,
            builderFirstName: ctx.builder.firstName,
            ownerName: ctx.owner.name,
            projectTitle: ctx.project.title,
            tenderUrl,
          }),
        ]);
        break;
      }
      case "awarded": {
        await Promise.allSettled([
          createNotification({
            userId: ctx.builder.id,
            kind: "tender_awarded",
            title: `You won ${ctx.project.title}!`,
            body: "Owner has shared their contact details.",
            actionUrl: tenderUrl,
            projectId: ctx.project.id,
            tenderId: ctx.tender.id,
          }),
          sendPushToUser(ctx.builder.id, {
            title: `You won ${ctx.project.title}!`,
            body: "Owner has shared their contact details.",
            data: {
              kind: "tender_awarded",
              projectSlug: ctx.project.slug,
              tenderId: ctx.tender.id,
              url: `/(main)/tenders/${ctx.tender.id}`,
            },
          }),
          sendTenderAwardedEmail({
            to: ctx.builder.email,
            builderFirstName: ctx.builder.firstName,
            ownerName: ctx.owner.name,
            ownerEmail: ctx.owner.email,
            ownerPhone: ctx.owner.phone,
            projectTitle: ctx.project.title,
            tenderUrl,
          }),
        ]);
        break;
      }
      case "rejected": {
        await Promise.allSettled([
          createNotification({
            userId: ctx.builder.id,
            kind: "tender_rejected",
            title: `Decision made on ${ctx.project.title}`,
            body: "Owner is moving forward with another builder.",
            actionUrl: browseUrl,
            projectId: ctx.project.id,
            tenderId: ctx.tender.id,
          }),
          sendPushToUser(ctx.builder.id, {
            title: `Decision made on ${ctx.project.title}`,
            body: "Owner is moving forward with another builder.",
            data: {
              kind: "tender_rejected",
              projectSlug: ctx.project.slug,
              tenderId: ctx.tender.id,
              url: `/(main)/browse`,
            },
          }),
          sendTenderRejectedEmail({
            to: ctx.builder.email,
            builderFirstName: ctx.builder.firstName,
            projectTitle: ctx.project.title,
            browseUrl,
          }),
        ]);
        break;
      }
    }

    logger.info(
      { event: "tender.dispatch.ok", tenderId, kind },
      "tender dispatch completed",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "tender.dispatch.failed", tenderId, kind, msg },
      "tender dispatch failed — continuing",
    );
  }
}

/**
 * Invitation fan-out for private / hybrid rounds. Fired by
 * createBuilderInvite after the row lands. Same contract as
 * dispatchTenderEvent: internally try/catch'd, never blocks or rolls
 * back the invite the runner just created.
 *
 * Off-platform invitees get the email only (there is no user row to
 * notify). On-platform builders also get a bell notification; no
 * mobile push, because the mobile app has no invite redemption route
 * yet — the email link handles the full journey on web.
 */
/**
 * Collapse runner-controlled text to one clean line before it enters
 * an email subject or body: strips control characters, collapses
 * whitespace, caps length. Defence in depth — the values are already
 * validated at entry, but an email to an off-platform stranger is the
 * one surface where a crafted string does real reputational damage.
 */
function cleanLine(s: string, max: number): string {
  return s
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function dispatchBuilderInvite(
  inviteId: string,
): Promise<{ emailed: boolean }> {
  try {
    const inviterUsers = alias(users, "inviter_users");
    const inviteeUsers = alias(users, "invitee_users");
    const [row] = await db
      .select({
        // invite
        email: tenderBuilderInvites.email,
        contactName: tenderBuilderInvites.contactName,
        builderUserId: tenderBuilderInvites.builderUserId,
        inviteToken: tenderBuilderInvites.inviteToken,
        // project
        projectId: projects.id,
        projectTitle: projects.title,
        projectSuburb: projects.suburb,
        projectState: projects.state,
        // inviter (the runner) — practice name preferred for architects
        inviterName: inviterUsers.name,
        inviterPractice: architectProfiles.practiceName,
        // on-platform invitee
        inviteeEmail: inviteeUsers.email,
        inviteeName: inviteeUsers.name,
      })
      .from(tenderBuilderInvites)
      .innerJoin(projects, eq(projects.id, tenderBuilderInvites.projectId))
      .innerJoin(
        inviterUsers,
        eq(inviterUsers.id, tenderBuilderInvites.invitedBy),
      )
      .leftJoin(
        architectProfiles,
        eq(architectProfiles.userId, tenderBuilderInvites.invitedBy),
      )
      .leftJoin(
        inviteeUsers,
        eq(inviteeUsers.id, tenderBuilderInvites.builderUserId),
      )
      .where(eq(tenderBuilderInvites.id, inviteId))
      .limit(1);
    if (!row) {
      logger.warn(
        { event: "tender_invite.dispatch.no_context", inviteId },
        "tender invite dispatch — no context found",
      );
      return { emailed: false };
    }

    const onPlatform = !!row.builderUserId;
    const to = onPlatform ? row.inviteeEmail : row.email;
    if (!to) {
      logger.warn(
        { event: "tender_invite.dispatch.no_recipient", inviteId },
        "tender invite dispatch — no recipient email",
      );
      return { emailed: false };
    }

    const firstFromName = (n: string | null) =>
      n ? (n.split(" ")[0] ?? null) : null;
    const inviterName = cleanLine(
      row.inviterPractice ?? row.inviterName ?? "The project team",
      80,
    );
    const projectTitle = cleanLine(row.projectTitle, 120);
    const projectLocation = row.projectSuburb
      ? cleanLine(
          `${row.projectSuburb}, ${row.projectState ?? ""}`.replace(/, $/, ""),
          80,
        )
      : null;
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    const inviteUrl = `${base}/invite/b/${row.inviteToken}`;

    const [emailResult] = await Promise.allSettled([
      sendBuilderTenderInvitationEmail({
        to,
        contactFirstName: onPlatform
          ? firstFromName(row.inviteeName)
          : firstFromName(row.contactName),
        inviterName,
        projectTitle,
        projectLocation,
        inviteUrl,
        onPlatform,
      }),
      ...(onPlatform
        ? [
            createNotification({
              userId: row.builderUserId!,
              kind: "tender_invited",
              title: `Invited to tender on ${projectTitle}`,
              body: `${inviterName} has invited you. Invited builders take part at no cost.`,
              actionUrl: inviteUrl,
              projectId: row.projectId,
            }),
          ]
        : []),
    ]);

    const emailed =
      emailResult.status === "fulfilled" && emailResult.value.ok;
    if (emailed) {
      logger.info(
        { event: "tender_invite.dispatch.ok", inviteId, onPlatform },
        "tender invite dispatch completed",
      );
    } else {
      logger.warn(
        { event: "tender_invite.dispatch.email_failed", inviteId, onPlatform },
        "tender invite created but the email did not send",
      );
    }
    return { emailed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "tender_invite.dispatch.failed", inviteId, msg },
      "tender invite dispatch failed — continuing",
    );
    return { emailed: false };
  }
}
