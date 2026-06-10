"use client";

/**
 * Sticky header for /owneradvisory. Transparent over the hero, then a
 * clean glass underlay (backdrop blur + a single hairline) once the
 * page is scrolled. Mirrors the landing nav's behaviour in a lighter,
 * single-purpose form.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

type Styles = Readonly<Record<string, string>>;

export function OwnerAdvisoryNav({ styles: s }: { styles: Styles }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${s.nav} ${scrolled ? s.navScrolled : ""}`}>
      <div className={s.navInner}>
        <Link
          href="https://builderhq.com.au"
          className={s.brand}
          aria-label="BuilderHQ home"
        >
          <Logo height={24} />
        </Link>
        <div className={s.navMeta}>
          <span className={s.navMetaDot} aria-hidden />
          Owner Advisory
        </div>
      </div>
    </nav>
  );
}
