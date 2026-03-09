import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { JobDetailPage } from "@/components/marketing/jobs/JobDetailPage"

export const revalidate = 3600 // ISR: revalidate every hour

type Props = { params: Promise<{ slug: string }> }

async function getJob(slug: string) {
  const job = await prisma.jobPosting.findFirst({
    where: { OR: [{ slug }, { id: slug }], active: true },
    include: { source: { select: { name: true } } },
  })

  if (!job) return null

  // Increment view count (fire-and-forget)
  prisma.jobPosting.update({
    where: { id: job.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  // Fetch similar jobs
  const similarJobs = await prisma.jobPosting.findMany({
    where: {
      active: true,
      id: { not: job.id },
      OR: [
        ...(job.location ? [{ location: { contains: job.location.split(",")[0].trim(), mode: "insensitive" as const } }] : []),
        ...(job.profession ? [{ profession: job.profession }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true, slug: true, title: true, company: true, location: true,
      salaryMin: true, salaryMax: true, currency: true, germanLevel: true,
      jobType: true, postedAt: true,
    },
  })

  return {
    job: {
      ...job,
      salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
      salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
      postedAt: job.postedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
    similarJobs: similarJobs.map((j) => ({
      ...j,
      salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
      salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
      postedAt: j.postedAt?.toISOString() ?? null,
    })),
  }
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params
  const data = await getJob(slug)

  if (!data) notFound()

  // JobPosting JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: data.job.title,
    description: data.job.description || data.job.title,
    datePosted: data.job.postedAt || data.job.createdAt,
    hiringOrganization: {
      "@type": "Organization",
      name: data.job.company,
    },
    jobLocation: data.job.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: data.job.location.split(",")[0].trim(),
            addressCountry: "DE",
          },
        }
      : undefined,
    ...(data.job.salaryMin
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: data.job.currency,
            value: {
              "@type": "QuantitativeValue",
              minValue: data.job.salaryMin,
              ...(data.job.salaryMax ? { maxValue: data.job.salaryMax } : {}),
              unitText: "MONTH",
            },
          },
        }
      : {}),
    employmentType: ({ FULL_TIME: "FULL_TIME", PART_TIME: "PART_TIME", CONTRACT: "CONTRACTOR", INTERNSHIP: "INTERN", WORKING_STUDENT: "PART_TIME" } as Record<string, string>)[data.job.jobType || ""] || undefined,
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JobDetailPage job={data.job} similarJobs={data.similarJobs} />
    </div>
  )
}
