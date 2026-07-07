"use client";

/**
 * App scenes — rich, faithful recreations of the real BuilderHQ product,
 * one per spine step per lens. Dark product UI on the light deck cards is
 * deliberate (the Base44 "real screenshot on a clean card" look) and the
 * app itself is teal, so every scene stays teal regardless of the card's
 * role hue — it's a screenshot, not a themed panel.
 *
 * Every label, price, spec band, document category and status here is
 * lifted from the actual components: the browse ProjectCard, the locked
 * project detail + unlock bar ("Exact address · owner contact · N
 * documents", "Unlock for $149", "Secure checkout by Stripe"), the tender
 * composer cost breakdown (real trade names), and the owner tender
 * comparison (KPI tiles, completeness, "Best value"). Architect has no
 * app UI in the product — those three scenes are honest representations
 * of the email/referral program, styled as BuilderHQ network cards.
 */

import * as React from "react";
import {
  Layers,
  Home,
  Building2,
  Bed,
  Bath,
  Ruler,
  Lock,
  FileText,
  MapPin,
  Sparkles,
  Check,
  MessageCircle,
  Bell,
  CreditCard,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Star,
  Send,
  Landmark,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import type { Role } from "./content";
import { LoopToast } from "./mocks";

/* Real product palette (teal app on dark chrome). */
const INK = "#e9f1f9";
const MUT = "#93a6b7";
const DIM = "#617483";
const LINE = "rgba(120,180,255,0.10)";
const CARD = "rgba(255,255,255,0.03)";
const TEAL = "#00d4c8";
const TEALS = "#7ef5ed";
const AMBER = "#ffb547";

/* ── Primitives ─────────────────────────────────────────────────── */

function Frame({
  crumb,
  avatar = "WG",
  children,
  toast,
}: {
  crumb: string;
  avatar?: string;
  children: React.ReactNode;
  toast?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0a1119" }}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo height={16} />
          <span className="text-[11.5px] truncate" style={{ color: DIM }}>/ {crumb}</span>
        </div>
        <span className="size-[26px] rounded-full text-[9.5px] font-bold inline-flex items-center justify-center" style={{ background: "rgba(0,212,200,0.16)", color: TEALS }}>
          {avatar}
        </span>
      </div>
      <div className="relative flex-1 p-4 sm:p-5 overflow-hidden flex flex-col justify-center gap-2.5">
        {children}
      </div>
      {toast}
    </div>
  );
}

function Card({ children, className = "", accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <div
      className={"rounded-lg border " + className}
      style={{
        borderColor: accent ? "rgba(0,212,200,0.30)" : LINE,
        background: accent ? "rgba(0,212,200,0.06)" : CARD,
      }}
    >
      {children}
    </div>
  );
}

function Tile({ v, l, tone }: { v: string; l: string; tone?: "teal" | "amber" }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <p className="font-ui font-semibold text-[17px] leading-none tabular-nums" style={{ color: tone === "amber" ? AMBER : tone === "teal" ? TEALS : INK }}>
        {v}
      </p>
      <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.1em]" style={{ color: DIM }}>{l}</p>
    </div>
  );
}

function Avatar({ txt }: { txt: string }) {
  return (
    <span className="size-8 shrink-0 rounded-lg text-[10.5px] font-bold inline-flex items-center justify-center" style={{ background: "rgba(120,180,255,0.10)", color: MUT }}>
      {txt}
    </span>
  );
}

function Verified() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-[4px] px-1 py-[1px] text-[8.5px] tracking-[0.08em] uppercase font-bold" style={{ background: "rgba(0,212,200,0.12)", color: TEALS }}>
      <ShieldCheck className="size-2.5" strokeWidth={2.6} /> Verified
    </span>
  );
}

function Badge({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "line" | "amber" }) {
  const s =
    tone === "amber"
      ? { border: "rgba(255,181,71,0.4)", bg: "rgba(255,181,71,0.10)", color: AMBER }
      : tone === "line"
        ? { border: LINE, bg: "transparent", color: MUT }
        : { border: "rgba(0,212,200,0.4)", bg: "rgba(0,212,200,0.12)", color: TEALS };
  return (
    <span className="inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-[3px] text-[9px] tracking-[0.08em] uppercase font-bold whitespace-nowrap" style={{ borderColor: s.border, background: s.bg, color: s.color }}>
      {children}
    </span>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <span className="mt-1.5 block h-[4px] w-full rounded-full overflow-hidden" style={{ background: "rgba(120,180,255,0.10)" }}>
      <span className="block h-full rounded-full" style={{ width: pct + "%", background: `linear-gradient(90deg, ${TEAL}, ${TEALS})` }} />
    </span>
  );
}

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: MUT }}>
      <span style={{ color: DIM }}>{icon}</span>
      {children}
    </span>
  );
}

function TealBtn({ children, full = false }: { children: React.ReactNode; full?: boolean }) {
  return (
    <span className={"inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-bold " + (full ? "w-full" : "")} style={{ background: TEAL, color: "#03121a" }}>
      {children}
    </span>
  );
}

/** The real marketplace ProjectCard, miniaturised and faithful. */
function ProjectCard({
  type,
  Icon,
  price,
  budget,
  title,
  loc,
  specs,
  docs,
  spots,
  urgent,
}: {
  type: string;
  Icon: typeof Layers;
  price: string;
  budget: string;
  title: string;
  loc: string;
  specs: { icon: React.ReactNode; t: string }[];
  docs: string;
  spots: string;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: LINE, background: CARD }}>
      <div className="relative h-[74px] overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(126,245,237,0.16), rgba(0,212,200,0.12))" }}>
        <div aria-hidden className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(142,252,244,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <Icon aria-hidden className="absolute -right-3 -bottom-5 size-[92px]" strokeWidth={0.8} style={{ color: "rgba(120,180,255,0.18)" }} />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[4px] border text-[8.5px] tracking-[0.12em] uppercase font-semibold" style={{ borderColor: "rgba(0,212,200,0.35)", background: "rgba(3,9,15,0.62)", color: TEALS }}>
          <Icon className="size-2.5" /> {type}
        </span>
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[4px] border text-[9px] font-bold" style={{ borderColor: "rgba(120,180,255,0.14)", background: "rgba(3,9,15,0.62)", color: MUT }}>
          <Lock className="size-2.5" /> {price}
        </span>
      </div>
      <div className="p-3">
        <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: INK }}>{title}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: MUT }}>
          <MapPin className="size-3" style={{ color: DIM }} /> {loc}
          <span style={{ color: DIM }}>·</span>
          <span className="font-semibold" style={{ color: INK }}>{budget}</span>
        </p>
        <div className="mt-2 flex items-center gap-3">{specs.map((s, i) => <Spec key={i} icon={s.icon}>{s.t}</Spec>)}</div>
        <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between text-[10.5px]" style={{ borderColor: LINE, color: DIM }}>
          <span className="inline-flex items-center gap-1"><FileText className="size-3" /> {docs}</span>
          <span style={{ color: urgent ? AMBER : DIM, fontWeight: urgent ? 700 : 400 }}>{spots}</span>
        </div>
      </div>
    </div>
  );
}

/* ── AppScene router ────────────────────────────────────────────── */

export function AppScene({ role, step }: { role: Role; step: number }) {
  if (role === "homeowner") return <HomeownerScene step={step} />;
  if (role === "builder") return <BuilderScene step={step} />;
  if (role === "architect") return <ArchitectScene step={step} />;
  return <FinanceScene step={step} />;
}

/* ── Homeowner: post → interest → compare → award ───────────────── */

function HomeownerScene({ step }: { step: number }) {
  if (step === 0)
    return (
      <Frame crumb="New project · review" avatar="AV">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold" style={{ color: INK }}>Two-storey family home</p>
          <Badge><Home className="size-2.5" /> Single dwelling</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Spec icon={<Bed className="size-3" />}>4 bed</Spec>
          <Spec icon={<Bath className="size-3" />}>2 bath</Spec>
          <Spec icon={<Building2 className="size-3" />}>2 storeys</Spec>
          <Spec icon={<Ruler className="size-3" />}>Land 600 – 800 m²</Spec>
        </div>
        <Card className="px-3.5 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: DIM }}>Budget · timeline</span>
            <span className="text-[12px] font-semibold" style={{ color: INK }}>$1.2M – $1.5M · start Mar 2027</span>
          </div>
        </Card>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-semibold" style={{ color: INK }}>Documents</span>
          <span className="text-[10.5px]" style={{ color: DIM }}>3 files</span>
        </div>
        <DocRow name="Architectural plans.pdf" cat="Architectural plans" size="2.4 MB" />
        <DocRow name="Structural engineering.pdf" cat="Structural engineering" size="1.1 MB" />
        <Card accent className="flex items-center gap-2.5 px-3.5 py-2.5">
          <Lock className="size-3.5 shrink-0" style={{ color: TEALS }} />
          <p className="text-[11px] leading-snug" style={{ color: MUT }}>Street address stays private until a verified builder unlocks.</p>
        </Card>
        <div className="flex justify-end pt-0.5">
          <TealBtn><Sparkles className="size-3" /> Publish project</TealBtn>
        </div>
      </Frame>
    );

  if (step === 1)
    return (
      <Frame
        crumb="Your project · builders"
        avatar="AV"
        toast={<LoopToast icon={<Bell className="size-3.5" />} text="Southern Cross just unlocked" accent={TEAL} delay={1.7} />}
      >
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[13.5px] font-semibold" style={{ color: INK }}>Verified builders</p>
          <Badge tone="amber">2 of 3 spots open</Badge>
        </div>
        <BuilderRow txt="HH" name="Hartley Homes" sub="Canberra · 14 yrs · 38 tenders" tag="Unlocked" />
        <BuilderRow txt="SC" name="Southern Cross Building" sub="Queanbeyan · 9 yrs · 21 tenders" tag="Unlocked" />
        <BuilderRow txt="BM" name="Brindabella Master Builders" sub="Fyshwick · 22 yrs" tag="Viewing" muted />
        <Card className="flex items-center gap-2.5 px-3.5 py-2.5">
          <ShieldCheck className="size-3.5 shrink-0" style={{ color: TEALS }} />
          <p className="text-[11px] leading-snug" style={{ color: MUT }}>Every builder cleared ABN + licence checks before they appear.</p>
        </Card>
      </Frame>
    );

  if (step === 2)
    return (
      <Frame crumb="Tenders · comparison" avatar="AV">
        <div className="grid grid-cols-3 gap-2">
          <Tile v="3" l="Tenders" />
          <Tile v="$1.28M" l="Median" tone="teal" />
          <Tile v="100%" l="Verified" />
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px]" style={{ color: MUT }}>3 tenders · same scope</span>
          <Badge tone="line">Price · low → high</Badge>
        </div>
        <TenderRow txt="SC" name="Southern Cross" price="$1,240,000" delta="−$44k" wks="38 wks" pct={82} badge="Best value" verified />
        <TenderRow txt="HH" name="Hartley Homes" price="$1,284,000" delta="median" wks="34 wks" pct={91} badge="Fastest" verified highlight />
        <TenderRow txt="BM" name="Brindabella" price="$1,355,000" delta="+$71k" wks="40 wks" pct={74} />
      </Frame>
    );

  return (
    <Frame crumb="Award · Hartley Homes" avatar="AV">
      <Card accent className="p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar txt="HH" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: INK }}>Hartley Homes <Verified /></p>
            <p className="text-[10.5px]" style={{ color: DIM }}>34 weeks · fixed price</p>
          </div>
          <div className="text-right">
            <p className="font-ui font-semibold text-[15px] tabular-nums" style={{ color: TEALS }}>$1,284,000</p>
            <Badge><Trophy className="size-2.5" /> Awarded</Badge>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile v="$0" l="Commission" tone="teal" />
        <Tile v="$0" l="Platform fee" tone="teal" />
      </div>
      <Card className="flex items-center gap-2.5 px-3.5 py-2.5">
        <Check className="size-3.5 shrink-0" strokeWidth={3} style={{ color: TEALS }} />
        <p className="text-[11px] leading-snug" style={{ color: MUT }}>The contract is direct, between you and Hartley Homes.</p>
      </Card>
    </Frame>
  );
}

function DocRow({ name, cat, size }: { name: string; cat: string; size: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2" style={{ borderColor: LINE, background: CARD }}>
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(0,212,200,0.12)", color: TEALS }}>
        <FileText className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-tight truncate" style={{ color: INK }}>{name}</p>
        <p className="text-[10px] leading-tight truncate" style={{ color: DIM }}>{cat}</p>
      </div>
      <span className="text-[10px] tabular-nums" style={{ color: DIM }}>{size}</span>
    </div>
  );
}

function BuilderRow({ txt, name, sub, tag, muted }: { txt: string; name: string; sub: string; tag: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <Avatar txt={txt} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold leading-tight" style={{ color: INK }}>
          {name} {!muted ? <Verified /> : null}
        </p>
        <p className="text-[10.5px] leading-tight truncate" style={{ color: DIM }}>{sub}</p>
      </div>
      <Badge tone={muted ? "line" : "teal"}>{tag}</Badge>
    </div>
  );
}

function TenderRow({ txt, name, price, delta, wks, pct, badge, verified, highlight }: { txt: string; name: string; price: string; delta: string; wks: string; pct: number; badge?: string; verified?: boolean; highlight?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: highlight ? "rgba(0,212,200,0.30)" : LINE, background: highlight ? "rgba(0,212,200,0.06)" : CARD }}>
      <div className="flex items-center gap-2.5">
        <Avatar txt={txt} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold leading-tight" style={{ color: INK }}>
            {name} {verified ? <Verified /> : null}
          </p>
          <p className="text-[10px] leading-tight" style={{ color: DIM }}>{wks} · {pct}% complete</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-ui font-semibold text-[13.5px] tabular-nums leading-none" style={{ color: TEALS }}>{price}</p>
          <p className="text-[9.5px] tabular-nums mt-0.5" style={{ color: DIM }}>{delta}</p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Bar pct={pct} />
        {badge ? <span className="shrink-0"><Badge>{badge}</Badge></span> : null}
      </div>
    </div>
  );
}

/* ── Builder: browse → preview → unlock → tender ────────────────── */

function BuilderScene({ step }: { step: number }) {
  if (step === 0)
    return (
      <Frame
        crumb="Browse projects"
        toast={<LoopToast icon={<Sparkles className="size-3.5" />} text="New match in Deakin ACT" accent={TEAL} delay={1.8} />}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Extension", "ACT", "$500k – $1M"].map((c) => (
            <span key={c} className="rounded-md border px-2 py-[3px] text-[10.5px]" style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.06)", color: TEALS }}>{c}</span>
          ))}
          <span className="rounded-md border px-2 py-[3px] text-[10.5px]" style={{ borderColor: LINE, color: DIM }}>+ Postcode</span>
        </div>
        <ProjectCard
          type="Extension"
          Icon={Layers}
          price="$99"
          budget="$500k – $1M"
          title="Rear extension · Deakin"
          loc="Deakin, ACT 2600"
          specs={[{ icon: <Bed className="size-3" />, t: "4" }, { icon: <Bath className="size-3" />, t: "2" }, { icon: <Ruler className="size-3" />, t: "Build 90 m²" }]}
          docs="8 documents"
          spots="2 of 3 spots"
        />
        <BuilderProjectMini type="Single dwelling" Icon={Home} price="$149" title="New build · Griffith" budget="$1.2M – $1.5M" spots="3 spots" />
      </Frame>
    );

  if (step === 1)
    return (
      <Frame crumb="Deakin extension · preview">
        <div className="flex items-center justify-between">
          <p className="text-[13.5px] font-semibold" style={{ color: INK }}>Rear extension · Deakin</p>
          <Badge tone="line">Preview</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Spec icon={<Bed className="size-3" />}>4 bed</Spec>
          <Spec icon={<Bath className="size-3" />}>2 bath</Spec>
          <Spec icon={<Ruler className="size-3" />}>Land 600 – 800 m²</Spec>
          <Spec icon={<Ruler className="size-3" />}>Build 80 – 120 m²</Spec>
        </div>
        <DocRow name="Architectural plans.pdf" cat="Open before you unlock" size="preview" />
        <DocRow name="Structural engineering.pdf" cat="Open before you unlock" size="preview" />
        <div className="relative">
          <div className="grid grid-cols-2 gap-2.5 select-none" style={{ filter: "blur(4.5px)", opacity: 0.6 }} aria-hidden>
            <Card className="px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: DIM }}>Address</p><p className="text-[12px] mt-1" style={{ color: INK }}>14 Example Street</p></Card>
            <Card className="px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: DIM }}>Owner</p><p className="text-[12px] mt-1" style={{ color: INK }}>J. Robertson</p></Card>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-semibold" style={{ borderColor: "rgba(0,212,200,0.35)", background: "rgba(3,9,15,0.72)", color: TEALS }}>
              <Lock className="size-3" /> Address + owner unlock after payment
            </span>
          </div>
        </div>
      </Frame>
    );

  if (step === 2)
    return (
      <Frame crumb="Unlock · Deakin extension">
        <Card className="p-3.5">
          <p className="text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: DIM }}>What you&apos;ll unlock</p>
          {["Exact street address", "8 documents to download", "Owner’s name + contact", "Direct messaging with the owner", "Submit a tender"].map((t) => (
            <p key={t} className="flex items-center gap-2 py-[3px] text-[11.5px]" style={{ color: MUT }}>
              <Check className="size-3 shrink-0" strokeWidth={3} style={{ color: TEALS }} /> {t}
            </p>
          ))}
        </Card>
        <Card accent className="p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold" style={{ color: INK }}>Unlock this project</p>
            <span className="font-ui font-semibold text-[18px] tabular-nums" style={{ color: TEALS }}>$99</span>
          </div>
          <p className="mt-1 text-[10.5px]" style={{ color: DIM }}>Exact address · owner contact · 8 documents</p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <Badge tone="amber">2 of 3 spots open</Badge>
            <TealBtn><CreditCard className="size-3" /> Unlock for $99</TealBtn>
          </div>
        </Card>
        <p className="px-0.5 text-[10px]" style={{ color: DIM }}>Secure checkout by Stripe · card, Apple Pay &amp; Google Pay. No commission if you win.</p>
      </Frame>
    );

  return (
    <Frame crumb="Tender · Deakin extension">
      <div className="grid grid-cols-3 gap-2">
        <Tile v="$1.28M" l="Total price" tone="teal" />
        <Tile v="34 wks" l="Duration" />
        <Tile v="30 days" l="Valid" />
      </div>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold" style={{ color: INK }}>Cost breakdown</span>
        <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: TEALS }}><Check className="size-2.5" strokeWidth={3} /> Saved</span>
      </div>
      <Card className="overflow-hidden">
        {[
          ["Preliminaries", "$96,000"],
          ["Concrete work", "$168,400"],
          ["Carpentry", "$214,900"],
          ["Roofing", "$71,200"],
          ["Electrical services", "$58,600"],
        ].map(([t, v], i) => (
          <div key={t} className={"flex items-center justify-between px-3.5 py-[7px] " + (i ? "border-t" : "")} style={{ borderColor: LINE }}>
            <span className="text-[11.5px]" style={{ color: MUT }}>{t}</span>
            <span className="text-[11.5px] tabular-nums font-medium" style={{ color: INK }}>{v}</span>
          </div>
        ))}
      </Card>
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[10.5px]" style={{ color: DIM }}>28 trades · same format as every tender</span>
        <TealBtn><Send className="size-3" /> Submit tender</TealBtn>
      </div>
    </Frame>
  );
}

function BuilderProjectMini({ type, Icon, price, title, budget, spots, urgent }: { type: string; Icon: typeof Layers; price: string; title: string; budget: string; spots: string; urgent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(0,212,200,0.10)", color: TEALS }}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: INK }}>{title}</p>
        <p className="text-[10.5px] leading-tight" style={{ color: DIM }}>{type} · {budget}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="inline-flex items-center gap-1 text-[10.5px] font-bold" style={{ color: MUT }}><Lock className="size-2.5" /> {price}</p>
        <p className="text-[9.5px] mt-0.5" style={{ color: urgent ? AMBER : DIM, fontWeight: urgent ? 700 : 400 }}>{spots}</p>
      </div>
    </div>
  );
}

/* ── Architect: invited → featured → referred → market update ─────
   No app UI exists for architects — these represent the email/referral
   program honestly, as BuilderHQ network cards. */

function ArchitectScene({ step }: { step: number }) {
  // 0 · Get featured
  if (step === 0)
    return (
      <Frame crumb="Network · Studio North" avatar="SN">
        <Card accent className="flex items-center gap-2.5 px-3.5 py-3">
          <span className="size-9 shrink-0 rounded-lg text-[12px] font-bold inline-flex items-center justify-center" style={{ background: "rgba(0,212,200,0.14)", color: TEALS }}>SN</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold" style={{ color: INK }}>Studio North Architects</p>
            <p className="text-[10.5px]" style={{ color: DIM }}>Canberra · residential + heritage</p>
          </div>
          <Badge><Star className="size-2.5" /> Partner</Badge>
        </Card>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: LINE }}>
          <div className="relative h-[68px]" style={{ background: "linear-gradient(135deg, rgba(126,245,237,0.14), rgba(0,212,200,0.10))" }}>
            <div aria-hidden className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(142,252,244,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.10) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <span className="absolute bottom-2 left-3 text-[11px] font-semibold" style={{ color: INK }}>Narrabundah courtyard house</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10.5px]" style={{ color: DIM }}>Featured · tagged @studionorth</span>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: TEALS }}><TrendingUp className="size-3" /> 8,200 reached</span>
          </div>
        </div>
      </Frame>
    );

  // 1 · Get referred (the payoff: warm clients arriving)
  if (step === 1)
    return (
      <Frame
        crumb="Referrals · Studio North"
        avatar="SN"
        toast={<LoopToast icon={<Bell className="size-3.5" />} text="New referral · homeowner in Deakin" accent={TEAL} delay={1.6} />}
      >
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[13px] font-semibold" style={{ color: INK }}>Warm referrals</p>
          <Badge>2 new this week</Badge>
        </div>
        <IntroRow label="Homeowner · Deakin" sub="New build · two storey · $1.2M – $1.5M" />
        <IntroRow label="Homeowner · Griffith" sub="Extension · rear addition · $500k – $1M" />
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px]" style={{ color: DIM }}>You choose who to send. Never auto-shared.</span>
          <TealBtn><Send className="size-3" /> Make the introduction</TealBtn>
        </div>
      </Frame>
    );

  // 2 · Stay ahead (market update)
  if (step === 2)
    return (
      <Frame crumb="Market Update · July" avatar="SN">
        <div className="flex items-end justify-between px-1 h-[76px] gap-1.5">
          {[42, 55, 48, 63, 58, 71, 66].map((h, i) => (
            <span key={i} className="flex-1 rounded-t-[3px]" style={{ height: h + "%", background: i === 5 ? TEAL : "rgba(0,212,200,0.28)" }} />
          ))}
        </div>
        <p className="px-1 text-[10.5px]" style={{ color: DIM }}>Residential activity · ACT · last 7 months</p>
        <Card className="overflow-hidden">
          {[
            ["Median build cost", "$1.28M", "+3%"],
            ["Active residential projects", "42", "+11%"],
            ["Avg tenders per project", "2.4", "+0.3"],
          ].map(([l, v, d], i) => (
            <div key={l} className={"flex items-center justify-between px-3.5 py-2 " + (i ? "border-t" : "")} style={{ borderColor: LINE }}>
              <span className="text-[11.5px]" style={{ color: MUT }}>{l}</span>
              <span className="flex items-center gap-2">
                <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="text-[10px] font-semibold" style={{ color: TEALS }}>{d}</span>
              </span>
            </div>
          ))}
        </Card>
      </Frame>
    );

  // 3 · Join the network (free)
  return (
    <Frame crumb="Preferred Architect Network" avatar="SN">
      <Card accent className="p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(0,212,200,0.14)", color: TEALS }}>
            <MessageCircle className="size-4" />
          </span>
          <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: DIM }}>Personal invite · from the BuilderHQ team</p>
        </div>
        <p className="mt-2.5 text-[13px] leading-snug" style={{ color: INK }}>
          “Hi Sarah, we’d love to feature Studio North in the network we point homeowners to.”
        </p>
      </Card>
      <div className="flex gap-1.5">
        {["No fees", "No contracts", "Opt out anytime"].map((c) => (
          <span key={c} className="rounded-md border px-2 py-1 text-[10px]" style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.06)", color: TEALS }}>{c}</span>
        ))}
      </div>
    </Frame>
  );
}

/** Warm referral / introduction row. A ready client arriving; shared by the
 *  architect (referrals) and finance (introductions) scenes. */
function IntroRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: LINE, background: CARD }}>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(0,212,200,0.12)", color: TEALS }}>
        <MapPin className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: INK }}>{label}</p>
        <p className="text-[10.5px] leading-tight truncate" style={{ color: DIM }}>{sub}</p>
      </div>
      <Badge>Good fit</Badge>
    </div>
  );
}

/* Finance broker: listed, introduced, market update, join. No app UI in the
   product (it is the Preferred Finance Partner program), so these are honest
   BuilderHQ network cards, same as the architect lens. */

function FinanceScene({ step }: { step: number }) {
  // 0 · Get listed (directory)
  if (step === 0)
    return (
      <Frame crumb="Directory · Meridian Finance" avatar="MF">
        <Card accent className="flex items-center gap-2.5 px-3.5 py-3">
          <span className="size-9 shrink-0 rounded-lg text-[12px] font-bold inline-flex items-center justify-center" style={{ background: "rgba(0,212,200,0.14)", color: TEALS }}>MF</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold" style={{ color: INK }}>Meridian Finance</p>
            <p className="text-[10.5px]" style={{ color: DIM }}>Canberra · construction + home loans</p>
          </div>
          <Badge><Star className="size-2.5" /> Partner</Badge>
        </Card>
        <div className="flex items-center gap-1.5 flex-wrap px-0.5">
          {["Construction loans", "Refinancing", "First home"].map((c) => (
            <span key={c} className="rounded-md border px-2 py-[3px] text-[10.5px]" style={{ borderColor: LINE, background: CARD, color: MUT }}>{c}</span>
          ))}
        </div>
        <Card className="flex items-center gap-2.5 px-3.5 py-2.5">
          <Landmark className="size-3.5 shrink-0" style={{ color: TEALS }} />
          <p className="text-[11px] leading-snug" style={{ color: MUT }}>Listed in the Preferred Finance Partner directory, seen by homeowners financing a build.</p>
        </Card>
      </Frame>
    );

  // 1 · Get introduced (the payoff: clients ready to finance)
  if (step === 1)
    return (
      <Frame
        crumb="Introductions · Meridian"
        avatar="MF"
        toast={<LoopToast icon={<Bell className="size-3.5" />} text="New introduction · homeowner in Deakin" accent={TEAL} delay={1.6} />}
      >
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[13px] font-semibold" style={{ color: INK }}>Warm introductions</p>
          <Badge>2 new this week</Badge>
        </div>
        <IntroRow label="Homeowner · Deakin" sub="Construction finance · $1.2M – $1.5M build" />
        <IntroRow label="Homeowner · Ainslie" sub="Refinance to fund a build · $500k+" />
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px]" style={{ color: DIM }}>A warm introduction. Never a resold lead.</span>
          <TealBtn><Send className="size-3" /> Make the introduction</TealBtn>
        </div>
      </Frame>
    );

  // 2 · Stay ahead (market update)
  if (step === 2)
    return (
      <Frame crumb="Market Update · July" avatar="MF">
        <div className="flex items-end justify-between px-1 h-[76px] gap-1.5">
          {[44, 52, 49, 60, 58, 73, 68].map((h, i) => (
            <span key={i} className="flex-1 rounded-t-[3px]" style={{ height: h + "%", background: i === 5 ? TEAL : "rgba(0,212,200,0.28)" }} />
          ))}
        </div>
        <p className="px-1 text-[10.5px]" style={{ color: DIM }}>Homeowners financing a build · ACT · last 7 months</p>
        <Card className="overflow-hidden">
          {[
            ["Avg construction loan", "$940k", "+4%"],
            ["Homeowners financing a build", "63", "+12%"],
            ["Median build cost", "$1.28M", "+3%"],
          ].map(([l, v, d], i) => (
            <div key={l} className={"flex items-center justify-between px-3.5 py-2 " + (i ? "border-t" : "")} style={{ borderColor: LINE }}>
              <span className="text-[11.5px]" style={{ color: MUT }}>{l}</span>
              <span className="flex items-center gap-2">
                <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="text-[10px] font-semibold" style={{ color: TEALS }}>{d}</span>
              </span>
            </div>
          ))}
        </Card>
      </Frame>
    );

  // 3 · Join the network (free)
  return (
    <Frame crumb="Preferred Finance Partner" avatar="MF">
      <Card accent className="p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(0,212,200,0.14)", color: TEALS }}>
            <MessageCircle className="size-4" />
          </span>
          <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: DIM }}>Personal invite · from the BuilderHQ team</p>
        </div>
        <p className="mt-2.5 text-[13px] leading-snug" style={{ color: INK }}>
          “Hi Michael, we’d love to include Meridian Finance in the network we point homeowners to for finance.”
        </p>
      </Card>
      <div className="flex gap-1.5">
        {["No cost", "No exclusivity", "Opt out anytime"].map((c) => (
          <span key={c} className="rounded-md border px-2 py-1 text-[10px]" style={{ borderColor: "rgba(0,212,200,0.28)", background: "rgba(0,212,200,0.06)", color: TEALS }}>{c}</span>
        ))}
      </div>
    </Frame>
  );
}
