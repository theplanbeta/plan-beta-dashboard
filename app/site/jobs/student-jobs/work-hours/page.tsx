import { WorkHoursCalculator } from "@/components/marketing/jobs/WorkHoursCalculator"
import Link from "next/link"

export default function WorkHoursPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/jobs/student-jobs" className="hover:text-gray-300 transition-colors">Student Jobs</Link>
          <span>/</span>
          <span className="text-gray-400">Work Hours Calculator</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Work Hours Calculator</h1>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Find out how many hours you can legally work in Germany based on your visa type.
          Stay compliant and maximize your earnings.
        </p>

        <WorkHoursCalculator />
      </div>
    </div>
  )
}
