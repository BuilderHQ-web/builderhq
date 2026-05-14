/**
 * GET   /api/mobile/tenders/[id] — load the full state for a tender.
 * PATCH /api/mobile/tenders/[id] — autosave a subset of fields.
 *
 * Both routes hand off to the existing tenders service (getTenderForBuilder
 * + updateDraft). updateDraft enforces the "draft only" rule + per-
 * field validation so we don't reimplement constraints here.
 *
 * Patch body accepts any subset of:
 *   { totalPriceAud, durationWeeks, validityDays, proposedStartMonth,
 *     exclusions, conditions, pitch }
 *
 * Returns the same tagged tender payload as the create endpoint so
 * mobile can hydrate from the response without a follow-up GET.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getTenderForBuilder,
  updateDraft,
} from "@/modules/tenders";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";
import { tenderToPayload } from "../../_lib/tenderPayload";

export const runtime = "nodejs";

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Tendering is for builders." } },
      { status: 403 },
    );
  }
  const t = await getTenderForBuilder(auth.value.userId, id);
  if (!t) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Tender not found." } },
      { status: 404 },
    );
  }
  return NextResponse.json(tenderToPayload(t));
}

// ── PATCH ────────────────────────────────────────────────────────────

const PatchSchema = z.object({
  totalPriceAud: z.number().nullable().optional(),
  durationWeeks: z.number().int().nullable().optional(),
  validityDays: z
    .union([z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90)])
    .nullable()
    .optional(),
  proposedStartMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM")
    .nullable()
    .optional(),
  exclusions: z.array(z.string().trim().min(1).max(80)).max(20).nullable().optional(),
  conditions: z.string().trim().max(2000).nullable().optional(),
  pitch: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Tendering is for builders." } },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: parsed.error.issues[0]?.message ?? "Invalid patch.",
        },
      },
      { status: 400 },
    );
  }

  const r = await updateDraft(auth.value.userId, id, parsed.data);
  if (!r.ok) {
    const status =
      r.error.code === "not_found" ? 404 :
      r.error.code === "forbidden" ? 403 :
      r.error.code === "conflict" ? 409 :
      400;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }
  return NextResponse.json(tenderToPayload(r.value));
}
