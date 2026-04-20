import { prisma } from "@/lib/prisma"

async function main() {
  const rows = await prisma.cVImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true, status: true, error: true, progress: true,
      createdAt: true, startedAt: true, updatedAt: true,
      seekerId: true, blobKey: true,
    },
  })
  console.log(`Found ${rows.length} recent CVImport rows:\n`)
  for (const r of rows) {
    const age = Math.round((Date.now() - new Date(r.createdAt).getTime()) / 1000)
    console.log(`[${r.status}] ${r.id} (${age}s old)`)
    if (r.error) console.log(`  error: ${r.error}`)
    if (r.progress) console.log(`  progress: ${r.progress}`)
    if (r.blobKey) console.log(`  blobKey: ${r.blobKey}`)
    console.log(`  seeker: ${r.seekerId}`)
    console.log()
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
