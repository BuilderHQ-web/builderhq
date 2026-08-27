import { ImageResponse } from "next/og";

import { getPartner, PARTNERS, type PartnerKind } from "../partners-data";

/**
 * Per-partner share card: the partner's name, discipline and location
 * on a branded BuilderHQ ground, with the Google rating when we hold
 * one. This is what appears when a profile is shared or surfaced by an
 * answer engine, rather than a bare page title.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return PARTNERS.filter((p) => !p.draft).map((p) => ({ slug: p.slug }));
}

export function generateImageMetadata({ params }: { params: { slug: string } }) {
  const partner = getPartner(params.slug);
  return [
    {
      id: "card",
      alt: partner ? `${partner.name} · BuilderHQ Preferred Partner` : "BuilderHQ",
      size,
      contentType,
    },
  ];
}

const CREAM = "#f4f1ea";
const INK = "#171d23";
const TEAL = "#0a7d73";
const TEAL_BRIGHT = "#00b6ac";
const MUTE = "#7c8791";
const GOLD = "#c99422";

const KIND_LABEL: Record<PartnerKind, string> = {
  architect: "Building designer",
  builder: "Builder",
  finance: "Finance broker",
  conveyancer: "Conveyancer",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = getPartner(slug);

  const role = partner?.roleLabel ?? (partner ? KIND_LABEL[partner.kind] : "");
  const location = partner ? `${partner.suburb}, ${partner.state}` : "";
  const name = partner?.name ?? "BuilderHQ";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CREAM,
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "24px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: TEAL,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "9999px",
              background: TEAL_BRIGHT,
            }}
          />
          <div style={{ display: "flex" }}>
            Preferred Partner{role ? ` · ${role}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div
            style={{
              fontSize: name.length > 22 ? "72px" : "88px",
              fontWeight: 700,
              color: INK,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              maxWidth: "1000px",
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              fontSize: "32px",
              color: MUTE,
            }}
          >
            {location ? <div style={{ display: "flex" }}>{location}</div> : null}
            {partner?.google ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: 600,
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill={GOLD}>
                  <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.783 1.401 8.168L12 18.896l-7.335 3.855 1.401-8.168L.132 9.21l8.2-1.192z" />
                </svg>
                <div style={{ display: "flex", color: INK }}>
                  {partner.google.rating.toFixed(1)}
                </div>
                <div style={{ display: "flex", color: MUTE, fontWeight: 400 }}>
                  {partner.google.reviews} reviews
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            color: MUTE,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontWeight: 700, color: INK }}>BuilderHQ</div>
            <div style={{ display: "flex" }}>· Preferred Partner Register</div>
          </div>
          <div style={{ display: "flex" }}>builderhq.com.au</div>
        </div>
      </div>
    ),
    size,
  );
}
