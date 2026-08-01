import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { label, parseSpreadParams } from "@/lib/og";

export const runtime = "edge";

// Card is deterministic from params (no live fetch) → cache hard so
// yesterday's tweeted card never mutates.
const CACHE = "public, immutable, no-transform, max-age=86400";

export async function GET(req: NextRequest) {
  const p = parseSpreadParams(req.nextUrl.searchParams);
  if (!p) return new Response("bad params", { status: 400 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07090c",
          padding: 64,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#f2f7f7", fontWeight: 700 }}>
            chain<span style={{ color: "#5eead4" }}>match</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#8b9498" }}>
            funding spread · live
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 44, color: "#f2f7f7", fontWeight: 700 }}>
            {p.asset}
          </div>
          <div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: "#5eead4" }}>
            {p.apy.toFixed(1)}% APY
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 28 }}>
            <span
              style={{
                display: "flex",
                background: "#ffc8c8",
                color: "#b8001c",
                padding: "6px 14px",
                borderRadius: 4,
              }}
            >
              short {label(p.venueA)}
            </span>
            <span
              style={{
                display: "flex",
                background: "#86ffcc",
                color: "#007239",
                padding: "6px 14px",
                borderRadius: 4,
              }}
            >
              long {label(p.venueB)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 24, color: "#8b9498" }}>
            market-neutral · zero price exposure · collect the spread
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#5eead4" }}>
            chainmatch.ai/rates
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": CACHE },
    },
  );
}
