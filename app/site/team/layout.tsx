import { generatePageMetadata } from "@/lib/seo"
import { BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "The Plan Beta Team | German Teachers from Kerala — B2 Certified",
  description:
    "Meet the teachers behind Plan Beta. Every Plan Beta teacher holds at least a B2 in German and teaches live online batches from A1 through B2.",
  keywords: [
    "plan beta teachers",
    "german teachers india",
    "german tutor kerala",
    "b2 certified german teacher",
    "online german classes kerala",
    "plan beta founder",
  ],
  path: "/team",
})

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Team", url: "https://theplanbeta.com/team" },
        ]}
      />
      {children}
    </>
  )
}
