import { ResetForm } from "./reset-form";

export const metadata = { title: "Set new password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display uppercase tracking-[-0.02em] text-[44px] sm:text-[52px] leading-[0.92] text-text">
          Set new password
        </h1>
        <p className="text-[15px] leading-[24px] text-text-muted">
          Choose a new password. You&apos;ll be signed out of this device after — log in again with the new one.
        </p>
      </div>

      <ResetForm token={token} />
    </div>
  );
}
