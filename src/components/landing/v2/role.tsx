"use client";

/**
 * The marketing motion boundary.
 *
 * This file used to hold the role lens state. The lens system is gone:
 * one page, one voice, three dedicated pages under /for. What remains
 * is the one thing the provider was quietly also doing, which every
 * marketing surface still needs: honouring the reader's reduced motion
 * setting for every Motion component beneath it.
 *
 * `RoleProvider` survives as a deprecated alias because two call sites
 * outside this folder still wrap their chrome in it (page-shell.tsx and
 * build-brief/brief-ui.tsx). Point those at `MarketingMotion` and this
 * file can be renamed.
 */

import { MotionConfig } from "motion/react";

export function MarketingMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** @deprecated Use `MarketingMotion`. Kept so existing imports resolve. */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  return <MarketingMotion>{children}</MarketingMotion>;
}
