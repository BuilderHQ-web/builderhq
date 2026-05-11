#!/usr/bin/env node
// Promote a user to the `admin` role.
//
// Admin accounts can't be created through the /signup form by design —
// the form rejects role=admin so platform-operator access can't be
// self-claimed. This script flips an existing verified user to admin
// after the fact.
//
// Usage:
//   node --env-file=.env.local scripts/make-admin.mjs you@example.com
//
// Effects:
//   - users.role           → 'admin'
//   - users.status         → 'active'      (in case it was pending_verification)
//   - users.emailVerified  → now() if null (admins skip the verify-email gate)
//
// Re-running with the same email is idempotent — already-admin accounts
// are detected and we exit cleanly without writing.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  const before = await client.query(
    `SELECT id, email, role, status, email_verified FROM users WHERE lower(email) = $1 LIMIT 1`,
    [email],
  );
  if (before.rows.length === 0) {
    console.error(`No user with email ${email}. Sign up first via /signup.`);
    process.exit(1);
  }
  const u = before.rows[0];
  if (u.role === "admin") {
    console.log(`✓ ${u.email} is already an admin (status=${u.status}). Nothing to do.`);
    process.exit(0);
  }

  const result = await client.query(
    `UPDATE users
        SET role = 'admin',
            status = 'active',
            email_verified = COALESCE(email_verified, now()),
            updated_at = now()
      WHERE id = $1
      RETURNING id, email, role, status`,
    [u.id],
  );
  const after = result.rows[0];
  console.log(
    `✓ Promoted ${after.email} → role=${after.role}, status=${after.status}.`,
  );
  console.log("  Sign out / back in to refresh your session cookie.");
} catch (err) {
  console.error("\n✗ Promotion failed:");
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
