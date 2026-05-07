import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display uppercase tracking-[-0.02em] text-[44px] sm:text-[52px] leading-[0.92] text-text">
          Create account
        </h1>
        <p className="text-[15px] leading-[24px] text-text-muted">
          Free to join. Verify your email and start uploading or browsing projects in minutes.
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
