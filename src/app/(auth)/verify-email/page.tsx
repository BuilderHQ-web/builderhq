import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-4">
        <Eyebrow>Verify email</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] leading-none">
          Check your inbox
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted">
          We&apos;ll send a verification link the moment Resend is wired up in Phase 1.
        </p>
        <div className="pt-2"><Badge variant="accent">Phase 1 · auth</Badge></div>
      </CardContent>
    </Card>
  );
}
