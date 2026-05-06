import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Card className="relative">
      <CardContent className="p-8 flex flex-col gap-4">
        <Eyebrow>Log in</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] leading-none">
          Welcome back
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted">
          Auth.js + Email/password + Google sign-in arrive in Phase 1. This screen is a placeholder.
        </p>
        <div className="pt-2">
          <Badge variant="accent">Phase 1 · auth</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
