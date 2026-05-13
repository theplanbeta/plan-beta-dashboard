import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import { logSuccess } from "@/lib/audit"
import { AuditAction } from "@prisma/client"

// PATCH /api/blog/[id] — update a blog post or move it through the approval workflow.
//
// Workflow actions (mutually exclusive — only one per request):
//   action: "submit"  — MARKETING/FOUNDER submits a DRAFT for review
//   action: "approve" — FOUNDER only; moves to APPROVED (eligible to publish)
//   action: "reject"  — FOUNDER only; moves to REJECTED with reviewNotes
//
// Plain field edits (title, content, etc.) are always allowed for users with
// content:update permission. `published: true` is gated on approvalStatus === APPROVED.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkPermission("content", "update")
  if (!auth.authorized) return auth.response

  const session = await getServerSession(authOptions)
  const userRole = session?.user?.role
  const userEmail = session?.user?.email || "unknown"

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
    action,
    reviewNotes,
    readerProfile,
  } = body

  const VALID_PROFILES = new Set([
    "nurse",
    "engineer",
    "it",
    "student",
    "visa-seeker",
    "general",
  ])

  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { approvalStatus: true, publishedAt: true, published: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}

  // Handle workflow actions first — they set approvalStatus and lock certain fields.
  if (action === "submit") {
    updateData.approvalStatus = "PENDING_REVIEW"
    updateData.submittedAt = new Date()
    updateData.submittedBy = userEmail
  } else if (action === "approve") {
    if (userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Only FOUNDER can approve blog posts" },
        { status: 403 }
      )
    }
    updateData.approvalStatus = "APPROVED"
    updateData.reviewedAt = new Date()
    updateData.reviewedBy = userEmail
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes
  } else if (action === "reject") {
    if (userRole !== "FOUNDER") {
      return NextResponse.json(
        { error: "Only FOUNDER can reject blog posts" },
        { status: 403 }
      )
    }
    updateData.approvalStatus = "REJECTED"
    updateData.reviewedAt = new Date()
    updateData.reviewedBy = userEmail
    updateData.reviewNotes = reviewNotes || null
    // If a rejected post was live, take it down.
    if (existing.published) {
      updateData.published = false
    }
  }

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
  if (readerProfile !== undefined) {
    if (!VALID_PROFILES.has(readerProfile)) {
      return NextResponse.json(
        { error: `Invalid readerProfile. Must be one of: ${Array.from(VALID_PROFILES).join(", ")}` },
        { status: 400 }
      )
    }
    updateData.readerProfile = readerProfile
  }

  if (published !== undefined && action === undefined) {
    if (published === true) {
      // Approval gate: cannot publish unless APPROVED (either pre-existing or via action=approve this turn).
      const effectiveStatus = updateData.approvalStatus || existing.approvalStatus
      if (effectiveStatus !== "APPROVED") {
        return NextResponse.json(
          {
            error:
              "Post must be approved before publishing. Submit it for review, then ask a FOUNDER to approve.",
            currentStatus: effectiveStatus,
          },
          { status: 400 }
        )
      }
      updateData.published = true
      if (!existing.publishedAt) updateData.publishedAt = new Date()
    } else {
      updateData.published = false
    }
  }

  try {
    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData,
    })

    // Audit governance actions (submit/approve/reject) and publish toggles.
    // Non-fatal — never block the response on logging failure.
    try {
      if (action === "submit") {
        await logSuccess(AuditAction.BLOG_SUBMITTED, `Submitted for review: "${post.title}"`, {
          entityType: "BlogPost",
          entityId: post.id,
          request,
        })
      } else if (action === "approve") {
        await logSuccess(AuditAction.BLOG_APPROVED, `Approved: "${post.title}"`, {
          entityType: "BlogPost",
          entityId: post.id,
          metadata: { reviewedBy: userEmail },
          request,
        })
      } else if (action === "reject") {
        await logSuccess(AuditAction.BLOG_REJECTED, `Rejected: "${post.title}"`, {
          entityType: "BlogPost",
          entityId: post.id,
          metadata: { reviewedBy: userEmail, reviewNotes: reviewNotes || null },
          request,
        })
      } else if ("published" in updateData) {
        await logSuccess(
          updateData.published ? AuditAction.BLOG_PUBLISHED : AuditAction.BLOG_UNPUBLISHED,
          `${updateData.published ? "Published" : "Unpublished"}: "${post.title}"`,
          { entityType: "BlogPost", entityId: post.id, request }
        )
      }
    } catch (e) {
      console.warn("Blog audit log failed (non-fatal):", e)
    }

    // Bust ISR cache whenever the post's public visibility or content changes,
    // so newly-approved / newly-edited posts appear on /blog and /blog/[slug]
    // without waiting for the 1-hour revalidate window.
    const visibilityChanged =
      "published" in updateData ||
      updateData.approvalStatus === "REJECTED" ||
      "slug" in updateData
    const contentChanged =
      "title" in updateData ||
      "excerpt" in updateData ||
      "content" in updateData ||
      "featured" in updateData ||
      "readerProfile" in updateData
    if (visibilityChanged || contentChanged) {
      try {
        revalidatePath("/blog", "page")
        revalidatePath(`/blog/${post.slug}`, "page")
        revalidatePath("/", "page")
      } catch (e) {
        console.warn("revalidatePath failed (non-fatal):", e)
      }
    }

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
