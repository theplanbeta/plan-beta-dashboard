/**
 * One-shot backfill for the BlogPost.approvalStatus column.
 *
 * After running `npx prisma db push` to add the column, run this once:
 *   npx tsx scripts/backfill-blog-approval.ts
 *
 * It marks every currently-published post as APPROVED so the new approval
 * gate doesn't silently take them down on the next edit. Unpublished posts
 * default to DRAFT via the schema, so they don't need to be touched.
 */
import { prisma } from "@/lib/prisma"

async function main() {
  const published = await prisma.blogPost.updateMany({
    where: { published: true, approvalStatus: "DRAFT" },
    data: {
      approvalStatus: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: "system-backfill",
      reviewNotes: "Backfilled — already published before the approval workflow shipped.",
    },
  })

  console.log(`Marked ${published.count} previously-published posts as APPROVED.`)

  const totals = await prisma.blogPost.groupBy({
    by: ["approvalStatus"],
    _count: { id: true },
  })
  console.log("Current status counts:")
  for (const t of totals) {
    console.log(`  ${t.approvalStatus}: ${t._count.id}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
