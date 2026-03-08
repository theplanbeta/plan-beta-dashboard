import type { MetadataRoute } from "next"

const SITE_URL = "https://theplanbeta.com"

const KERALA_CITIES = [
  "kochi",
  "thiruvananthapuram",
  "trivandrum",
  "kozhikode",
  "calicut",
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
]

const JOB_NICHES = ["nursing", "engineering", "student-jobs"]

export default function sitemap(): MetadataRoute.Sitemap {
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
      url: `${SITE_URL}/opportunities`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
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
  const nicheJobPages: MetadataRoute.Sitemap = [
    ...JOB_NICHES.map((niche) => ({
      url: `${SITE_URL}/jobs/${niche}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/jobs/india`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]

  // City x Niche job pages (30 pages)
  const cityJobPages: MetadataRoute.Sitemap = JOB_NICHES.flatMap((niche) =>
    GERMAN_CITIES.map((city) => ({
      url: `${SITE_URL}/jobs/${niche}/${city}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))
  )

  const blogPosts: MetadataRoute.Sitemap = [
    { slug: "impact-of-learning-german-tourism-hospitality", date: "2024-06-04" },
    { slug: "healthcare-opportunities-germany", date: "2024-05-30" },
    { slug: "german-skills-engineering-career", date: "2024-04-29" },
    { slug: "navigating-visa-requirements", date: "2024-04-23" },
    { slug: "power-of-persistence-language-learning", date: "2024-03-30" },
    { slug: "goethe-zertifikat-preparation-strategies", date: "2024-03-19" },
  ].map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  const cityPages: MetadataRoute.Sitemap = KERALA_CITIES.map((city) => ({
    url: `${SITE_URL}/german-classes/${city}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...nicheJobPages, ...cityJobPages, ...blogPosts, ...cityPages]
}
