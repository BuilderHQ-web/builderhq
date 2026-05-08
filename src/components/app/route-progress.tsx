"use client";

/**
 * Route progress bar.
 *
 * A 2px teal bar that fills across the top of the viewport while a
 * navigation is in flight. Hand-rolled because the default Next.js
 * "loading.tsx" feedback only fires for actual streaming suspends —
 * client-side route changes feel instant but blank for a moment, and
 * the progress bar bridges that gap.
 *
 * Implementation notes:
 *
 *   - We listen to <a> + <Link> clicks at the document level, then
 *     watch for the URL to change. The bar slides from 0 → 80% over a
 *     short interval, then hits 100% and fades out once the new path
 *     mounts. This avoids needing any deeper Next 16 integration.
 *
 *   - We also fire on usePathname / useSearchParams changes that don't
 *     come from a click (router.push, browser back, etc.) by watching
 *     for path/search changes that the click-handler didn't initiate.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const stoppedRef = useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    interval: ReturnType<typeof setInterval> | null;
  }>({ timeout: null, interval: null });
  const lastKey = useRef(`${pathname}?${search.toString()}`);

  // Cleanup any in-flight handles when we re-arm or unmount.
  const clearTimers = () => {
    if (stoppedRef.current.timeout) clearTimeout(stoppedRef.current.timeout);
    if (stoppedRef.current.interval) clearInterval(stoppedRef.current.interval);
    stoppedRef.current.timeout = null;
    stoppedRef.current.interval = null;
  };

  // Begin the bar — climbs to ~80% over ~600ms, then idles waiting for
  // the new route to mount.
  const start = () => {
    clearTimers();
    setProgress(8);
    stoppedRef.current.interval = setInterval(() => {
      setProgress((p) => {
        if (p == null) return p;
        if (p < 80) return Math.min(80, p + Math.max(2, (80 - p) * 0.12));
        return p;
      });
    }, 80);
  };

  // Finish the bar — snap to 100, fade out shortly after.
  const finish = () => {
    clearTimers();
    setProgress(100);
    stoppedRef.current.timeout = setTimeout(() => setProgress(null), 250);
  };

  // Listen for clicks on internal links — that's our trigger.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Ignore modifier-clicks (open in new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      // External, mail, anchor — skip.
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#")
      ) {
        return;
      }
      const targetAttr = link.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;
      // Same path? still fire briefly for the visual feedback.
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  // Whenever pathname or search actually changes, finish the bar (or
  // briefly flash it for programmatic navigations the click-handler
  // never saw).
  useEffect(() => {
    const key = `${pathname}?${search.toString()}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (progress == null) {
      // Programmatic nav — flash a quick run.
      setProgress(70);
      stoppedRef.current.timeout = setTimeout(() => finish(), 80);
    } else {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return (
    <AnimatePresence>
      {progress != null ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed top-0 left-0 right-0 z-[200] pointer-events-none h-[2px]"
        >
          <div
            className="h-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.6)]"
            style={{
              width: `${progress}%`,
              transition: "width 200ms cubic-bezier(0.2, 0.65, 0.3, 0.9)",
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
