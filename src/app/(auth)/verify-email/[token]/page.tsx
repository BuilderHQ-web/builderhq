import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { verifyEmail } from "@/modules/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Verify email" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmail(token);

  if (result.ok) {
    return (
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <div className="inline-flex size-10 items-center justify-center rounded-full border border-[oklch(0.78_0.16_155/0.30)] bg-success-muted text-success mb-1">
            <CheckCircle2 className="size-4" />
          </div>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[44px] sm:text-[52px] leading-[0.92] text-text">
            You&apos;re in
          </h1>
          <p className="text-[15px] leading-[24px] text-text-muted">
            Your account is active. Log in to start using BuilderHQ.
          </p>
        </div>
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-fit")}>
          Continue to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <div className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(255,80,80,0.30)] bg-danger-muted text-danger mb-1">
          <XCircle className="size-4" />
        </div>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[48px] leading-[0.92] text-text">
          We couldn&apos;t verify
        </h1>
        <p className="text-[15px] leading-[24px] text-text-muted">{result.error.message}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "lg", variant: "ghost" })}>
          Sign up again
        </Link>
      </div>
    </div>
  );
}
