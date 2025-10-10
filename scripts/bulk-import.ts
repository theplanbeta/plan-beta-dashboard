import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

/**
 * Bulk import students and leads from a JSON file
 *
 * Create a file named 'import-data.json' with this format:
 * {
 *   "students": [
 *     {
 *       "name": "John Doe",
 *       "whatsapp": "+1234567890",
 *       "email": "john@example.com",
 *       "currentLevel": "A1",
 *       "isCombo": false,
 *       "comboLevels": [],
 *       "originalPrice": 299,
 *       "finalPrice": 299,
 *       "currency": "EUR",
 *       "referralSource": "INSTAGRAM"
 *     }
 *   ],
 *   "leads": [
 *     {
 *       "name": "Jane Smith",
 *       "whatsapp": "+9876543210",
 *       "email": "jane@example.com",
 *       "source": "GOOGLE",
 *       "interestedLevel": "A2"
 *     }
 *   ]
 * }
 */

async function bulkImport() {
  const importPath = path.join(process.cwd(), 'import-data.json')

  if (!fs.existsSync(importPath)) {
    console.log('📝 No import-data.json found. Creating template...\n')

    const template = {
      students: [
        {
          name: "Example Student",
          whatsapp: "+1234567890",
          email: "student@example.com",
          currentLevel: "A1",
          isCombo: false,
          comboLevels: [],
          originalPrice: 299,
          finalPrice: 299,
          currency: "EUR",
          referralSource: "INSTAGRAM"
        }
      ],
      leads: [
        {
          name: "Example Lead",
          whatsapp: "+9876543210",
          email: "lead@example.com",
          source: "GOOGLE",
          interestedLevel: "A2",
          quality: "WARM"
        }
      ]
    }

    fs.writeFileSync(importPath, JSON.stringify(template, null, 2))
    console.log('✅ Template created at import-data.json')
    console.log('📝 Edit this file with your actual data, then run this script again.\n')
    return
  }

  console.log('📥 Starting bulk import...\n')

  try {
    const data = JSON.parse(fs.readFileSync(importPath, 'utf-8'))

    let studentsImported = 0
    let leadsImported = 0

    // Import students
    if (data.students && Array.isArray(data.students)) {
      for (const student of data.students) {
        const studentId = `STU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        await prisma.student.create({
          data: {
            studentId,
            name: student.name,
            whatsapp: student.whatsapp,
            email: student.email || null,
            currentLevel: student.currentLevel || 'NEW',
            isCombo: student.isCombo || false,
            comboLevels: student.comboLevels || [],
            originalPrice: student.originalPrice,
            discountApplied: student.discountApplied || 0,
            finalPrice: student.finalPrice,
            currency: student.currency || 'EUR',
            referralSource: student.referralSource,
            paymentStatus: student.paymentStatus || 'PENDING',
          }
        })
        studentsImported++
        console.log(`✓ Imported student: ${student.name}`)
      }
    }

    // Import leads
    if (data.leads && Array.isArray(data.leads)) {
      for (const lead of data.leads) {
        await prisma.lead.create({
          data: {
            name: lead.name,
            whatsapp: lead.whatsapp,
            email: lead.email || null,
            phone: lead.phone || null,
            source: lead.source,
            quality: lead.quality || 'WARM',
            interestedLevel: lead.interestedLevel || null,
            interestedCombo: lead.interestedCombo || null,
            interestedLevels: lead.interestedLevels || [],
          }
        })
        leadsImported++
        console.log(`✓ Imported lead: ${lead.name}`)
      }
    }

    console.log(`\n✅ Import completed!`)
    console.log(`   Students imported: ${studentsImported}`)
    console.log(`   Leads imported: ${leadsImported}`)

  } catch (error) {
    console.error('❌ Import failed:', error)
    throw error
  }
}

bulkImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
