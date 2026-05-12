import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[52px] leading-[0.92] text-text">
          Forgot password
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted">
          Enter the email you signed up with. We&apos;ll send you a link to set a new password.
        </p>
      </div>

      <ForgotForm />
    </div>
  );
}
