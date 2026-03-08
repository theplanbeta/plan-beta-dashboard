import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Saved Jobs | Plan Beta Student Jobs",
  description: "View your saved student jobs in Germany. Premium subscribers get cloud-synced saved jobs across all devices.",
  path: "/jobs/student-jobs/saved",
})

export default function SavedJobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
