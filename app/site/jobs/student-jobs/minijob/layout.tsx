import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Minijob Positions in Germany 2026 — EUR 538/month Tax-Free | Plan Beta",
  description: "Find mini-job positions in Germany for international students. Earn up to EUR 538/month tax-free. Browse real openings across Berlin, Munich, Hamburg and more.",
  path: "/jobs/student-jobs/minijob",
})

export default function MinijobLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Minijob Positions in Germany",
            description: "Find mini-job positions for international students in Germany.",
            url: "https://theplanbeta.com/jobs/student-jobs/minijob",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://theplanbeta.com" },
                { "@type": "ListItem", position: 2, name: "Student Jobs", item: "https://theplanbeta.com/jobs/student-jobs" },
                { "@type": "ListItem", position: 3, name: "Minijob", item: "https://theplanbeta.com/jobs/student-jobs/minijob" },
              ],
            },
          }),
        }}
      />
      {children}
    </>
  )
}
