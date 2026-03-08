import { generatePageMetadata } from "@/lib/seo"
import { TARGET_KEYWORDS } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "How to Get a Job in Germany from India — Complete 2026 Guide | Plan Beta",
  description: "Everything Indian professionals need to know about working in Germany. Salary guides, visa pathways, German language requirements, and step-by-step immigration process.",
  keywords: TARGET_KEYWORDS.indiaJobs,
  path: "/jobs/india",
})

export default function IndiaJobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "How to Get a Job in Germany from India",
            description: "Complete guide for Indian professionals wanting to work in Germany.",
            url: "https://theplanbeta.com/jobs/india",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://theplanbeta.com" },
                { "@type": "ListItem", position: 2, name: "Jobs", item: "https://theplanbeta.com/jobs" },
                { "@type": "ListItem", position: 3, name: "From India", item: "https://theplanbeta.com/jobs/india" },
              ],
            },
            isPartOf: { "@type": "WebSite", name: "Plan Beta", url: "https://theplanbeta.com" },
          }),
        }}
      />
      {children}
    </>
  )
}
