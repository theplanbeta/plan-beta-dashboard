import { generatePageMetadata } from "@/lib/seo"
import { BreadcrumbSchema, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { NurseHero } from "@/components/marketing/sections/NurseHero"
import { NurseStats } from "@/components/marketing/sections/NurseStats"
import { NurseEligibility } from "@/components/marketing/sections/NurseEligibility"
import { NurseTimeline } from "@/components/marketing/sections/NurseTimeline"
import { NurseBenefits } from "@/components/marketing/sections/NurseBenefits"
import { NurseLifeInGermany } from "@/components/marketing/sections/NurseLifeInGermany"
import { NurseFAQ } from "@/components/marketing/sections/NurseFAQ"
import { NurseCTA } from "@/components/marketing/sections/NurseCTA"

export const metadata = generatePageMetadata({
  title: "German Nursing Program | Plan Beta - Language Training & Hospital Placement",
  description:
    "German language training and hospital placement for BSc Nursing graduates. Connect with German hospitals and elderly care homes. Refundable security deposit. B2 certification pathway.",
  keywords: [
    "german nursing program",
    "nurses germany",
    "german language for nurses",
    "nursing jobs germany",
    "bsc nursing germany",
    "altenpflege germany",
    "krankenpflege germany",
    "nurse recruitment germany",
    "indian nurses germany",
    "elderly care germany",
  ],
  path: "/site/nurses",
})

const faqs = [
  {
    question: "What qualifications do I need to apply?",
    answer: "You need a BSc Nursing degree. Additionally, you need to achieve B2 level German language proficiency for nursing recognition in Germany.",
  },
  {
    question: "What is the security deposit?",
    answer: "A refundable security deposit is required based on your current German language level: B2 — no deposit, B1 — Rs. 20,000, A2 — Rs. 30,000, A1 — Rs. 40,000, No proficiency — Rs. 55,000. The full deposit is refunded upon successful issuance of your job contract.",
  },
  {
    question: "When do I get my deposit back?",
    answer: "The full security deposit is refunded once your job contract with a German employer is successfully issued. This policy ensures compliance with employer requirements and supports successful placement.",
  },
  {
    question: "What level of German do I need?",
    answer: "B2 is the language level required for nursing recognition in Germany. Our training covers all levels from beginner to B2 with dedicated exam preparation for Goethe or TELC certification.",
  },
  {
    question: "How long does the entire process take?",
    answer: "The language training duration depends on your starting level. From scratch to B2 takes approximately 12–14 months. If you already have some German, it's faster. After clearing the B2 exam, the visa and placement process takes another 3–6 months.",
  },
  {
    question: "Will I work in a hospital or care home?",
    answer: "Both options are available. We partner with Krankenhäuser (hospitals) and Altenpflegeheime (elderly care homes) across Germany. Your placement depends on your qualifications and preferences.",
  },
  {
    question: "What salary can I expect?",
    answer: "Starting salaries for nurses in Germany range from €2,800 to €4,500 per month depending on the federal state, facility, and your specialization. This includes benefits like health insurance, pension, and 24–30 paid vacation days.",
  },
  {
    question: "Can my family come with me?",
    answer: "Yes. Once you have a work visa and stable employment in Germany, you can apply for family reunification to bring your spouse and children.",
  },
]

export default function NursesPage() {
  return (
    <div className="overflow-hidden">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com/site" },
          { name: "Nursing Program", url: "https://theplanbeta.com/site/nurses" },
        ]}
      />
      <FAQSchema faqs={faqs} />

      <NurseHero />
      <NurseStats />
      <NurseEligibility />
      <NurseTimeline />
      <NurseBenefits />
      <NurseLifeInGermany />
      <NurseFAQ faqs={faqs} />
      <NurseCTA />
    </div>
  )
}
