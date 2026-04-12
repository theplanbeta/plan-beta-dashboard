import type { Metadata } from "next"
import Script from "next/script"
import { notFound } from "next/navigation"
import { cache } from "react"
import { prisma } from "@/lib/prisma"
import JobDetailClient, { type JobDetail } from "./JobDetailClient"

const SITE_URL = "https://dayzero.xyz"

// React cache() deduplicates this across generateMetadata + the page
// component within the same server request. Without it we'd fire two
// identical Prisma queries per job detail page load (H7 adversarial fix).
const getJob = cache(async function getJob(slug: string) {
  return prisma.jobPosting.findFirst({
    where: { slug, active: true },
    select: {
      id: true,
      slug: true,
      title: true,
      company: true,
      location: true,
      description: true,
      salaryMin: true,
      salaryMax: true,
      currency: true,
      germanLevel: true,
      profession: true,
      jobType: true,
      requirements: true,
      applyUrl: true,
      viewCount: true,
      createdAt: true,
      postedAt: true,
      updatedAt: true,
    },
  })
})

type JobFromDb = NonNullable<Awaited<ReturnType<typeof getJob>>>

function toClientJob(j: JobFromDb): JobDetail {
  return {
    id: j.id,
    slug: j.slug ?? "",
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency,
    germanLevel: j.germanLevel,
    profession: j.profession,
    jobType: j.jobType,
    requirements: j.requirements,
    applyUrl: j.applyUrl,
    viewCount: j.viewCount,
    createdAt: j.createdAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// generateMetadata — runs at request time on the server
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const job = await getJob(slug)

  if (!job) {
    return {
      title: "Job not found",
      robots: { index: false, follow: false },
    }
  }

  const title = `${job.title} · ${job.company}`
  const description =
    (job.description ?? "").slice(0, 160).replace(/\s+/g, " ").trim() ||
    `${job.title} at ${job.company}${
      job.location ? ` in ${job.location}` : ""
    } — Plan Beta Day Zero.`
  const url = `${SITE_URL}/jobs-app/job/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "Plan Beta Day Zero",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

// ---------------------------------------------------------------------------
// Employment type mapping for schema.org JobPosting
// ---------------------------------------------------------------------------
// Google Jobs valid employmentType values. "OTHER" is NOT valid — omit
// the field entirely when there's no mapping.
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  WORKING_STUDENT: "PART_TIME",
  INTERNSHIP: "INTERN",
  CONTRACT: "CONTRACTOR",
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const job = await getJob(slug)

  // Fixes B-C6 nonexistent-slug-returns-200 bug.
  if (!job) notFound()

  const clientJob = toClientJob(job)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? job.title,
    datePosted: (job.postedAt ?? job.createdAt).toISOString(),
    // Day Zero doesn't track explicit expiry — estimate 30 days from
    // posting so Google Jobs has a validThrough value.
    validThrough: new Date(
      (job.postedAt ?? job.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    ...(job.jobType && EMPLOYMENT_TYPE_MAP[job.jobType]
      ? { employmentType: EMPLOYMENT_TYPE_MAP[job.jobType] }
      : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
    },
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.location,
            addressCountry: "DE",
          },
        }
      : undefined,
    baseSalary:
      job.salaryMin !== null || job.salaryMax !== null
        ? {
            "@type": "MonetaryAmount",
            currency: job.currency,
            value: {
              "@type": "QuantitativeValue",
              ...(job.salaryMin !== null ? { minValue: job.salaryMin } : {}),
              ...(job.salaryMax !== null ? { maxValue: job.salaryMax } : {}),
              unitText: "YEAR",
            },
          }
        : undefined,
    url: `${SITE_URL}/jobs-app/job/${slug}`,
    directApply: Boolean(job.applyUrl),
  }

  return (
    <>
      <Script
        id="job-posting-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <JobDetailClient initialJob={clientJob} />
    </>
  )
}
