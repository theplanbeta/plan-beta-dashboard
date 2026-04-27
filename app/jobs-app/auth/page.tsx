import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyJobsAppToken } from "@/lib/jobs-app-auth"
import AuthForm from "@/components/jobs-app/AuthForm"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const isLogin = params.mode === "login"
  return {
    title: isLogin ? "Sign in · Day Zero" : "Sign up · Day Zero",
    description:
      "Open your career folder or sign back in to your Plan Beta Day Zero dossier.",
  }
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  // If already logged in, bounce straight to the jobs feed.
  const token = (await cookies()).get("pb-jobs-app")?.value
  if (token) {
    const payload = await verifyJobsAppToken(token)
    if (payload) {
      redirect("/jobs-app/jobs")
    }
  }

  const params = await searchParams
  const initialMode = params.mode === "login" ? "login" : "register"

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <AuthForm initialMode={initialMode} />
      </div>
    </div>
  )
}
