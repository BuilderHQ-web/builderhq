import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { verifyEmail } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { safeInternalPath } from "../../_lib/next-path";

export const metadata = { title: "Verify email" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { token } = await params;
  const next = safeInternalPath((await searchParams).next);
  const result = await verifyEmail(token);

  if (result.ok) {
    return (
      <div className="flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-col gap-3">
          <div className="inline-flex size-10 items-center justify-center rounded-full border border-[oklch(0.78_0.16_155/0.30)] bg-success-muted text-success mb-1">
            <CheckCircle2 className="size-4" />
          </div>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[52px] leading-[0.92] text-text">
            You&apos;re in
          </h1>
          <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted">
            {next
              ? "Your account is active. Log in and we will take you straight back to where you left off."
              : "Your account is active. Log in to start using BuilderHQ."}
          </p>
        </div>
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-fit")}
        >
          Continue to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-3">
        <div className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(255,80,80,0.30)] bg-danger-muted text-danger mb-1">
          <XCircle className="size-4" />
        </div>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] sm:text-[48px] leading-[0.92] text-text">
          We couldn&apos;t verify
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted">{result.error.message}</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto")}>
          Log in
        </Link>
        <Link href="/signup" className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "w-full sm:w-auto")}>
          Sign up again
        </Link>
      </div>
    </div>
  );
}
