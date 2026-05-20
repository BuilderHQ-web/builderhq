import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Footer — simple single-row layout. Logo on the left, link list in
 * the middle, copyright on the right. Stacks gracefully on mobile.
 * Modelled directly on the original landing's footer.
 */
export function Footer() {
  return (
    <footer
      className="relative border-t border-border-subtle px-5 md:px-10 pt-9 pb-7"
      style={{
        background: "#03090f",
        paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom))",
      }}
    >
      {/* 3-col grid keeps the link block dead-centre on the page width
          regardless of how wide the logo or copyright become. On
          mobile we stack everything centred so the footer reads as a
          calm, symmetric closer rather than a left-aligned afterthought. */}
      <div className="mx-auto max-w-[1320px] grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 items-center">
        <Link
          href="/"
          aria-label="BuilderHQ home"
          className="inline-flex items-center justify-self-center md:justify-self-start"
        >
          <Logo height={26} />
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-5 sm:gap-x-7 gap-y-1 text-[12.5px] tracking-[0.04em] text-text-muted">
          <Link href="/about" className="inline-flex items-center min-h-11 px-2 hover:text-accent-light transition-colors">
            About
          </Link>
          <Link href="/privacy" className="inline-flex items-center min-h-11 px-2 hover:text-accent-light transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex items-center min-h-11 px-2 hover:text-accent-light transition-colors">
            Terms
          </Link>
          <Link href="/faq" className="inline-flex items-center min-h-11 px-2 hover:text-accent-light transition-colors">
            FAQ
          </Link>
        </nav>

        <p className="text-[10.5px] tracking-[0.2em] uppercase text-text-dim/70 justify-self-center md:justify-self-end text-center md:text-right">
          © {new Date().getFullYear()} BuilderHQ · Australia
        </p>
      </div>
    </footer>
  );
}
