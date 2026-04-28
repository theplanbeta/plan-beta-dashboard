import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const CATEGORY_TAGLINE: Record<string, string> = {
  Career: "Career in Germany",
  "Learning Tips": "Learn German Smarter",
  "Exam Prep": "Goethe & telc Exam Prep",
  "Visa & Immigration": "Germany Visa Guide",
  "Student Life": "Studying in Germany",
  "Job Market": "German Job Market",
  Healthcare: "Healthcare in Germany",
  Engineering: "Engineering in Germany",
}

// Per-blog-post Open Graph image. Each post gets a unique 1200×630 PNG with
// its title rendered over a brand background — replaces the previous
// blanket /blogo.png that made every blog post look identical in SERPs and
// social shares.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, category: true, readTime: true },
  })

  const title = post?.title ?? "Plan Beta"
  const tagline = post?.category
    ? CATEGORY_TAGLINE[post.category] ?? post.category
    : "Learn German for Germany"
  const readTime = post?.readTime ? `${post.readTime} min read` : ""

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at top right, rgba(220, 38, 38, 0.18), transparent 55%), radial-gradient(circle at bottom left, rgba(250, 204, 21, 0.10), transparent 50%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontSize: 36,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            B
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
              display: "flex",
            }}
          >
            Plan Beta
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 22,
              opacity: 0.7,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {tagline}
          </div>
        </div>

        <div
          style={{
            fontSize: title.length > 70 ? 56 : 64,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: -1,
            display: "flex",
            color: "#ffffff",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 24,
            color: "#fafafa",
            opacity: 0.85,
          }}
        >
          <div style={{ display: "flex" }}>theplanbeta.com</div>
          {readTime && (
            <>
              <div style={{ display: "flex", opacity: 0.4 }}>·</div>
              <div style={{ display: "flex" }}>{readTime}</div>
            </>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
