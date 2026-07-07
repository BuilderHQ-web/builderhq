"use client";

/**
 * Role lens state + the dock-flight orchestration.
 *
 *   · Default lens is homeowner: the page is complete and persuasive
 *     with zero interaction (ad traffic never meets a gate).
 *   · Picking a role from the selector flies the role word up to the
 *     header (see flying-label.tsx) and, on landing, docks it. Switching
 *     from the header dropdown re-tunes without a flight (the label is
 *     already up there).
 *   · Choice persists in localStorage; a switch scrolls to the top so
 *     the page re-forms under the docking label.
 */

import * as React from "react";
import { MotionConfig } from "motion/react";

import type { Role } from "./content";
import { ROLE_ORDER } from "./content";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "bhq_role";

export interface FlightFrom {
  left: number;
  top: number;
  fontSize: number;
}

interface RoleState {
  role: Role;
  docked: boolean;
  /** Active flight, consumed by <FlyingLabel/>. */
  flight: { role: Role; from: FlightFrom } | null;
  /** Header dropdown / mobile switch — re-tune, no flight. */
  setRole: (role: Role) => void;
  /** Selector cards — re-tune and fly the word up to dock. */
  flyToDock: (role: Role, from: FlightFrom) => void;
  /** Called by <FlyingLabel/> when the word lands. */
  completeFlight: () => void;
}

const RoleContext = React.createContext<RoleState | null>(null);

export function useRole(): RoleState {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside <RoleProvider>");
  return ctx;
}

export function RoleProvider({
  initialRole = "homeowner",
  initialDocked = false,
  children,
}: {
  initialRole?: Role;
  initialDocked?: boolean;
  children: React.ReactNode;
}) {
  const [role, setRoleState] = React.useState<Role>(initialRole);
  const [docked, setDocked] = React.useState(initialDocked);
  const [flight, setFlight] = React.useState<{ role: Role; from: FlightFrom } | null>(null);

  const applyRole = React.useCallback((next: Role) => {
    setRoleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-blocking */
    }
    if (typeof window !== "undefined" && window.scrollY > 120) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }, 140);
    }
  }, []);

  const setRole = React.useCallback(
    (next: Role) => {
      applyRole(next);
      setDocked(true);
      track("lens_selected", { role: next, source: "nav" });
    },
    [applyRole],
  );

  const flyToDock = React.useCallback(
    (next: Role, from: FlightFrom) => {
      applyRole(next);
      track("lens_selected", { role: next, source: "selector" });
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Reduced motion: skip the flight, just dock. Otherwise fly EVERY
      // time — including when already docked — so re-picking from the
      // cards always lifts the new word up to the header (the dock label
      // hides itself while a flight is in progress, so there's no double).
      if (reduce) {
        setDocked(true);
        return;
      }
      setFlight({ role: next, from });
    },
    [applyRole],
  );

  const completeFlight = React.useCallback(() => {
    setDocked(true);
    setFlight(null);
  }, []);

  // Restore a remembered lens (returning visitors), deferred a frame so
  // first paint is the SSR default and the re-tune animates visibly.
  React.useEffect(() => {
    if (initialDocked) return;
    let raf = 0;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored && stored !== initialRole && ROLE_ORDER.includes(stored)) {
        raf = requestAnimationFrame(() => {
          setRoleState(stored);
          setDocked(true);
        });
      }
    } catch {
      /* private mode — default is fine */
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = React.useMemo(
    () => ({ role, docked, flight, setRole, flyToDock, completeFlight }),
    [role, docked, flight, setRole, flyToDock, completeFlight],
  );

  return (
    <RoleContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </RoleContext.Provider>
  );
}
