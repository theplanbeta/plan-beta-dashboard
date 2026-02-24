import { WebsiteSEO, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { faqs } from "@/lib/marketing-data"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"

import { HeroSection } from "@/components/marketing/sections/HeroSection"
import { SocialProofStrip } from "@/components/marketing/sections/SocialProofStrip"
import { WhyPlanBeta } from "@/components/marketing/sections/WhyPlanBeta"
import { GermanyOpportunity } from "@/components/marketing/sections/GermanyOpportunity"
import { TestimonialsSection } from "@/components/marketing/sections/TestimonialsSection"
import { FAQSection } from "@/components/marketing/sections/FAQSection"
import { CTASection } from "@/components/marketing/sections/CTASection"

export const metadata = generatePageMetadata({
  title: "Learn German Online | Plan Beta - Best German Classes Kerala",
  description:
    "Master German with Kerala's premier language institute. Live online classes, expert instructors, A1 to B2 levels. 95% exam pass rate.",
  keywords: TARGET_KEYWORDS.home,
  path: "/site",
})

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Structured Data for SEO */}
      <WebsiteSEO />
      <FAQSchema faqs={faqs} />

      <HeroSection />
      <SocialProofStrip />
      <WhyPlanBeta />
      <GermanyOpportunity />
      <TestimonialsSection />
      <FAQSection faqs={faqs} />
      <CTASection />
    </div>
  )
}
