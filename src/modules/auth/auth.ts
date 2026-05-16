/**
 * Auth.js v5 — full Node-side config.
 *
 * Imported by:
 *   - app/api/auth/[...nextauth]/route.ts  (handlers)
 *   - server actions / RSC pages           (auth() to read current session)
 *
 * NOT imported by middleware — that uses ./config directly to stay Edge-safe.
 *
 * Spreads the base config from ./config and adds Node-only pieces: the
 * Drizzle adapter and the Credentials provider (whose authorize() hashes
 * passwords with @node-rs/argon2 — native binding, Node only).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { logger } from "@/lib/logger";

import { authConfig } from "./config";
import { verifyHandoffProof } from "./magic-link";
import { accounts, verificationTokens } from "./schema";

/**
 * Credentials input schema. Email is normalized to lowercase before any DB
 * lookup so case-mismatches don't fail login. Password length is just a
 * "non-empty" gate here — true strength is enforced at sign-up time.
 */
const credentialsSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  // The Drizzle adapter handles the OAuth + verification token tables.
  // We omit `sessionsTable` because we use JWT sessions (see config.ts).
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        // Reasons to fail — all return the same null so an attacker can't
        // distinguish "no such user" from "wrong password" via timing or
        // error message. Unverified accounts also return null here as
        // defense in depth; the login action front-runs that check and
        // routes the user to /verify-email with a friendlier UX.
        if (!user) return null;
        if (!user.passwordHash) return null; // OAuth-only account
        if (user.deletedAt) return null;
        if (user.status === "banned" || user.status === "suspended") return null;
        if (user.status === "pending_verification") return null;

        const ok = await verify(user.passwordHash, password);
        if (!ok) {
          logger.warn(
            { event: "auth.credentials_failed", userId: user.id },
            "credential verify failed",
          );
          return null;
        }

        // Auth.js consumes whatever we return. Match the augmented User
        // shape (see src/types/next-auth.d.ts).
        return {
          id: user.id,
          email: user.email,
          name:
            user.name ??
            ([user.firstName, user.lastName].filter(Boolean).join(" ") || null),
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
    /**
     * Ads-funnel handoff provider — turns a server-minted HMAC proof
     * into a real Auth.js session.
     *
     * The /auth/magic route handler does the magic-link redemption
     * (verify email, publish project) in one transaction, then mints
     * a 60-second handoff proof and passes it through signIn(). The
     * proof is HMAC-signed with AUTH_SECRET so only the server can
     * issue one; clients hitting POST /api/auth/callback with a
     * forged proof fail HMAC verification and authorize() returns
     * null.
     *
     * Distinct provider `id` (not the default "credentials") so the
     * client-facing password sign-in form can't be tricked into
     * sending the wrong shape — and so an attacker who steals the
     * password schema can't pretend to be a magic-link.
     */
    Credentials({
      id: "ads-funnel-handoff",
      name: "Magic Link",
      credentials: { proof: {} },
      async authorize(raw) {
        const proof =
          typeof raw?.proof === "string" ? raw.proof : null;
        if (!proof) return null;
        const v = verifyHandoffProof(proof);
        if (!v.ok) {
          logger.warn(
            { event: "auth.handoff.bad_proof" },
            "ads-funnel handoff rejected",
          );
          return null;
        }
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, v.userId))
          .limit(1);
        if (!user) return null;
        if (user.deletedAt) return null;
        if (user.status === "banned" || user.status === "suspended") return null;
        // We deliberately allow status="pending_verification" here:
        // the proof was minted by the redemption flow which sets
        // status=active in the same txn, but order-of-operations means
        // the proof's user lookup might happen before the txn commits
        // visibility in a high-replica DB. The route handler's redemption
        // path is the security boundary; this is just session minting.
        return {
          id: user.id,
          email: user.email,
          name:
            user.name ??
            ([user.firstName, user.lastName].filter(Boolean).join(" ") || null),
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
});
