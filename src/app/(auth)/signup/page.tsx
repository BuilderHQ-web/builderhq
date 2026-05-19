import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

type Role = "project_owner" | "builder";

/**
 * Maps the marketing-side ?role=owner|builder shorthand to the DB
 * enum value the form expects. Anything else falls back to
 * project_owner.
 */
function resolveInitialRole(raw: string | undefined): Role {
  if (raw === "builder") return "builder";
  return "project_owner";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = resolveInitialRole(role);

  return <SignupForm initialRole={initialRole} />;
}
