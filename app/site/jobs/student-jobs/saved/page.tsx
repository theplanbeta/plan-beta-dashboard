import { SavedJobsPage } from "@/components/marketing/jobs/SavedJobsPage"
import { JobPortalAuthProvider } from "@/components/marketing/jobs/JobPortalAuthProvider"
import Link from "next/link"

export default function SavedJobsRoute() {
  return (
    <JobPortalAuthProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/jobs/student-jobs" className="hover:text-gray-300 transition-colors">Student Jobs</Link>
            <span>/</span>
            <span className="text-gray-400">Saved Jobs</span>
          </nav>

          <h1 className="text-3xl font-bold text-white mb-8">Saved Jobs</h1>

          <SavedJobsPage />
        </div>
      </div>
    </JobPortalAuthProvider>
  )
}
