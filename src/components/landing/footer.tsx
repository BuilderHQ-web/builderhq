import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Footer — simple single-row layout. Logo on the left, link list in
 * the middle, copyright on the right. Stacks gracefully on mobile.
 * Modelled directly on the original landing's footer.
 */
export function Footer() {
  return (
    <footer className="relative border-t border-border-subtle bg-bg-deep/70 px-6 md:px-10 py-7">
      {/* 3-col grid keeps the link block dead-centre on the page width
          regardless of how wide the logo or copyright become. Stacks
          to single column on mobile. */}
      <div className="mx-auto max-w-[1320px] grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center md:justify-self-start">
          <Logo height={24} />
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-[12px] tracking-[0.04em] text-text-dim">
          <Link href="/about" className="hover:text-accent-light transition-colors">
            About
          </Link>
          <Link href="/privacy" className="hover:text-accent-light transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-accent-light transition-colors">
            Terms
          </Link>
          <Link href="/faq" className="hover:text-accent-light transition-colors">
            FAQ
          </Link>
        </nav>

        <p className="text-[11px] tracking-[0.18em] uppercase text-text-dim/70 md:justify-self-end">
          © {new Date().getFullYear()} BuilderHQ · Australia
        </p>
      </div>
    </footer>
  );
}
