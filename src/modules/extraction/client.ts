/**
 * extraction · Anthropic client (server-only).
 *
 * One lazily-constructed Claude client shared by every extractor
 * (tender quotes today, project plans next). Lazy because the API key
 * is optional — the app must boot and serve the manual forms even when
 * no key is configured. `isExtractionEnabled()` lets routes return a
 * clean 503 instead of throwing on a missing key.
 *
 * Privacy note: customer documents (quotes, plans) are sent to Claude
 * for extraction. Configure `ANTHROPIC_API_KEY` with a zero-data-
 * retention key so uploads are not retained for training.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

/** The model every extractor runs on. Centralised so a bump is one edit. */
export const EXTRACTION_MODEL = "claude-opus-4-8";

let cached: Anthropic | null = null;

/** True when an API key is configured and extraction can run. */
export function isExtractionEnabled(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

/**
 * The shared client. Throws if called without a key configured — guard
 * every call site with `isExtractionEnabled()` first so the failure is
 * a friendly 503, never an unhandled 500.
 */
export function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured — extraction is disabled.",
    );
  }
  if (!cached) {
    cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return cached;
}
