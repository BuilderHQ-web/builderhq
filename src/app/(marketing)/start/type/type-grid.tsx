"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ArrowRight, Building2, Home, Hammer, Layers } from "lucide-react";

type ProjectType =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension";

interface Option {
  id: ProjectType;
  title: string;
  copy: string;
  icon: React.ReactNode;
}

const OPTIONS: Option[] = [
  {
    id: "single_dwelling",
    title: "New home",
    copy: "Knock-down rebuild, custom build, or new home on vacant land.",
    icon: <Home size={20} strokeWidth={1.6} className="text-accent-light" />,
  },
  {
    id: "multi_dwelling",
    title: "Multi-dwelling",
    copy: "Two or more dwellings on one site — townhouses, duplex, units.",
    icon: <Building2 size={20} strokeWidth={1.6} className="text-accent-light" />,
  },
  {
    id: "renovation",
    title: "Renovation",
    copy: "Reconfigure or refresh an existing home — kitchen, bath, whole-home.",
    icon: <Hammer size={20} strokeWidth={1.6} className="text-accent-light" />,
  },
  {
    id: "extension",
    title: "Extension",
    copy: "Adding floor area or a new storey to an existing home.",
    icon: <Layers size={20} strokeWidth={1.6} className="text-accent-light" />,
  },
];

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

export function TypeGrid() {
  const router = useRouter();
  const params = useSearchParams();

  const baseQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    return q;
  }, [params]);

  function pick(id: ProjectType) {
    const q = new URLSearchParams(baseQuery);
    q.set("type", id);
    router.push(`/start/contact?${q.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => pick(o.id)}
          className="group relative text-left rounded-2xl border border-border bg-surface-1/40 hover:border-border-accent hover:bg-surface-1/70 transition-colors p-5 sm:p-6 overflow-hidden"
        >
          {/* Hover glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, rgba(0,212,200,0.10), transparent 60%)",
            }}
          />
          <div className="relative flex items-start gap-3.5">
            <span className="mt-0.5 inline-flex items-center justify-center size-9 rounded-lg border border-border-subtle bg-surface-0/60">
              {o.icon}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-ui font-semibold text-text text-[15.5px] tracking-[-0.005em]">
                {o.title}
              </h3>
              <p className="mt-1 text-text-muted text-[12.5px] leading-[1.55] font-body">
                {o.copy}
              </p>
            </div>
            <ArrowRight
              size={16}
              strokeWidth={1.8}
              className="text-text-faint group-hover:text-accent-light group-hover:translate-x-0.5 transition-all duration-200 mt-1"
            />
          </div>
        </button>
      ))}
    </div>
  );
}
