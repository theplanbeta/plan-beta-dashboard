import type { Metadata } from "next"
import { Suspense } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyJobsAppToken } from "@/lib/jobs-app-auth"
import { OnboardingFlow } from "@/components/jobs-app/OnboardingFlow"

export const metadata: Metadata = {
  title: "Get Started",
}

export default async function OnboardingPage() {
  const token = (await cookies()).get("pb-jobs-app")?.value
  if (!token) {
    redirect("/jobs-app/auth?mode=register")
  }
  const payload = await verifyJobsAppToken(token)
  if (!payload) {
    redirect("/jobs-app/auth?mode=register")
  }

  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <OnboardingFlow />
    </Suspense>
  )
}
