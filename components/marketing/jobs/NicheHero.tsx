interface NicheHeroProps {
  niche: "nursing" | "engineering" | "student-jobs"
  jobCount: number
  lastUpdated: string | null
}

const NICHE_CONFIG: Record<string, { title: string; highlight: string; subtitle: string; gradient: string }> = {
  nursing: {
    title: "Nursing Jobs in",
    highlight: "Germany",
    subtitle: "Browse real nursing & healthcare positions from German hospitals. Plan Beta handles your complete journey: German training → Anerkennung → placement.",
    gradient: "from-rose-500/[0.08] via-transparent to-transparent",
  },
  engineering: {
    title: "Engineering Jobs in",
    highlight: "Germany",
    subtitle: "Find mechanical, electrical, IT, and software engineering positions across Germany. Blue Card eligible roles with visa sponsorship.",
    gradient: "from-blue-500/[0.08] via-transparent to-transparent",
  },
  "student-jobs": {
    title: "Student Jobs in",
    highlight: "Germany",
    subtitle: "Werkstudent positions, mini-jobs, and part-time work for international students. Better German = better opportunities.",
    gradient: "from-emerald-500/[0.08] via-transparent to-transparent",
  },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function NicheHero({ niche, jobCount, lastUpdated }: NicheHeroProps) {
  const config = NICHE_CONFIG[niche]
  if (!config) return null

  return (
    <section className="relative pt-32 pb-16 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-b ${config.gradient}`} />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <nav className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
          <a href="/jobs" className="hover:text-white transition-colors">Jobs</a>
          <span>/</span>
          <span className="text-white">{niche === "student-jobs" ? "Student Jobs" : niche.charAt(0).toUpperCase() + niche.slice(1)}</span>
        </nav>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
          {config.title}{" "}
          <span className="bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">
            {config.highlight}
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
          {config.subtitle}
        </p>
        {jobCount > 0 && (
          <p className="text-sm text-gray-500">
            {jobCount} active job{jobCount !== 1 ? "s" : ""}
            {lastUpdated && <> &middot; Updated {formatDate(lastUpdated)}</>}
          </p>
        )}
      </div>
    </section>
  )
}
