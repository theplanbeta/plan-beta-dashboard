import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "German Jobs for Indians — Find Your Job in Germany",
  description:
    "Browse curated job listings in Germany for Indian professionals. Filter by profession, city, and German level. Nursing, IT, engineering, and more.",
  keywords: [
    "jobs in germany for indians",
    "germany job portal",
    "nursing jobs germany",
    "IT jobs germany",
    "engineering jobs germany",
    "work in germany",
    "germany job vacancy",
    "germany job listings english",
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
            name: "German Jobs for Indians",
            description:
              "Browse curated job listings in Germany for Indian professionals.",
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
