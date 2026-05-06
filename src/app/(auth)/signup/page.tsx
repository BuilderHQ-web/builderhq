import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <Card className="relative">
      <CardContent className="p-8 flex flex-col gap-4">
        <Eyebrow>Get started</Eyebrow>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] leading-none">
          Create account
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted">
          Role selection (project owner / builder), email verification, and onboarding land in Phase 1.
        </p>
        <div className="pt-2">
          <Badge variant="accent">Phase 1 · auth</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
