import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Student Work Hours Calculator Germany 2026 | Plan Beta",
  description: "Calculate how many hours you can work as an international student in Germany. Check visa limits, tax-free thresholds, and Werkstudent rules for 2026.",
  path: "/jobs/student-jobs/work-hours",
})

export default function WorkHoursLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
