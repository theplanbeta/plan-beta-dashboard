import Link from "next/link"
import { Briefcase, UserCircle } from "lucide-react"

export default function JobsAppHomePage() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PlanBeta Jobs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your AI-powered companion for the German job market
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/jobs-app/jobs"
          className="flex flex-col items-start gap-3 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Browse Jobs</p>
            <p className="mt-0.5 text-xs text-gray-500">Find openings in Germany</p>
          </div>
        </Link>

        <Link
          href="/jobs-app/onboarding"
          className="flex flex-col items-start gap-3 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
            <UserCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Setup Profile</p>
            <p className="mt-0.5 text-xs text-gray-500">Personalize your search</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
