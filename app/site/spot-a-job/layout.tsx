import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "SpotAJob — Share Job Postings in Germany | Plan Beta",
  description:
    "Found a job posting in Germany? Snap a photo and share it with the Plan Beta community. Help fellow students discover opportunities.",
  keywords: ["jobs in germany", "student jobs germany", "nebenjob", "werkstudent", "community jobs"],
  path: "/spot-a-job",
})

export default function SpotAJobLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
