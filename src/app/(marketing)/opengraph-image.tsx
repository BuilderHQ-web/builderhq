import { ImageResponse } from "next/og";

/**
 * Default share card for the marketing site. Any marketing page that
 * does not ship its own opengraph-image (partner profiles, Build Brief
 * issues do) falls back to this branded card instead of a bare title.
 */
export const alt =
  "BuilderHQ — Australia's residential tender platform. Upload once, compare like for like, build.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f4f1ea";
const INK = "#171d23";
const TEAL = "#0a7d73";
const TEAL_BRIGHT = "#00b6ac";
const MUTE = "#7c8791";

export default function Image() {
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "9999px",
              background: TEAL_BRIGHT,
            }}
          />
          <div style={{ fontSize: "34px", fontWeight: 700, color: INK }}>
            BuilderHQ
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          <div
            style={{
              fontSize: "26px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: TEAL,
              fontWeight: 600,
            }}
          >
            Australia's Residential Tender Platform
          </div>
          <div
            style={{
              fontSize: "78px",
              fontWeight: 700,
              color: INK,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              maxWidth: "980px",
            }}
          >
            Upload once. Compare like for like. Build.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "26px",
            color: MUTE,
          }}
        >
          <div style={{ display: "flex" }}>builderhq.com.au</div>
          <div style={{ display: "flex" }}>
            Up to three verified builders. The same scope.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
