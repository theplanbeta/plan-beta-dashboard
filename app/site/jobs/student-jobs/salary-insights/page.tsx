import { SalaryInsights } from "@/components/marketing/jobs/SalaryInsights"
import { JobPortalAuthProvider } from "@/components/marketing/jobs/JobPortalAuthProvider"
import Link from "next/link"

export default function SalaryInsightsPage() {
  return (
    <JobPortalAuthProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/jobs/student-jobs" className="hover:text-gray-300 transition-colors">Student Jobs</Link>
            <span>/</span>
            <span className="text-gray-400">Salary Insights</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Student Job Salary Insights</h1>
          <p className="text-gray-400 mb-8 max-w-2xl">
            See what international students actually earn in Germany. Data from real job postings, updated daily.
          </p>

          <SalaryInsights />
        </div>
      </div>
    </JobPortalAuthProvider>
  )
}
