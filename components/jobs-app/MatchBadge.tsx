interface MatchBadgeProps {
  score: number
  label: string
  color: string
  bgColor: string
  size?: "sm" | "md"
}

export default function MatchBadge({
  score,
  label,
  color,
  bgColor,
  size = "md",
}: MatchBadgeProps) {
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${padding} ${textSize} ${bgColor} ${color}`}
    >
      <span className="font-bold">{score}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
