// Comprehensive SEO Library for Plan Beta
// This replaces what a ₹20,000/month agency would do

import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://planbeta.in'
const SITE_NAME = 'Plan Beta'
const DEFAULT_IMAGE = '/og-image.jpg'

// Target keywords for each page/topic
export const TARGET_KEYWORDS = {
  home: [
    'learn german online',
    'german language course',
    'german classes kerala',
    'german course india',
    'A1 german course',
    'best german language institute kerala',
    'online german classes india',
  ],
  courses: [
    'german A1 course',
    'german A2 course',
    'german B1 course',
    'goethe exam preparation',
    'german live classes',
    'german self study course',
    'german course fees india',
  ],
  opportunities: [
    'work in germany',
    'nursing jobs germany',
    'engineering jobs germany',
    'germany work visa',
    'germany skilled worker visa',
    'german language requirement germany',
    'jobs in germany for indians',
  ],
  nursing: [
    'nursing in germany',
    'nurse jobs germany',
    'german for nurses',
    'nursing germany salary',
    'how to become nurse in germany',
    'germany nursing recruitment',
  ],
  blog: [
    'learn german tips',
    'german language blog',
    'germany immigration guide',
    'goethe exam tips',
  ],
}

// Generate comprehensive metadata for a page
export function generatePageMetadata({
  title,
  description,
  keywords,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
}: {
  title: string
  description: string
  keywords?: string[]
  path?: string
  image?: string
  type?: 'website' | 'article'
  noIndex?: boolean
}): Metadata {
  const url = `${SITE_URL}${path}`
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  return {
    title: fullTitle,
    description,
    keywords: keywords?.join(', '),
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_IN',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@theplanbeta',
    },
    robots: noIndex ? {
      index: false,
      follow: false,
    } : {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      // Add Bing, Yandex as needed
    },
  }
}

// SEO Analysis Tool - Analyzes content and provides recommendations
export function analyzeSEO({
  title,
  description,
  content,
  targetKeywords,
  url,
}: {
  title: string
  description: string
  content: string
  targetKeywords: string[]
  url: string
}): {
  score: number
  issues: string[]
  recommendations: string[]
  keywordDensity: Record<string, number>
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  // Title checks
  if (title.length < 30) {
    issues.push('Title is too short (< 30 characters)')
    score -= 10
  }
  if (title.length > 60) {
    issues.push('Title is too long (> 60 characters)')
    score -= 5
  }

  // Description checks
  if (description.length < 120) {
    issues.push('Meta description is too short (< 120 characters)')
    score -= 10
  }
  if (description.length > 160) {
    issues.push('Meta description is too long (> 160 characters)')
    score -= 5
  }

  // Content length check
  const wordCount = content.split(/\s+/).length
  if (wordCount < 300) {
    issues.push(`Content is thin (${wordCount} words). Aim for 1000+ words.`)
    score -= 15
  } else if (wordCount < 1000) {
    recommendations.push(`Content has ${wordCount} words. Consider expanding to 1500+ for competitive keywords.`)
  }

  // Keyword analysis
  const contentLower = content.toLowerCase()
  const titleLower = title.toLowerCase()
  const descLower = description.toLowerCase()

  const keywordDensity: Record<string, number> = {}

  targetKeywords.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase()
    const regex = new RegExp(keywordLower, 'gi')
    const matches = contentLower.match(regex)
    const count = matches ? matches.length : 0
    const density = (count / wordCount) * 100
    keywordDensity[keyword] = Math.round(density * 100) / 100

    // Check if keyword is in title
    if (!titleLower.includes(keywordLower)) {
      recommendations.push(`Consider adding "${keyword}" to the title`)
    }

    // Check if keyword is in description
    if (!descLower.includes(keywordLower)) {
      recommendations.push(`Consider adding "${keyword}" to the meta description`)
    }

    // Check keyword density
    if (density < 0.5 && count > 0) {
      recommendations.push(`Keyword "${keyword}" density is low (${density.toFixed(2)}%). Consider using it more naturally.`)
    } else if (density > 3) {
      issues.push(`Keyword "${keyword}" may be over-optimized (${density.toFixed(2)}% density)`)
      score -= 5
    }

    if (count === 0) {
      issues.push(`Target keyword "${keyword}" not found in content`)
      score -= 5
    }
  })

  // URL check
  if (url.length > 75) {
    recommendations.push('URL is long. Consider shortening for better shareability.')
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score)

  return {
    score,
    issues,
    recommendations,
    keywordDensity,
  }
}

// Blog post SEO checklist
export const BLOG_SEO_CHECKLIST = [
  { id: 'title_length', label: 'Title is 30-60 characters', check: (title: string) => title.length >= 30 && title.length <= 60 },
  { id: 'title_keyword', label: 'Primary keyword in title', check: (title: string, keyword: string) => title.toLowerCase().includes(keyword.toLowerCase()) },
  { id: 'desc_length', label: 'Meta description is 120-160 characters', check: (desc: string) => desc.length >= 120 && desc.length <= 160 },
  { id: 'content_length', label: 'Content is 1000+ words', check: (content: string) => content.split(/\s+/).length >= 1000 },
  { id: 'has_headings', label: 'Has H2 and H3 headings', check: (content: string) => /#{2,3}\s/.test(content) || /<h[23]>/i.test(content) },
  { id: 'has_images', label: 'Has at least one image', check: (content: string) => /!\[|<img/i.test(content) },
  { id: 'internal_links', label: 'Has internal links', check: (content: string) => /\[.*?\]\(\/|href=["']\//.test(content) },
  { id: 'external_links', label: 'Has external links', check: (content: string) => /\[.*?\]\(https?:|href=["']https?:/.test(content) },
]

// Generate blog post ideas based on keyword research
export function generateBlogIdeas(targetAudience: string): { title: string; keywords: string[]; outline: string[] }[] {
  const ideas = [
    {
      title: `Complete Guide to Learning German for ${targetAudience}`,
      keywords: ['learn german', 'german for beginners', `german for ${targetAudience.toLowerCase()}`],
      outline: [
        'Introduction: Why German?',
        'Understanding the German Language Structure',
        'Step-by-Step Learning Path (A1 → B2)',
        `Specific Tips for ${targetAudience}`,
        'Common Mistakes to Avoid',
        'Resources and Tools',
        'Conclusion: Your Action Plan',
      ],
    },
    {
      title: `How to Pass the Goethe B1 Exam on Your First Attempt`,
      keywords: ['goethe b1 exam', 'german b1 tips', 'goethe exam preparation'],
      outline: [
        'Understanding the B1 Exam Format',
        'Reading Section Strategies',
        'Listening Section Tips',
        'Writing Section Guide',
        'Speaking Section Preparation',
        'Sample Questions and Answers',
        'Study Schedule Recommendation',
      ],
    },
    {
      title: `${new Date().getFullYear()} Guide: Working in Germany as an Indian Professional`,
      keywords: ['work in germany', 'germany visa for indians', 'jobs in germany'],
      outline: [
        'Current Job Market in Germany',
        'Language Requirements by Industry',
        'Visa Options Explained',
        'Recognition of Indian Qualifications',
        'Cost of Living vs Salary',
        'Step-by-Step Immigration Process',
        'Success Stories',
      ],
    },
  ]

  return ideas
}

// Competitor keyword analysis template
export const COMPETITOR_ANALYSIS_TEMPLATE = {
  competitors: [
    'goethe.de',
    'german-learning.com',
    // Add actual competitors
  ],
  metricsToTrack: [
    'Domain Authority',
    'Organic Traffic',
    'Top Keywords',
    'Backlink Count',
    'Content Frequency',
  ],
  tools: [
    { name: 'Google Search Console', free: true, url: 'https://search.google.com/search-console' },
    { name: 'Ubersuggest', free: true, url: 'https://neilpatel.com/ubersuggest/' },
    { name: 'AnswerThePublic', free: true, url: 'https://answerthepublic.com/' },
    { name: 'Google Trends', free: true, url: 'https://trends.google.com/' },
  ],
}

// Monthly SEO checklist
export const MONTHLY_SEO_CHECKLIST = [
  { task: 'Check Google Search Console for errors', frequency: 'weekly' },
  { task: 'Review top performing pages', frequency: 'monthly' },
  { task: 'Update old blog posts with new information', frequency: 'monthly' },
  { task: 'Check for broken links', frequency: 'monthly' },
  { task: 'Review Core Web Vitals', frequency: 'monthly' },
  { task: 'Analyze competitor rankings', frequency: 'monthly' },
  { task: 'Create new blog content', frequency: 'weekly' },
  { task: 'Build quality backlinks', frequency: 'ongoing' },
  { task: 'Update sitemap if new pages added', frequency: 'as needed' },
  { task: 'Review and respond to Google reviews', frequency: 'weekly' },
]
