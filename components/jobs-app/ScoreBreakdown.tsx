"use client"

import type { DeepScoreResult } from "@/lib/jobs-ai"

interface ScoreBreakdownProps {
  deepScore: DeepScoreResult
}

function stampVariant(score: number): string {
  if (score >= 75) return "amtlich-stamp--green"
  if (score >= 60) return "amtlich-stamp--teal"
  return ""
}

function barColor(score: number): string {
  if (score >= 75) return "var(--stamp-green)"
  if (score >= 50) return "var(--stamp-teal)"
  return "var(--brass-shadow)"
}

export function ScoreBreakdown({ deepScore }: ScoreBreakdownProps) {
  return (
    <section className="amtlich-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="mono">AI Analysis</span>
        <span
          className={`amtlich-stamp ${stampVariant(deepScore.overallScore)}`}
          style={{ transform: "rotate(-2deg)" }}
        >
          {deepScore.overallScore}/100
        </span>
      </div>

      <hr className="amtlich-divider" style={{ margin: "14px 0 10px" }} />

      {/* Summary */}
      <p
        className="ink-soft"
        style={{
          fontFamily: "var(--f-body)",
          fontSize: "0.92rem",
          lineHeight: 1.5,
        }}
      >
        {deepScore.summary}
      </p>

      {/* Dimensions */}
      <div className="mt-5 space-y-3.5">
        {deepScore.dimensions.map((dim) => (
          <div key={dim.name}>
            <div className="flex items-center justify-between">
              <span
                className="mono ink-soft"
                style={{
                  fontSize: "var(--fs-mono-xs)",
                  letterSpacing: "0.06em",
                }}
              >
                {dim.name}
              </span>
              <span
                className="display"
                style={{
                  fontSize: "0.95rem",
                  fontVariationSettings: '"opsz" 36, "SOFT" 20, "wght" 560',
                  color: "var(--ink)",
                }}
              >
                {dim.score}
              </span>
            </div>

            {/* Progress bar — ink on paper, not a colored pill */}
            <div
              style={{
                marginTop: "6px",
                height: "3px",
                background: "rgba(140, 102, 24, 0.18)",
                borderRadius: "1px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${dim.score}%`,
                  background: barColor(dim.score),
                  borderRadius: "1px",
                  boxShadow:
                    dim.score >= 75
                      ? "0 0 0 0.5px rgba(47, 122, 58, 0.4)"
                      : "0 0 0 0.5px rgba(12, 107, 107, 0.3)",
                  transition: "width 400ms ease-out",
                }}
              />
            </div>

            <p
              className="ink-faded mt-1.5"
              style={{
                fontFamily: "var(--f-body)",
                fontSize: "0.78rem",
                lineHeight: 1.45,
              }}
            >
              {dim.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Gaps */}
      {deepScore.gaps.length > 0 && (
        <>
          <hr className="amtlich-divider" style={{ margin: "16px 0 10px" }} />
          <span className="mono">Gaps to address</span>
          <ul
            className="mt-2 space-y-1"
            style={{ paddingLeft: 0, listStyle: "none" }}
          >
            {deepScore.gaps.map((gap, i) => (
              <li
                key={i}
                className="flex items-start gap-2"
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "0.82rem",
                  color: "var(--ink-soft)",
                  lineHeight: 1.45,
                }}
              >
                <span
                  className="ink-faded"
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: "0.6rem",
                    minWidth: "16px",
                    paddingTop: "3px",
                  }}
                >
                  —
                </span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default ScoreBreakdown
