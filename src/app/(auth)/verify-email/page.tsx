import Link from "next/link";
import { Mail } from "lucide-react";

import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-accent-muted border border-border-accent text-accent">
            <Mail className="size-5" />
          </div>
          <Eyebrow>Almost there</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] leading-none">
            Check your inbox
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            {email
              ? <>We sent a verification link to <span className="text-text">{email}</span>. Click it within the next 24 hours to activate your account.</>
              : <>We sent you a verification link. Click it within the next 24 hours to activate your account.</>}
          </p>
        </div>

        <div className="rounded-tight border border-border-subtle bg-surface-1 p-4 flex flex-col gap-2">
          <p className="text-[12px] tracking-[0.04em] uppercase text-text-dim">
            Not seeing it?
          </p>
          <ul className="text-[13px] leading-[22px] text-text-muted list-disc pl-5 space-y-1">
            <li>Check your spam / junk folder.</li>
            <li>Wait 60 seconds — first emails sometimes route slowly.</li>
            <li>Make sure the address you signed up with is correct.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between text-[12px] text-text-dim">
          <Link href="/signup" className="hover:text-accent-light underline-offset-4 hover:underline">
            Wrong email? Sign up again
          </Link>
          <Link href="/login" className="hover:text-accent-light underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
