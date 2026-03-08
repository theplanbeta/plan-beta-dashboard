import { prisma } from "@/lib/prisma"
import { generatePageMetadata } from "@/lib/seo"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params

  const job = await prisma.jobPosting.findFirst({
    where: { OR: [{ slug }, { id: slug }], active: true },
    select: { title: true, company: true, location: true, salaryMin: true, salaryMax: true, germanLevel: true },
  })

  if (!job) {
    return generatePageMetadata({
      title: "Job Not Found | Plan Beta",
      description: "This job posting is no longer available.",
      path: `/jobs/student-jobs/job/${slug}`,
    })
  }

  const salaryText = job.salaryMin
    ? ` | EUR ${job.salaryMin.toLocaleString()}${job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : "+"}/mo`
    : ""

  return generatePageMetadata({
    title: `${job.title} at ${job.company}${job.location ? ` in ${job.location}` : ""} | Plan Beta Jobs`,
    description: `Apply for ${job.title} at ${job.company}${job.location ? ` in ${job.location}` : ""}${salaryText}. ${job.germanLevel ? `Requires ${job.germanLevel} German.` : ""} Found on Plan Beta Student Jobs.`,
    path: `/jobs/student-jobs/job/${slug}`,
  })
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
