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
      <div className="mx-auto max-w-[1320px] flex flex-col md:flex-row gap-5 md:items-center md:justify-between">
        <Link href="/" aria-label="BuilderHQ home" className="inline-flex items-center">
          <Logo height={24} />
        </Link>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] tracking-[0.04em] text-text-dim">
          <Link href="/about" className="hover:text-accent-light transition-colors">
            About
          </Link>
          <Link href="/privacy" className="hover:text-accent-light transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-accent-light transition-colors">
            Terms
          </Link>
          <Link href="/faqs" className="hover:text-accent-light transition-colors">
            FAQs
          </Link>
          <a href="mailto:hello@builderhq.com.au" className="hover:text-accent-light transition-colors">
            hello@builderhq.com.au
          </a>
        </nav>

        <p className="text-[11px] tracking-[0.18em] uppercase text-text-dim/70">
          © {new Date().getFullYear()} BuilderHQ · Australia
        </p>
      </div>
    </footer>
  );
}
