import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Werkstudent Jobs in Germany 2026 — Working Student Positions | Plan Beta",
  description: "Find Werkstudent (working student) positions in Germany. Up to 20h/week during semester, unlimited during breaks. Browse real openings in Berlin, Munich, Hamburg and more.",
  path: "/jobs/student-jobs/werkstudent",
})

export default function WerkstudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Werkstudent Jobs in Germany",
            description: "Find Werkstudent (working student) positions across Germany.",
            url: "https://theplanbeta.com/jobs/student-jobs/werkstudent",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://theplanbeta.com" },
                { "@type": "ListItem", position: 2, name: "Student Jobs", item: "https://theplanbeta.com/jobs/student-jobs" },
                { "@type": "ListItem", position: 3, name: "Werkstudent", item: "https://theplanbeta.com/jobs/student-jobs/werkstudent" },
              ],
            },
          }),
        }}
      />
      {children}
    </>
  )
}
