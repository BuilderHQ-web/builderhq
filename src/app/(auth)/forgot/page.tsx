import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-4">
        <Eyebrow>Reset password</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] leading-none">
          Forgot password
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted">
          Email-based password reset arrives in Phase 1.
        </p>
        <div className="pt-2"><Badge variant="accent">Phase 1 · auth</Badge></div>
      </CardContent>
    </Card>
  );
}
