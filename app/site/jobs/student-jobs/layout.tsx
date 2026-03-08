import { generatePageMetadata } from "@/lib/seo"
import { TARGET_KEYWORDS } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Student Jobs in Germany — Werkstudent, Mini-Jobs & Part-Time | Plan Beta",
  description: "Find Werkstudent positions, mini-jobs, and part-time work for international students in Germany. Better German = better opportunities and higher pay.",
  keywords: TARGET_KEYWORDS.studentJobs,
  path: "/jobs/student-jobs",
})

export default function StudentJobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Student Jobs in Germany",
            description: "Find Werkstudent positions, mini-jobs, and part-time work for international students in Germany.",
            url: "https://theplanbeta.com/jobs/student-jobs",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://theplanbeta.com" },
                { "@type": "ListItem", position: 2, name: "Jobs", item: "https://theplanbeta.com/jobs" },
                { "@type": "ListItem", position: 3, name: "Student Jobs", item: "https://theplanbeta.com/jobs/student-jobs" },
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
