import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyJobsAppToken } from "@/lib/jobs-app-auth"
import OnboardingForm from "@/components/jobs-app/OnboardingForm"

export const metadata: Metadata = {
  title: "Get Started",
}

export default async function OnboardingPage() {
  // Onboarding is a post-auth profile-setup step. Cold users land here from
  // /jobs-app/auth after registration. If somebody tries to visit directly
  // without a session, bounce them to the sign-up flow.
  const token = (await cookies()).get("pb-jobs-app")?.value
  if (!token) {
    redirect("/jobs-app/auth?mode=register")
  }
  const payload = await verifyJobsAppToken(token)
  if (!payload) {
    redirect("/jobs-app/auth?mode=register")
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <OnboardingForm />
      </div>
    </div>
  )
}
