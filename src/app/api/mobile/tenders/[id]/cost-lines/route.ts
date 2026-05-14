/**
 * PUT /api/mobile/tenders/[id]/cost-lines
 *
 * Replace the entire cost-line set for a draft tender. Atomic via the
 * existing setCostLines service which wraps delete-then-insert in a
 * single transaction.
 *
 * Body:
 *   { lines: Array<{ trade: TradeId; amountAud: number; label?: string }> }
 *
 * Trades: enum gated server-side. `other` requires a non-empty `label`;
 * the service rejects with code: "validation" if not.
 *
 * Returns the full tender payload so the mobile client can resync
 * readiness + variance from one response.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getTenderForBuilder,
  setCostLines,
} from "@/modules/tenders";
import { TRADES } from "@/modules/tenders/trades";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import { tenderToPayload } from "../../../_lib/tenderPayload";

export const runtime = "nodejs";

const TRADE_IDS = TRADES.map((t) => t.id) as [string, ...string[]];

const LineSchema = z.object({
  trade: z.enum(TRADE_IDS),
  amountAud: z.number().int().nonnegative().max(100_000_000),
  label: z.string().trim().min(1).max(80).optional(),
});

const BodySchema = z.object({
  lines: z.array(LineSchema).max(60),
});

export async function PUT(
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
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: parsed.error.issues[0]?.message ?? "Invalid lines.",
        },
      },
      { status: 400 },
    );
  }

  const r = await setCostLines(
    auth.value.userId,
    id,
    // setCostLines's CostLineInput type narrows trade to TradeId — the
    // zod enum has already validated against TRADE_IDS so the cast is
    // safe.
    parsed.data.lines as Parameters<typeof setCostLines>[2],
  );
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

  // Fetch the full tender (with the just-written lines + recomputed
  // readiness) so the client can swap state without an extra GET.
  const tender = await getTenderForBuilder(auth.value.userId, id);
  if (!tender) {
    return NextResponse.json(
      { error: { code: "internal", message: "Lines updated but reload failed." } },
      { status: 500 },
    );
  }
  return NextResponse.json(tenderToPayload(tender));
}
