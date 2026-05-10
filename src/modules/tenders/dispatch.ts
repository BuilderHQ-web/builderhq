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

import { tenders } from "./schema";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users/schema";
import { builderProfiles, projectOwnerProfiles } from "@/modules/profiles/schema";

import { create as createNotification } from "@/modules/notifications";
import {
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
          // Owner — bell + email
          createNotification({
            userId: ctx.owner.id,
            kind: "tender_submitted",
            title: `${ctx.builder.company} sent you a tender`,
            body: `${ctx.project.title} · ${priceLabel}`,
            actionUrl: reviewUrl,
            projectId: ctx.project.id,
            tenderId: ctx.tender.id,
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
