import { generatePageMetadata } from "@/lib/seo"
import { TARGET_KEYWORDS } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Nursing Jobs in Germany — Hospital & Healthcare Careers | Plan Beta",
  description: "Find nursing and healthcare jobs in German hospitals. Plan Beta handles your complete journey: A1→B2 German training, Anerkennung (recognition), and hospital placement. No placement fees.",
  keywords: TARGET_KEYWORDS.nursingJobs,
  path: "/jobs/nursing",
})

export default function NursingJobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Nursing Jobs in Germany",
            description: "Find nursing and healthcare jobs in German hospitals. Complete pathway support from Plan Beta.",
            url: "https://theplanbeta.com/jobs/nursing",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://theplanbeta.com" },
                { "@type": "ListItem", position: 2, name: "Jobs", item: "https://theplanbeta.com/jobs" },
                { "@type": "ListItem", position: 3, name: "Nursing", item: "https://theplanbeta.com/jobs/nursing" },
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
