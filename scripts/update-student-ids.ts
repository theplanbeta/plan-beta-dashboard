import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function sanitizeFirstName(name: string): string {
  // Get first name, convert to lowercase, remove special characters
  const firstName = name.trim().split(/\s+/)[0]
  return firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function main() {
  // Get all students
  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      studentId: true,
    },
    orderBy: {
      createdAt: 'asc', // Older students get lower numbers
    },
  })

  console.log(`Found ${students.length} students to process\n`)

  // Group by first name and assign sequential IDs
  const nameCounters: Record<string, number> = {}
  const updates: Array<{ id: string; oldId: string; newId: string; name: string }> = []

  for (const student of students) {
    const sanitizedName = sanitizeFirstName(student.name)

    // Increment counter for this name
    if (!nameCounters[sanitizedName]) {
      nameCounters[sanitizedName] = 1
    } else {
      nameCounters[sanitizedName]++
    }

    const newStudentId = `${sanitizedName}${String(nameCounters[sanitizedName]).padStart(2, '0')}`

    updates.push({
      id: student.id,
      oldId: student.studentId,
      newId: newStudentId,
      name: student.name,
    })
  }

  // Show preview
  console.log('Preview of changes:')
  console.log('-------------------')
  updates.forEach(u => {
    console.log(`${u.name.padEnd(30)} | ${u.oldId.padEnd(20)} -> ${u.newId}`)
  })

  console.log(`\nTotal updates: ${updates.length}`)
  console.log('\nStarting updates...\n')

  // Apply updates
  let successCount = 0
  let errorCount = 0

  for (const update of updates) {
    try {
      await prisma.student.update({
        where: { id: update.id },
        data: { studentId: update.newId },
      })
      console.log(`✓ Updated: ${update.name} -> ${update.newId}`)
      successCount++
    } catch (error: any) {
      console.error(`✗ Failed: ${update.name} - ${error.message}`)
      errorCount++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`✓ Successfully updated: ${successCount}`)
  console.log(`✗ Failed: ${errorCount}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
