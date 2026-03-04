import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Find Student & Professional Jobs in Germany | Plan Beta",
  description:
    "Find student jobs, Werkstudent positions, mini-jobs, internships, and professional careers in Germany. Browse top German job portals, community-spotted postings, and curated listings for Indian professionals.",
  keywords: [
    "student jobs germany",
    "find student jobs in germany",
    "werkstudent jobs",
    "mini jobs germany",
    "part time jobs germany students",
    "jobs in germany for indians",
    "germany job portal",
    "nursing jobs germany",
    "IT jobs germany",
    "engineering jobs germany",
    "ausbildung jobs germany",
    "internship germany",
    "germany job vacancy",
    "german jobs visa sponsorship",
  ],
  path: "/site/jobs",
})

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Find Student & Professional Jobs in Germany",
            description:
              "Find student jobs, Werkstudent positions, mini-jobs, and professional careers in Germany. Top job portals, community-spotted postings, and curated listings.",
            url: "https://theplanbeta.com/site/jobs",
            isPartOf: {
              "@type": "WebSite",
              name: "Plan Beta",
              url: "https://theplanbeta.com",
            },
          }),
        }}
      />
      {children}
    </>
  )
}
