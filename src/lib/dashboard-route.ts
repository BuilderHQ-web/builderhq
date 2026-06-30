/**
 * Single source of truth for where a signed-in user lands, by role.
 *
 * Used by EVERY post-auth redirect (password login, account claim,
 * magic-link sign-in) and by the dashboard pages' own role guards, so a
 * user can never end up on the wrong role's dashboard. Previously each
 * sign-in path carried its own copy of this mapping; the magic-link path
 * was missing it and hardcoded "/owner", which landed builders on the
 * owner dashboard (builder chrome + owner page = a "hybrid" view).
 *
 * Pure + dependency-free so it's safe to import anywhere (server actions,
 * route handlers, server components, edge).
 */
export function dashboardForRole(role: string | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "builder") return "/builder";
  return "/owner";
}
