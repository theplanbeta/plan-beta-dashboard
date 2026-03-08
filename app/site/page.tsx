import { headers } from "next/headers"
import { WebsiteSEO, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { faqs } from "@/lib/marketing-data"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { getCurrencyFromCountry } from "@/lib/geo-pricing"

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
import { ExploreSection } from "@/components/marketing/sections/ExploreSection"

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

  return (
    <div className="overflow-hidden">
      {/* Structured Data for SEO */}
      <WebsiteSEO />
      <FAQSchema faqs={faqs} />

      <HeroSection />
      <SocialProofStrip />
      <PathwaySection />
      <CoursesSection currency={currency} />
      <GermanyOpportunity />
      <ExploreSection />
      <WhyPlanBeta />
      <TestimonialsSection />
      <AlumniSection />
      <FAQSection faqs={faqs} />
      <CTASection />
    </div>
  )
}
