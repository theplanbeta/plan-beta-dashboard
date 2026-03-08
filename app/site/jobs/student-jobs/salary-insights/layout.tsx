import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Student Job Salary Insights Germany 2026 | Plan Beta",
  description: "See average student job salaries in Germany by city, job type, and German level. Compare Werkstudent, mini-job, and part-time pay across Berlin, Munich, Hamburg and more.",
  path: "/jobs/student-jobs/salary-insights",
})

export default function SalaryInsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
