import { redirect } from "next/navigation"

export default function TeacherPage() {
  // Redirect to main dashboard - teacher dashboard is shown automatically
  redirect("/dashboard")
}
