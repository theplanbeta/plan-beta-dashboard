/**
 * One-time backfill script: migrate student financial fields to BatchEnrollment
 * and link existing payments/refunds to their enrollment.
 *
 * Run: npx tsx scripts/backfill-enrollment-financials.ts
 * Safe to re-run (skips enrollments that already have finalPrice > 0).
 */

import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()
const Decimal = Prisma.Decimal

async function main() {
  console.log("=== Enrollment Financials Backfill ===\n")

  const students = await prisma.student.findMany({
    include: {
      enrollments: {
        include: { batch: { select: { batchCode: true, level: true } } },
        orderBy: { enrollmentDate: "desc" },
      },
      payments: { orderBy: { paymentDate: "asc" } },
      refunds: true,
    },
  })

  let migrated = 0
  let skippedAlreadyDone = 0
  let skippedNoBatch = 0
  let createdEnrollments = 0
  let multiEnrollmentWarnings: string[] = []

  for (const student of students) {
    let enrollments = student.enrollments

    // Case D: No batch at all — skip
    if (!student.batchId && enrollments.length === 0) {
      skippedNoBatch++
      continue
    }

    // Case C: Has batchId but no enrollment — create one
    if (student.batchId && enrollments.length === 0) {
      const newEnrollment = await prisma.batchEnrollment.create({
        data: {
          studentId: student.id,
          batchId: student.batchId,
          enrollmentDate: student.enrollmentDate,
          status: student.completionStatus,
        },
        include: { batch: { select: { batchCode: true, level: true } } },
      })
      enrollments = [newEnrollment]
      createdEnrollments++
      console.log(`  Created missing enrollment for ${student.name} → ${newEnrollment.batch.batchCode}`)
    }

    // Find the primary enrollment (matches student.batchId, or most recent)
    const primaryEnrollment = enrollments.find(e => e.batchId === student.batchId) || enrollments[0]

    // Skip if primary enrollment already has financial data (re-run safety)
    if (Number(primaryEnrollment.finalPrice) > 0) {
      skippedAlreadyDone++
      continue
    }

    // Case B: Multiple enrollments — warn for review
    if (enrollments.length > 1) {
      multiEnrollmentWarnings.push(
        `${student.name} (${student.studentId}): ${enrollments.length} enrollments — financials assigned to ${primaryEnrollment.batch.batchCode}`
      )
    }

    // Copy student financial fields to primary enrollment
    await prisma.batchEnrollment.update({
      where: { id: primaryEnrollment.id },
      data: {
        originalPrice: student.originalPrice,
        discountApplied: student.discountApplied,
        finalPrice: student.finalPrice,
        currency: student.currency,
        eurEquivalent: student.eurEquivalent,
        exchangeRateUsed: student.exchangeRateUsed,
        totalPaid: student.totalPaid,
        totalPaidEur: student.totalPaidEur,
        balance: student.balance,
        paymentStatus: student.paymentStatus,
      },
    })

    // Link all payments to the primary enrollment
    if (student.payments.length > 0) {
      await prisma.payment.updateMany({
        where: {
          studentId: student.id,
          enrollmentId: null,
        },
        data: { enrollmentId: primaryEnrollment.id },
      })
    }

    // Link all refunds to the primary enrollment
    if (student.refunds.length > 0) {
      await prisma.refund.updateMany({
        where: {
          studentId: student.id,
          enrollmentId: null,
        },
        data: { enrollmentId: primaryEnrollment.id },
      })
    }

    migrated++
  }

  // Summary
  console.log(`\n=== Results ===`)
  console.log(`Total students: ${students.length}`)
  console.log(`Migrated: ${migrated}`)
  console.log(`Already done (skipped): ${skippedAlreadyDone}`)
  console.log(`No batch (skipped): ${skippedNoBatch}`)
  console.log(`Enrollments created: ${createdEnrollments}`)

  if (multiEnrollmentWarnings.length > 0) {
    console.log(`\n=== Multi-enrollment students (review) ===`)
    multiEnrollmentWarnings.forEach(w => console.log(`  ${w}`))
  }

  // Validation pass: spot-check that student aggregates match
  console.log(`\n=== Validation ===`)
  let mismatches = 0
  const sampleStudents = await prisma.student.findMany({
    where: { batchId: { not: null } },
    take: 20,
    include: {
      enrollments: {
        select: { finalPrice: true, totalPaid: true, balance: true },
      },
    },
  })

  for (const s of sampleStudents) {
    if (s.enrollments.length === 0) continue
    const enrollmentTotal = s.enrollments.reduce(
      (sum, e) => sum.add(new Decimal(e.totalPaid.toString())),
      new Decimal(0)
    )
    const studentTotal = new Decimal(s.totalPaid.toString())
    if (!enrollmentTotal.equals(studentTotal)) {
      console.log(`  MISMATCH: ${s.name} — student totalPaid=${studentTotal}, enrollment sum=${enrollmentTotal}`)
      mismatches++
    }
  }

  if (mismatches === 0) {
    console.log(`  All ${sampleStudents.length} sampled students match.`)
  } else {
    console.log(`  ${mismatches} mismatches found — review above.`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
