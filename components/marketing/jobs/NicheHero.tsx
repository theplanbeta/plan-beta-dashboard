interface NicheHeroProps {
  niche: "nursing" | "engineering" | "student-jobs"
  jobCount: number
  lastUpdated: string | null
  newJobsToday?: number
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
    subtitle: "A free community initiative by Plan Beta — helping international students find Werkstudent positions, mini-jobs, and part-time work across Germany.",
    gradient: "from-emerald-500/[0.08] via-transparent to-transparent",
  },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function NicheHero({ niche, jobCount, lastUpdated, newJobsToday }: NicheHeroProps) {
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
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
          {config.title}{" "}
          <span className="bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">
            {config.highlight}
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
          {config.subtitle}
        </p>
        {jobCount > 0 && (
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
            <span>{jobCount} active job{jobCount !== 1 ? "s" : ""}</span>
            {newJobsToday && newJobsToday > 0 && (
              <>
                <span>&middot;</span>
                <span className="text-emerald-400 font-medium">{newJobsToday} new today</span>
              </>
            )}
            {lastUpdated && (
              <>
                <span>&middot;</span>
                <span>Updated {formatDate(lastUpdated)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
