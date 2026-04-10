import type { Metadata } from "next"
import OnboardingForm from "@/components/jobs-app/OnboardingForm"

export const metadata: Metadata = {
  title: "Get Started",
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <OnboardingForm />
      </div>
    </div>
  )
}
