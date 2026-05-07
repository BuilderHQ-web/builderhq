import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="relative border-t border-border-subtle bg-bg-deep/70 px-6 md:px-10 py-7">
      <div className="mx-auto max-w-[1320px] flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <Logo size={20} />
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] tracking-[0.04em] text-text-dim">
          <Link href="/login" className="hover:text-accent-light transition-colors">Log in</Link>
          <Link href="/signup" className="hover:text-accent-light transition-colors">Sign up</Link>
          <a href="#owners" className="hover:text-accent-light transition-colors">For owners</a>
          <a href="#builders" className="hover:text-accent-light transition-colors">For builders</a>
          <a href="#how" className="hover:text-accent-light transition-colors">How it works</a>
        </div>
        <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim/70">
          © {new Date().getFullYear()} BuilderHQ
        </p>
      </div>
    </footer>
  );
}
