/**
 * Auth.js v5 catch-all route handler.
 *
 * Mounts at /api/auth/* and serves: /api/auth/signin, /api/auth/signout,
 * /api/auth/csrf, /api/auth/session, /api/auth/callback/<provider>, etc.
 *
 * Real auth logic lives in @/modules/auth — this file is just the wiring
 * Next.js needs to expose the handlers as HTTP endpoints.
 */
import { handlers } from "@/modules/auth";

export const { GET, POST } = handlers;

// Force Node runtime — Credentials provider uses @node-rs/argon2 (native).
export const runtime = "nodejs";
