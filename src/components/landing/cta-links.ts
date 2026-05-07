import { auth } from "@/modules/auth";

/**
 * Marketing CTAs ("Upload a project" / "Browse as a builder") are
 * routed differently depending on auth state:
 *
 * - Logged out      → /signup with role pre-selected
 * - Logged-in owner → owner dashboard (always — no cross-role browsing)
 * - Logged-in builder → builder dashboard
 * - Admin            → /admin
 *
 * The "logged-in user clicks the wrong-role CTA still goes to their
 * own dashboard" rule is intentional. People rarely switch roles, and
 * a confusing redirect is worse than a redundant click.
 */
export type CtaLinks = {
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
};

export async function resolveCtaLinks(): Promise<CtaLinks> {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "project_owner") {
    return {
      primary: { href: "/owner", label: "Open dashboard" },
      secondary: { href: "/owner", label: "View your projects" },
    };
  }
  if (role === "builder") {
    return {
      primary: { href: "/builder", label: "Open dashboard" },
      secondary: { href: "/builder", label: "Browse projects" },
    };
  }
  if (role === "admin") {
    return {
      primary: { href: "/admin", label: "Admin console" },
      secondary: { href: "/admin", label: "Admin console" },
    };
  }

  // Logged out — pre-select role on signup.
  return {
    primary: { href: "/signup?role=owner", label: "Upload a project" },
    secondary: { href: "/signup?role=builder", label: "I'm a builder" },
  };
}
