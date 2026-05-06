import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { verifyEmail } from "@/modules/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Verify email" };
// Verification flips a DB row — never cache.
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
      <Card>
        <CardContent className="p-8 flex flex-col gap-6 items-start">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-success-muted border border-[oklch(0.78_0.16_155/0.30)] text-success">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="flex flex-col gap-3">
            <Eyebrow>Email verified</Eyebrow>
            <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] leading-none">
              You&apos;re in
            </h1>
            <p className="text-[14px] leading-[22px] text-text-muted">
              Your account is active. Log in to start using BuilderHQ.
            </p>
          </div>
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            Log in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6 items-start">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-danger-muted border border-[rgba(255,80,80,0.30)] text-danger">
          <XCircle className="size-5" />
        </div>
        <div className="flex flex-col gap-3">
          <Eyebrow>Verification failed</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[32px] leading-none">
            We couldn&apos;t verify
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            {result.error.message}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Log in
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "lg", variant: "ghost" })}>
            Sign up again
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
