"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Logo } from "@/components/brand/logo";

/**
 * Footer — Resend-style scroll-revealed giant brand mark. The logo
 * fades + lifts into view as the footer enters the viewport. On
 * hover, a slow teal shimmer passes across it.
 */
export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.45, 1], [0, 0.55, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [40, 0]);

  return (
    <footer
      ref={ref}
      className="relative border-t border-border-subtle bg-bg-deep/70 px-6 md:px-10 pt-16 pb-10 overflow-hidden"
    >
      <div className="mx-auto max-w-[1320px]">
        {/* Top row — links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <FooterColumn title="Product">
            <FooterLink href="#features">Platform</FooterLink>
            <FooterLink href="#how">How it works</FooterLink>
            <FooterLink href="#showcase">Showcase</FooterLink>
          </FooterColumn>
          <FooterColumn title="Owners">
            <FooterLink href="#owners">For owners</FooterLink>
            <FooterLink href="/signup?role=owner">Upload a project</FooterLink>
          </FooterColumn>
          <FooterColumn title="Builders">
            <FooterLink href="#builders">For builders</FooterLink>
            <FooterLink href="/signup?role=builder">Browse projects</FooterLink>
          </FooterColumn>
          <FooterColumn title="Account">
            <FooterLink href="/login">Log in</FooterLink>
            <FooterLink href="/signup">Sign up</FooterLink>
          </FooterColumn>
        </div>

        {/* Giant scroll-reveal mark */}
        <motion.div
          style={{ opacity, y }}
          className="group relative my-8 flex justify-center cursor-default"
        >
          <Logo
            height={120}
            className="opacity-90 group-hover:opacity-100 transition-opacity duration-[600ms]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[800ms]"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, rgba(126,245,237,0.18) 50%, transparent 70%)",
              backgroundSize: "300% 100%",
              animation: "shimmer 3s linear infinite",
              mixBlendMode: "screen",
            }}
          />
        </motion.div>

        {/* Bottom row — fine print */}
        <div className="mt-10 pt-6 border-t border-border-subtle/60 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim/70">
            © {new Date().getFullYear()} BuilderHQ · Made in Australia
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-text-dim">
            <Link href="#" className="hover:text-accent-light transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-accent-light transition-colors">Terms</Link>
            <Link href="mailto:hello@builderhq.com.au" className="hover:text-accent-light transition-colors">
              hello@builderhq.com.au
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9.5px] tracking-[0.22em] uppercase text-accent mb-4">
        {title}
      </div>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isFragment = href.startsWith("#");
  const cls =
    "text-[13px] text-text-muted hover:text-text transition-colors duration-[160ms]";
  return (
    <li>
      {isFragment ? (
        <a href={href} className={cls}>
          {children}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {children}
        </Link>
      )}
    </li>
  );
}
