import { ImageResponse } from "next/og"

export const runtime = "edge"

/**
 * Dynamic OG image for Plan Beta Day Zero.
 *
 * 1200 × 630, cream paper, bold red "DAY ZERO" headline with a brass
 * accent line. Served at /og-day-zero.png so it can be referenced
 * from app/jobs-app/layout.tsx's openGraph.images without shipping a
 * static 1200×630 PNG in /public.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          background:
            "linear-gradient(160deg, #FDF9E6 0%, #FBF6E7 40%, #F3E7B8 100%)",
          fontFamily: "serif",
          color: "#141109",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B5134",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 35%, #F5D98A 0%, #D4A547 55%, #7A5516 100%)",
              boxShadow: "0 2px 4px rgba(60,40,20,0.25)",
            }}
          />
          № 00 · Plan Beta Day Zero
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 170,
              fontWeight: 600,
              lineHeight: 0.92,
              color: "#D93A1F",
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            Day Zero.
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 52,
              lineHeight: 1.15,
              color: "#3A2B1C",
              fontStyle: "italic",
              maxWidth: 960,
              display: "flex",
            }}
          >
            Day Zero with us, Day One at work.
          </div>
          <div
            style={{
              marginTop: 36,
              height: 4,
              width: 220,
              background:
                "linear-gradient(90deg, #F5D98A 0%, #D4A547 55%, #7A5516 100%)",
              borderRadius: 2,
              display: "flex",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: "0.12em",
            color: "#6B5134",
            textTransform: "uppercase",
          }}
        >
          <div>The career companion for Germany</div>
          <div>dayzero.xyz</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
