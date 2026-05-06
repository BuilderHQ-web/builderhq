import { Eyebrow } from "@/components/brand/section";
import { Card, CardContent } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Set new password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Card>
      <CardContent className="p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Eyebrow>Reset password</Eyebrow>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] leading-none">
            Set new password
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            Choose a new password. You&apos;ll be signed out of this device after — log in again with the new one.
          </p>
        </div>
        <ResetForm token={token} />
      </CardContent>
    </Card>
  );
}
