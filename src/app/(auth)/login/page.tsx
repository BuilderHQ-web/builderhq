import { Suspense } from "react";
import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow>Log in</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] leading-none">
            Welcome back
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            Log in to manage your projects, builders, and tenders.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
