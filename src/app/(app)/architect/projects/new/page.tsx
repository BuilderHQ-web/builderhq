import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { ProjectStart } from "../../../owner/projects/new/project-start";

export const metadata = { title: "New tender" };

/**
 * The architect's tender entry point — the same proven start flow the
 * owner wizard uses (AI plan read or manual), reused rather than
 * forked: the architect is the project's runner, so every downstream
 * action is ownership-gated and just works. Mode + spots + invites are
 * chosen in the wizard (P2).
 */
export default async function ArchitectNewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/architect/projects/new");
  const role = session.user.role ?? null;
  if (role !== "architect") redirect(dashboardForRole(role));

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-[760px]">
        <ProjectStart />
      </div>
    </div>
  );
}
