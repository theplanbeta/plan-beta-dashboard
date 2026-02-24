import type { MetadataRoute } from "next"

const SITE_URL = "https://planbeta.in"

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

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/site`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/site/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/site/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/site/nurses`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/site/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/site/opportunities`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/site/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/site/refer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
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

  const coursePages: MetadataRoute.Sitemap = [
    "a1-live", "a1-foundation", "a2-live", "b1-live", "speaking", "pronunciation", "alphabet",
  ].map((slug) => ({
    url: `${SITE_URL}/site/courses/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }))

  const blogPosts: MetadataRoute.Sitemap = [
    { slug: "impact-of-learning-german-tourism-hospitality", date: "2024-06-04" },
    { slug: "healthcare-opportunities-germany", date: "2024-05-30" },
    { slug: "german-skills-engineering-career", date: "2024-04-29" },
    { slug: "navigating-visa-requirements", date: "2024-04-23" },
    { slug: "power-of-persistence-language-learning", date: "2024-03-30" },
    { slug: "goethe-zertifikat-preparation-strategies", date: "2024-03-19" },
  ].map((post) => ({
    url: `${SITE_URL}/site/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  const cityPages: MetadataRoute.Sitemap = KERALA_CITIES.map((city) => ({
    url: `${SITE_URL}/site/german-classes/${city}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...coursePages, ...blogPosts, ...cityPages]
}
