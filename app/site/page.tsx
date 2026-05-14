import { headers } from "next/headers"
import { WebsiteSEO, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { faqs } from "@/lib/marketing-data"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { getCurrencyFromCountry } from "@/lib/geo-pricing"
import { prisma } from "@/lib/prisma"

/** Returns "April 2026" style label for the next batch start, or the next
 *  calendar month if no upcoming batch is in the DB. Plan Beta runs new
 *  batches every month, so the calendar fallback is safe. */
async function getNextBatchLabel(): Promise<string> {
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { month: "long", year: "numeric" })
  try {
    const next = await prisma.batch.findFirst({
      where: { status: "FILLING", startDate: { gt: new Date() } },
      select: { startDate: true },
      orderBy: { startDate: "asc" },
    })
    if (next?.startDate) return fmt(next.startDate)
  } catch {
    // DB unreachable at build time — fall through to calendar fallback
  }
  const now = new Date()
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return fmt(firstOfNextMonth)
}

import { HeroSection } from "@/components/marketing/sections/HeroSection"
import { SocialProofStrip } from "@/components/marketing/sections/SocialProofStrip"
import { PathwaySection } from "@/components/marketing/sections/PathwaySection"
import { WhyPlanBeta } from "@/components/marketing/sections/WhyPlanBeta"
import { CoursesSection } from "@/components/marketing/sections/CoursesSection"
import { GermanyOpportunity } from "@/components/marketing/sections/GermanyOpportunity"
import { TestimonialsSection } from "@/components/marketing/sections/TestimonialsSection"
import { AlumniSection } from "@/components/marketing/sections/AlumniSection"
import { FAQSection } from "@/components/marketing/sections/FAQSection"
import { CTASection } from "@/components/marketing/sections/CTASection"
import { JobPortalSection } from "@/components/marketing/sections/JobPortalSection"
import { ExploreSection } from "@/components/marketing/sections/ExploreSection"
import { LatestBlogSection } from "@/components/marketing/sections/LatestBlogSection"

export const metadata = generatePageMetadata({
  title: "Germany Pathway | Plan Beta — German Courses & Career Support from Kerala",
  description:
    "Your complete Germany pathway — German training (A1 to B2), career support, and job placement. 500+ alumni now working in Germany. Live online classes from Kerala.",
  keywords: TARGET_KEYWORDS.home,
  path: "",
})

export default async function HomePage() {
  const headersList = await headers()
  const country = headersList.get("x-vercel-ip-country")
  const currency = getCurrencyFromCountry(country)
  const nextBatchLabel = await getNextBatchLabel()

  return (
    <div className="overflow-hidden">
      {/* Structured Data for SEO */}
      <WebsiteSEO />
      <FAQSchema faqs={faqs} />

      <HeroSection nextBatchLabel={nextBatchLabel} />
      <SocialProofStrip />
      <PathwaySection />
      <CoursesSection currency={currency} />
      <GermanyOpportunity />
      <JobPortalSection />
      <ExploreSection />
      <LatestBlogSection />
      <WhyPlanBeta />
      <TestimonialsSection />
      <AlumniSection />
      <FAQSection faqs={faqs} />
      <CTASection />
    </div>
  )
}
