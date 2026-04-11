interface MatchBadgeProps {
  score: number
  label: string
  color?: string   // legacy, unused
  bgColor?: string // legacy, unused
  size?: "sm" | "md"
}

/**
 * Renders the match score as a rubber-stamp style badge in keeping with
 * the "Die Bewerbungsmappe" skeuomorphic system.
 */
export default function MatchBadge({
  score,
  label,
  size = "md",
}: MatchBadgeProps) {
  const variant =
    score >= 75
      ? "amtlich-stamp--green"
      : score >= 60
      ? "amtlich-stamp--blue"
      : ""

  const style: React.CSSProperties = {
    transform: `rotate(${score % 2 === 0 ? -2 : 2}deg)`,
    fontSize: size === "sm" ? "0.62rem" : "0.7rem",
    padding: size === "sm" ? "4px 10px" : "6px 14px",
  }

  return (
    <span className={`amtlich-stamp ${variant}`} style={style}>
      <span>{score}</span>
      <span className="hidden sm:inline"> · {label}</span>
    </span>
  )
}
