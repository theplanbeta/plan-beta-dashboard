import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

const SITE_URL = "https://theplanbeta.com"

const KERALA_CITIES = [
  "kochi",
  "thiruvananthapuram",
  "kozhikode",
  "thrissur",
  "kollam",
  "palakkad",
  "alappuzha",
  "kannur",
  "kottayam",
  "malappuram",
  "ernakulam",
]

const GERMAN_CITIES = [
  "berlin", "munich", "hamburg", "frankfurt", "stuttgart",
  "cologne", "dusseldorf", "nuremberg", "hannover", "dresden",
  "leipzig", "bremen", "essen", "dortmund", "bonn",
]

const JOB_NICHES = ["nursing", "engineering", "student-jobs"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/nurses`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/refer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/germany-pathway`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/spot-a-job`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  // Niche job pages
  const nicheJobPages: MetadataRoute.Sitemap = JOB_NICHES.map((niche) => ({
    url: `${SITE_URL}/jobs/${niche}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }))

  // Student jobs tool pages
  const studentJobToolPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/jobs/student-jobs/werkstudent`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jobs/student-jobs/minijob`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jobs/student-jobs/salary-insights`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/jobs/student-jobs/work-hours`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/jobs/student-jobs/german-quiz`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/jobs/student-jobs/saved`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.5,
    },
  ]

  // City x Niche job pages
  const cityJobPages: MetadataRoute.Sitemap = JOB_NICHES.flatMap((niche) =>
    GERMAN_CITIES.map((city) => ({
      url: `${SITE_URL}/jobs/${niche}/${city}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))
  )

  // Dynamic blog posts from database
  const dbPosts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  })

  const blogPosts: MetadataRoute.Sitemap = dbPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const cityPages: MetadataRoute.Sitemap = KERALA_CITIES.map((city) => ({
    url: `${SITE_URL}/german-classes/${city}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...nicheJobPages,
    ...studentJobToolPages,
    ...cityJobPages,
    ...blogPosts,
    ...cityPages,
  ]
}
