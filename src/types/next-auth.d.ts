/**
 * Auth.js module augmentation — extends the default Session, User, and JWT
 * shapes with BuilderHQ-specific fields (role, status, id).
 *
 * Picked up project-wide via tsconfig's `**\/*.ts` glob. No imports needed
 * at callsites — TypeScript merges these automatically.
 */

import type { DefaultSession } from "next-auth";
import type { User as DbUser } from "@/modules/users";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: DbUser["role"];
      status: DbUser["status"];
    } & DefaultSession["user"];
  }

  interface User {
    role: DbUser["role"];
    status: DbUser["status"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: DbUser["role"];
    status: DbUser["status"];
  }
}
