import * as React from "react";

import { Logo } from "@/components/brand/logo";

import {
  AUTH_HEADING_CLS,
  AUTH_SUBTITLE_CLS,
} from "../_lib/auth-styles";

/**
 * Shared brand + heading group for every auth page.
 *
 *   ⬢  centred wordmark
 *   ⬢  large heading (Space Grotesk semibold, mixed-case)
 *   ⬢  optional subtitle / supporting paragraph
 *
 * Pages render their own form content below this header inside the
 * shared `AUTH_CONTAINER_CLS` rhythm.
 */
export function AuthHeader({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <>
      <Logo height={25} tone="dark" className="mb-1" />
      <div className="flex flex-col gap-2.5">
        <h1 className={AUTH_HEADING_CLS}>{title}</h1>
        {subtitle ? <p className={AUTH_SUBTITLE_CLS}>{subtitle}</p> : null}
      </div>
    </>
  );
}

/**
 * Renders the BuilderHQ wordmark with `HQ` bolded — the brand
 * convention for inline references inside a heading.
 *
 *   "Log in to <BrandWord />"
 *   "Welcome back to <BrandWord />"
 */
export function BrandWord() {
  return (
    <>
      Builder<span className="font-extrabold">HQ</span>
    </>
  );
}
