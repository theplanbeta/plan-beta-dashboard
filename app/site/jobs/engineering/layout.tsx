import { generatePageMetadata } from "@/lib/seo"
import { TARGET_KEYWORDS } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Engineering & IT Jobs in Germany — Blue Card Careers | Plan Beta",
  description: "Find engineering, IT, and software development jobs in Germany with visa sponsorship. Blue Card eligible positions for mechanical, electrical, and software engineers.",
  keywords: TARGET_KEYWORDS.engineeringJobs,
  path: "/jobs/engineering",
})

export default function EngineeringJobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Engineering & IT Jobs in Germany",
            description: "Find engineering and IT jobs in Germany with Blue Card sponsorship.",
            url: "https://theplanbeta.com/jobs/engineering",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://theplanbeta.com" },
                { "@type": "ListItem", position: 2, name: "Jobs", item: "https://theplanbeta.com/jobs" },
                { "@type": "ListItem", position: 3, name: "Engineering", item: "https://theplanbeta.com/jobs/engineering" },
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
