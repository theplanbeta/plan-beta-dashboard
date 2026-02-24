import { generatePageMetadata } from "@/lib/seo"
import { LocalBusinessSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "Contact Us | Plan Beta - Start Learning German",
  description:
    "Get in touch with Plan Beta. Enquire about German courses, nursing programs, and career guidance. We respond within 24 hours.",
  keywords: ["contact plan beta", "german classes enquiry", "plan beta phone", "plan beta email"],
  path: "/site/contact",
})

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LocalBusinessSchema />
      {children}
    </>
  )
}
