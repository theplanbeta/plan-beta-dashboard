import Link from "next/link"
import { prisma } from "@/lib/prisma"

const NICHE_PROFESSIONS: Record<string, string[]> = {
  nursing: ["Nursing", "Healthcare"],
  engineering: ["Engineering", "IT"],
  "student-jobs": ["Student Jobs", "Hospitality"],
}

const NICHES = [
  {
    slug: "nursing",
    title: "Nursing & Healthcare",
    description: "Hospital, clinic, and elderly care positions. Plan Beta handles your full journey: German training, Anerkennung, and hospital placement.",
    gradient: "from-rose-500/20 to-rose-500/5",
    border: "hover:border-rose-500/30",
    icon: (
      <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    cta: "Browse Nursing Jobs",
  },
  {
    slug: "engineering",
    title: "Engineering & IT",
    description: "Mechanical, electrical, software, and IT engineering positions. Blue Card eligible roles with visa sponsorship.",
    gradient: "from-blue-500/20 to-blue-500/5",
    border: "hover:border-blue-500/30",
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.58 3.05a.9.9 0 01-1.27-.8V7.57a.9.9 0 01.46-.79l5.58-3.05a.9.9 0 01.82 0l5.58 3.05a.9.9 0 01.46.79v10.05a.9.9 0 01-1.27.8l-5.58-3.05a.9.9 0 00-.82 0z" />
      </svg>
    ),
    cta: "Browse Engineering Jobs",
  },
  {
    slug: "student-jobs",
    title: "Student Jobs",
    description: "Werkstudent positions, mini-jobs, and part-time work for international students in Germany.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "hover:border-emerald-500/30",
    icon: (
      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    cta: "Browse Student Jobs",
  },
  {
    slug: "india",
    title: "From India to Germany",
    description: "Everything you need to know about working in Germany as an Indian professional. Salary guides, visa pathways, and more.",
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "hover:border-amber-500/30",
    icon: (
      <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    cta: "Explore Pathways",
  },
]

async function getNicheCounts(): Promise<Record<string, number>> {
  try {
    const counts: Record<string, number> = {}
    await Promise.all(
      Object.entries(NICHE_PROFESSIONS).map(async ([niche, professions]) => {
        counts[niche] = await prisma.jobPosting.count({
          where: { active: true, profession: { in: professions } },
        })
      })
    )
    counts.total = await prisma.jobPosting.count({ where: { active: true } })
    return counts
  } catch {
    return { nursing: 0, engineering: 0, "student-jobs": 0, total: 0 }
  }
}

export default async function JobsHubPage() {
  const counts = await getNicheCounts()

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.06] via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
            Find Your Job in{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Germany
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            Browse real job listings from German employers. Nursing, engineering, IT, student jobs &mdash; all in one place.
          </p>
          {counts.total > 0 && (
            <p className="text-sm text-gray-500">
              {counts.total} active jobs across Germany
            </p>
          )}
        </div>
      </section>

      {/* Niche Cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {NICHES.map((niche) => {
            const count = counts[niche.slug] || 0
            return (
              <Link
                key={niche.slug}
                href={`/jobs/${niche.slug}`}
                className={`group bg-gradient-to-br ${niche.gradient} border border-white/[0.06] ${niche.border} rounded-2xl p-8 transition-all hover:shadow-lg`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 p-3 bg-white/5 rounded-xl">
                    {niche.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                      {niche.title}
                    </h2>
                    {count > 0 && (
                      <span className="text-sm text-gray-500">
                        {count} active job{count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-6">
                  {niche.description}
                </p>
                <span className="inline-flex items-center gap-2 text-sm text-primary font-medium group-hover:gap-3 transition-all">
                  {niche.cta}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Bottom CTAs */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SpotAJob */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 bg-emerald-500/10 rounded-full mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">SpotAJob</h3>
            <p className="text-gray-400 text-sm mb-6">
              In Germany? Photograph job postings you see at supermarkets, notice boards, shop windows. Our AI extracts the details automatically.
            </p>
            <Link
              href="/spot-a-job"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
            >
              Spot a Job
            </Link>
          </div>

          {/* Eligibility */}
          <div className="bg-gradient-to-br from-primary/10 to-rose-500/10 border border-primary/20 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Check Your Eligibility</h3>
            <p className="text-gray-400 text-sm mb-6">
              Find out which pathway suits you best &mdash; Blue Card, skilled worker visa, Ausbildung, or job seeker visa.
            </p>
            <Link
              href="/germany-pathway"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
            >
              Start Pathway Checker
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
