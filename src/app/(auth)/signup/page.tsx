import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow>Get started</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] leading-none">
            Create your account
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            Free to join. Verify your email and start uploading or browsing
            residential projects in minutes.
          </p>
        </div>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
