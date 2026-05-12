import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { TypePicker } from "./type-picker";

export const metadata = { title: "Upload a project" };

/**
 * The wizard's entry point. Owner picks a project type — that's the
 * one decision we need to set up the right field set. We create a
 * draft row immediately and redirect to /owner/projects/[slug]/edit
 * where the rest of the wizard lives.
 */
export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/owner/projects/new");

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-8 sm:mb-10">
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
            Upload a project · Step 1 of 2
          </span>
          <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[32px] sm:text-[44px] leading-[0.92] text-text">
            What are you building?
          </h1>
          <p className="mt-4 max-w-[60ch] text-[14px] leading-[1.7] text-text-subtle">
            Pick a type — we&apos;ll show you only the fields that
            matter. You can change this later while the project is
            still a draft.
          </p>
        </div>

        <TypePicker />
      </div>
    </div>
  );
}
