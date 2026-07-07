/**
 * POST /api/dev/seed-tenders?slug=<project-slug>   ·   DEV-ONLY
 *
 * Drops 3 realistic SUBMITTED tenders onto a project so the owner
 * comparison screen can be exercised with real data (varied prices,
 * programmes, validity, start months, exclusions, conditions, pitches,
 * and trade-by-trade cost breakdowns). Each tender is attributed to a
 * lightweight seed "builder" user (no profile needed — display name
 * carries the company).
 *
 * Idempotent: re-running replaces the seeded tenders for these three
 * builders on the project (it never touches real tenders).
 *
 * Folder is `dev` (NOT `_dev`) so it's routable. Hard-disabled in prod.
 *
 *   curl -s -X POST "http://localhost:3000/api/dev/seed-tenders?slug=deakin-townhoiuyse" | jq
 *
 * Then reopen the project as the owner → "Review tenders".
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { projects } from "@/modules/projects/schema";
import { tenders, tenderCostLines } from "@/modules/tenders/schema";
import { users } from "@/modules/users/schema";
import {
  conversations as conversationsTable,
  messages as messagesTable,
  getOrCreateConversation,
  postUserMessage,
  markRead,
} from "@/modules/messaging";

export const runtime = "nodejs";

/** Seed chat threads per builder so the inbox is testable (unread +
 *  read receipts). `builderRead` bumps the builder's read pointer so the
 *  owner's replies render as "read". */
const THREADS: Record<
  string,
  { messages: { from: "builder" | "owner"; body: string }[]; builderRead?: boolean }
> = {
  apex: {
    builderRead: true,
    messages: [
      { from: "builder", body: "Hi — thanks for the opportunity. Quick one: are the soil test results available? It affects the footing design." },
      { from: "owner", body: "Hi Daniel, yes — I'll upload the geotech report tonight. It's an M-class site." },
      { from: "builder", body: "Perfect, that lines up with our slab allowance. Happy to walk you through our quote whenever suits." },
    ],
  },
  brightwater: {
    messages: [
      { from: "builder", body: "Morning! We'd love to build this one. Are you open to a few finish upgrades in the kitchen?" },
      { from: "owner", body: "Potentially — depends on the cost. Can you send options?" },
      { from: "builder", body: "Will do. Also note our quote excludes the pool and driveway, happy to price those separately." },
    ],
  },
  corten: {
    messages: [
      { from: "builder", body: "Hi there — we can start in July and hand over in 22 weeks. Keen to make this happen." },
      { from: "builder", body: "Let me know if you'd like to meet on site this week." },
    ],
  },
};

interface SeedLine {
  trade: string;
  amountAud: number;
}
interface Persona {
  key: string;
  name: string;
  firstName: string;
  lastName: string;
  price: number;
  durationWeeks: number;
  validityDays: number;
  startMonth: string;
  exclusions: string[];
  conditions: string;
  pitch: string;
  lines: SeedLine[];
}

const PERSONAS: Persona[] = [
  {
    key: "apex",
    name: "Apex Constructions",
    firstName: "Daniel",
    lastName: "Apex",
    price: 445_000,
    durationWeeks: 24,
    validityDays: 30,
    startMonth: "2026-08",
    exclusions: ["Landscaping", "Council fees"],
    conditions: "Fixed-price on the issued plans. Progress claims monthly. Excludes rock excavation if encountered.",
    pitch: "15+ years building townhouses across Essendon and Moonee Valley. Fixed-price, no variations on a complete set of plans, and a dedicated supervisor on site.",
    lines: [
      { trade: "preliminaries", amountAud: 28_000 },
      { trade: "ground_works", amountAud: 32_000 },
      { trade: "concrete_work", amountAud: 78_000 },
      { trade: "carpentry", amountAud: 95_000 },
      { trade: "roofing", amountAud: 38_000 },
      { trade: "hydraulic_services", amountAud: 36_000 },
      { trade: "electrical_services", amountAud: 34_000 },
      { trade: "painting", amountAud: 22_000 },
      { trade: "external_works", amountAud: 82_000 },
    ],
  },
  {
    key: "brightwater",
    name: "Brightwater Homes",
    firstName: "Sarah",
    lastName: "Brightwater",
    price: 489_000,
    durationWeeks: 28,
    validityDays: 14,
    startMonth: "2026-09",
    exclusions: ["Landscaping", "Swimming pool", "Driveway"],
    conditions: "10% deposit on signing, balance via standard progress claims. Premium fixtures allowance included.",
    pitch: "Boutique builder running a handful of sites at a time so yours gets real attention. Premium finishes and a 7-year structural guarantee included as standard.",
    lines: [
      { trade: "preliminaries", amountAud: 34_000 },
      { trade: "ground_works", amountAud: 30_000 },
      { trade: "concrete_work", amountAud: 82_000 },
      { trade: "carpentry", amountAud: 102_000 },
      { trade: "roofing", amountAud: 41_000 },
      { trade: "hydraulic_services", amountAud: 40_000 },
      { trade: "electrical_services", amountAud: 38_000 },
      { trade: "painting", amountAud: 26_000 },
      { trade: "external_works", amountAud: 96_000 },
    ],
  },
  {
    key: "corten",
    name: "Corten Build Co.",
    firstName: "Mark",
    lastName: "Corten",
    price: 512_000,
    durationWeeks: 22,
    validityDays: 30,
    startMonth: "2026-07",
    exclusions: ["Council fees"],
    conditions: "Turn-key. Includes site costs, BASIX compliance and final clean. Liquidated damages clause for late completion.",
    pitch: "Fastest programme on offer — 22 weeks — with a single dedicated site supervisor and weekly photo updates. Turn-key handover, nothing left for you to chase.",
    lines: [
      { trade: "preliminaries", amountAud: 30_000 },
      { trade: "ground_works", amountAud: 38_000 },
      { trade: "concrete_work", amountAud: 88_000 },
      { trade: "carpentry", amountAud: 110_000 },
      { trade: "roofing", amountAud: 36_000 },
      { trade: "hydraulic_services", amountAud: 42_000 },
      { trade: "electrical_services", amountAud: 40_000 },
      { trade: "painting", amountAud: 24_000 },
      { trade: "external_works", amountAud: 104_000 },
    ],
  },
];

export async function POST(request: NextRequest) {
  if (env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  let slug = url.searchParams.get("slug") ?? undefined;
  if (!slug) {
    try {
      const body = (await request.json()) as { slug?: string };
      slug = body.slug;
    } catch {
      /* no body */
    }
  }
  if (!slug) {
    return NextResponse.json(
      { error: "Pass ?slug=<project-slug>." },
      { status: 400 },
    );
  }

  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      buildSizeBand: projects.buildSizeBand,
      ownerId: projects.ownerId,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: `No project with slug "${slug}".` }, { status: 404 });
  }

  // Give the project a build size if it has none, so the $/m² insight
  // has something to compute against (dev-only, non-destructive).
  if (!project.buildSizeBand) {
    await db
      .update(projects)
      .set({ buildSizeBand: "200_250" })
      .where(eq(projects.id, project.id));
  }

  const now = new Date();
  const created: Array<{ builder: string; tenderId: string; price: number }> = [];

  for (const p of PERSONAS) {
    const email = `seed-${p.key}@builderhq.dev`;

    // Find-or-create the seed builder user.
    let [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!u) {
      [u] = await db
        .insert(users)
        .values({
          email,
          name: p.name,
          firstName: p.firstName,
          lastName: p.lastName,
          role: "builder",
          status: "active",
        })
        .returning({ id: users.id });
    }
    const builderId = u!.id;

    // Replace any prior seeded tender for this builder on this project.
    const existing = await db
      .select({ id: tenders.id })
      .from(tenders)
      .where(and(eq(tenders.builderId, builderId), eq(tenders.projectId, project.id)));
    if (existing.length > 0) {
      const ids = existing.map((e) => e.id);
      await db.delete(tenderCostLines).where(inArray(tenderCostLines.tenderId, ids));
      await db.delete(tenders).where(inArray(tenders.id, ids));
    }

    const [t] = await db
      .insert(tenders)
      .values({
        builderId,
        projectId: project.id,
        status: "submitted",
        totalPriceAud: p.price,
        durationWeeks: p.durationWeeks,
        validityDays: p.validityDays,
        proposedStartMonth: p.startMonth,
        exclusions: p.exclusions,
        conditions: p.conditions,
        pitch: p.pitch,
        submittedAt: now,
      })
      .returning({ id: tenders.id });
    const tenderId = t!.id;

    await db.insert(tenderCostLines).values(
      p.lines.map((l, i) => ({
        tenderId,
        trade: l.trade as (typeof tenderCostLines.$inferInsert)["trade"],
        amountAud: l.amountAud,
        sortOrder: i,
      })),
    );

    // Seed a conversation + message history so the inbox is testable.
    const thread = THREADS[p.key];
    if (thread) {
      const conv = await getOrCreateConversation(project.id, builderId);
      if (conv.ok) {
        const convId = conv.value.id;
        // Idempotent: clear any prior seeded messages + reset read
        // pointers so unread state shows on re-run.
        await db.delete(messagesTable).where(eq(messagesTable.conversationId, convId));
        await db
          .update(conversationsTable)
          .set({ builderLastReadAt: null, ownerLastReadAt: null })
          .where(eq(conversationsTable.id, convId));
        for (const msg of thread.messages) {
          const senderId = msg.from === "builder" ? builderId : project.ownerId;
          await postUserMessage(senderId, { conversationId: convId, body: msg.body });
        }
        // Builder has caught up → the owner's replies show as "read".
        if (thread.builderRead) await markRead(builderId, convId);
      }
    }

    created.push({ builder: p.name, tenderId, price: p.price });
  }

  return NextResponse.json({
    ok: true,
    project: { slug, title: project.title, id: project.id },
    created,
    note: "Open this project as the owner → Review tenders.",
  });
}
