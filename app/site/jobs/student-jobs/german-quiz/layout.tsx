import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "What's Your German Level? Free Quiz | Plan Beta",
  description: "Take this 5-question quiz to estimate your German language level (A1-C1). Get personalized job recommendations and course suggestions based on your result.",
  path: "/jobs/student-jobs/german-quiz",
})

export default function GermanQuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
