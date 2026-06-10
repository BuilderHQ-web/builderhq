import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { ProjectStart } from "./project-start";

export const metadata = { title: "Upload a project" };

/**
 * The wizard's entry point. Owner chooses how to start - auto-fill from
 * an architectural plan (AI reads it and pre-fills everything), or enter
 * the details by hand. Both converge on /owner/projects/[slug]/edit,
 * where the rest of the wizard lives.
 */
export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/owner/projects/new");

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-[760px]">
        <ProjectStart />
      </div>
    </div>
  );
}
