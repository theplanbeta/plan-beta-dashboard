// JSON-LD Structured Data Components for SEO
// These help Google understand your content and can lead to rich snippets

type OrganizationSchemaProps = {
  name?: string
  url?: string
  logo?: string
  description?: string
  phone?: string
  email?: string
  address?: {
    city?: string
    region?: string
    country?: string
  }
  socialProfiles?: string[]
}

export function OrganizationSchema({
  name = "Plan Beta",
  url = "https://planbeta.in",
  logo = "https://planbeta.in/logo.png",
  description = "Kerala's premier German language institute offering A1, A2, B1 courses with live online classes and expert instructors.",
  phone = "+919028396035",
  email = "hello@planbeta.in",
  address = {
    city: "Kochi",
    region: "Kerala",
    country: "IN",
  },
  socialProfiles = [
    "https://facebook.com/theplanbeta",
    "https://instagram.com/theplanbeta",
    "https://youtube.com/@planbeta00",
  ],
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name,
    url,
    logo,
    description,
    telephone: phone,
    email,
    address: {
      "@type": "PostalAddress",
      addressLocality: address.city,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    sameAs: socialProfiles,
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "German Language Courses",
      itemListElement: [
        {
          "@type": "Course",
          name: "German A1 Live Classes",
          description: "Beginner German course with live online instruction",
        },
        {
          "@type": "Course",
          name: "German A2 Live Classes",
          description: "Elementary German course building on A1 foundation",
        },
        {
          "@type": "Course",
          name: "German B1 Live Classes",
          description: "Intermediate German course for work visa requirements",
        },
      ],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

type CourseSchemaProps = {
  name: string
  description: string
  provider?: string
  url: string
  price?: number
  priceCurrency?: string
  duration?: string
  level?: string
  language?: string
  rating?: number
  reviewCount?: number
}

export function CourseSchema({
  name,
  description,
  provider = "Plan Beta",
  url,
  price,
  priceCurrency = "INR",
  duration,
  level,
  language = "German",
  rating,
  reviewCount,
}: CourseSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: provider,
      url: "https://planbeta.in",
    },
    url,
    inLanguage: language,
    ...(price != null && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency,
        availability: "https://schema.org/InStock",
        validFrom: new Date().toISOString(),
      },
    }),
  }

  if (duration) {
    schema.timeRequired = duration
  }

  if (level) {
    schema.educationalLevel = level
  }

  if (rating && reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

type FAQSchemaProps = {
  faqs: { question: string; answer: string }[]
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

type BreadcrumbSchemaProps = {
  items: { name: string; url: string }[]
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

type ArticleSchemaProps = {
  title: string
  description: string
  url: string
  image?: string
  datePublished: string
  dateModified?: string
  author?: string
}

export function ArticleSchema({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author = "Plan Beta",
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: image || "https://planbeta.in/og-image.jpg",
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization",
      name: author,
      url: "https://planbeta.in",
    },
    publisher: {
      "@type": "Organization",
      name: "Plan Beta",
      logo: {
        "@type": "ImageObject",
        url: "https://planbeta.in/logo.png",
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

type LocalBusinessSchemaProps = {
  name?: string
  phone?: string
  priceRange?: string
}

export function LocalBusinessSchema({
  name = "Plan Beta German Language Institute",
  phone = "+919028396035",
  priceRange = "₹₹",
}: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://planbeta.in",
    name,
    image: "https://planbeta.in/logo.png",
    telephone: phone,
    priceRange,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kochi",
      addressRegion: "Kerala",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 9.9312,
      longitude: 76.2673,
    },
    url: "https://planbeta.in",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "20:00",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 500,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Comprehensive page-level SEO with all relevant schemas
export function WebsiteSEO() {
  return (
    <>
      <OrganizationSchema />
      <LocalBusinessSchema />
    </>
  )
}
