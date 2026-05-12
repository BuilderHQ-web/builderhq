import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

type Role = "project_owner" | "builder";

/**
 * Maps the marketing-side ?role=owner|builder shorthand to the DB enum
 * value the form expects. Anything else falls back to project_owner.
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

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[52px] leading-[0.92] text-text">
          Create account
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted">
          Free to join. Verify your email and start uploading or browsing projects in minutes.
        </p>
      </div>

      <SignupForm initialRole={initialRole} />
    </div>
  );
}
