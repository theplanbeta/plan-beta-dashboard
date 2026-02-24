import { generatePageMetadata } from "@/lib/seo"
import { LocalBusinessSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "Contact Us | Plan Beta - Start Learning German",
  description:
    "Get in touch with Plan Beta. Enquire about our German language courses and start your journey to Germany.",
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
