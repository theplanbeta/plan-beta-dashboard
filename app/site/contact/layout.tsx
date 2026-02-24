import { generatePageMetadata } from "@/lib/seo"
import { LocalBusinessSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "Contact Us | Plan Beta - Book Your Free Trial",
  description:
    "Get in touch with Plan Beta. Book a free trial class or learn more about our German language courses.",
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
