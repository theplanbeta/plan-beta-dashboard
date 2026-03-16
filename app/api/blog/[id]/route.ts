import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"

// PATCH /api/blog/[id] — update a blog post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("content", "update")
  if (!auth.authorized) return auth.response

  const { id } = await params

  const body = await request.json()
  const {
    title,
    excerpt,
    content,
    category,
    tags,
    metaTitle,
    metaDescription,
    targetKeyword,
    readTime,
    published,
    featured,
    author,
    slug,
  } = body

  // Build update data — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (excerpt !== undefined) updateData.excerpt = excerpt
  if (content !== undefined) updateData.content = content
  if (category !== undefined) updateData.category = category
  if (tags !== undefined) updateData.tags = tags
  if (metaTitle !== undefined) updateData.metaTitle = metaTitle
  if (metaDescription !== undefined) updateData.metaDescription = metaDescription
  if (targetKeyword !== undefined) updateData.targetKeyword = targetKeyword
  if (readTime !== undefined) updateData.readTime = readTime
  if (featured !== undefined) updateData.featured = featured
  if (author !== undefined) updateData.author = author
  if (slug !== undefined) updateData.slug = slug

  // Handle publish/unpublish
  if (published !== undefined) {
    updateData.published = published
    if (published && !body.publishedAt) {
      // Set publishedAt when publishing for the first time
      const existing = await prisma.blogPost.findUnique({
        where: { id },
        select: { publishedAt: true },
      })
      if (!existing?.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }
    if (!published) {
      // Optionally keep publishedAt for re-publishing
    }
  }

  try {
    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error("Blog update error:", error)
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    )
  }
}

// DELETE /api/blog/[id] — delete a blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("content", "delete")
  if (!auth.authorized) return auth.response

  const { id } = await params

  try {
    await prisma.blogPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Blog delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    )
  }
}
