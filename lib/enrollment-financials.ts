// Enrollment-level financial tracking helpers
// BatchEnrollment is the financial unit of record; Student fields are cached aggregates

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { convertToEUR, convertToINR } from "@/lib/pricing"

const Decimal = Prisma.Decimal
const EXCHANGE_RATE = 104.5

/**
 * Recalculate financial fields on a single BatchEnrollment from its linked payments/refunds,
 * then sync the parent student's cached aggregates.
 */
export async function updateEnrollmentPaymentStatus(enrollmentId: string) {
  const enrollment = await prisma.batchEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      payments: {
        where: { status: "COMPLETED" },
        orderBy: { paymentDate: "desc" },
      },
      refunds: {
        where: { status: "PROCESSED" },
      },
    },
  })

  if (!enrollment) return

  const enrollmentCurrency = (enrollment.currency || "EUR") as "EUR" | "INR"

  // Sum payments, normalizing to enrollment currency
  const totalPaid = enrollment.payments.reduce((sum, payment) => {
    const paymentCurrency = (payment.currency || "EUR") as "EUR" | "INR"
    const amount = Number(payment.amount)
    let normalized = amount
    if (paymentCurrency !== enrollmentCurrency) {
      normalized = enrollmentCurrency === "EUR"
        ? convertToEUR(amount, paymentCurrency)
        : convertToINR(amount, paymentCurrency)
    }
    return sum.add(new Decimal(normalized.toFixed(2)))
  }, new Decimal(0))

  // Subtract processed refunds
  const totalRefunded = enrollment.refunds.reduce((sum, refund) => {
    const refundCurrency = (refund.currency || "EUR") as "EUR" | "INR"
    const amount = Number(refund.refundAmount)
    let normalized = amount
    if (refundCurrency !== enrollmentCurrency) {
      normalized = enrollmentCurrency === "EUR"
        ? convertToEUR(amount, refundCurrency)
        : convertToINR(amount, refundCurrency)
    }
    return sum.add(new Decimal(normalized.toFixed(2)))
  }, new Decimal(0))

  const netPaid = totalPaid.minus(totalRefunded)
  const finalPrice = new Decimal(enrollment.finalPrice.toString())
  const balance = finalPrice.minus(netPaid)

  // Determine payment status
  let paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" = "PENDING"
  if (netPaid.isZero() || netPaid.lessThan(0)) {
    paymentStatus = "PENDING"
  } else if (netPaid.greaterThanOrEqualTo(finalPrice)) {
    paymentStatus = "PAID"
  } else {
    paymentStatus = "PARTIAL"
  }

  // Overdue check: no payment in last 30 days and balance > 0
  const lastPayment = enrollment.payments[0]
  const daysSinceLast = lastPayment
    ? Math.floor((Date.now() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(enrollment.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24))

  if (balance.greaterThan(0) && daysSinceLast > 30) {
    paymentStatus = "OVERDUE"
  }

  // EUR equivalent
  const totalPaidEur = enrollmentCurrency === "EUR"
    ? netPaid
    : netPaid.dividedBy(new Decimal(EXCHANGE_RATE))

  await prisma.batchEnrollment.update({
    where: { id: enrollmentId },
    data: {
      totalPaid: netPaid,
      totalPaidEur,
      balance,
      paymentStatus,
    },
  })

  // Sync student aggregates
  await syncStudentFinancials(enrollment.studentId)
}

/**
 * Recompute Student-level cached financial aggregates from all their BatchEnrollments.
 */
export async function syncStudentFinancials(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      currency: true,
      attendanceRate: true,
      churnRisk: true,
      enrollmentDate: true,
      enrollments: {
        select: {
          originalPrice: true,
          discountApplied: true,
          finalPrice: true,
          totalPaid: true,
          totalPaidEur: true,
          balance: true,
          paymentStatus: true,
          currency: true,
          status: true,
        },
      },
    },
  })

  if (!student) return

  // If student has no enrollments, leave their fields as-is (legacy/unallocated)
  if (student.enrollments.length === 0) return

  const studentCurrency = (student.currency || "EUR") as "EUR" | "INR"

  // Aggregate from all enrollments (except DROPPED)
  let aggOriginalPrice = new Decimal(0)
  let aggDiscountApplied = new Decimal(0)
  let aggFinalPrice = new Decimal(0)
  let aggTotalPaid = new Decimal(0)
  let aggTotalPaidEur = new Decimal(0)
  let aggBalance = new Decimal(0)

  const statusPriority: Record<string, number> = {
    OVERDUE: 4,
    PARTIAL: 3,
    PENDING: 2,
    PAID: 1,
  }
  type PaymentStatusType = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE"
  let worstStatus: PaymentStatusType = "PAID"

  for (const enrollment of student.enrollments) {
    if (enrollment.status === "DROPPED") continue

    const eCurrency = (enrollment.currency || "EUR") as "EUR" | "INR"

    // Normalize to student currency
    const normalize = (val: Prisma.Decimal) => {
      const num = Number(val)
      if (eCurrency === studentCurrency) return new Decimal(num.toFixed(2))
      const converted = studentCurrency === "EUR"
        ? convertToEUR(num, eCurrency)
        : convertToINR(num, eCurrency)
      return new Decimal(converted.toFixed(2))
    }

    aggOriginalPrice = aggOriginalPrice.add(normalize(enrollment.originalPrice))
    aggDiscountApplied = aggDiscountApplied.add(normalize(enrollment.discountApplied))
    aggFinalPrice = aggFinalPrice.add(normalize(enrollment.finalPrice))
    aggTotalPaid = aggTotalPaid.add(normalize(enrollment.totalPaid))
    aggBalance = aggBalance.add(normalize(enrollment.balance))
    aggTotalPaidEur = aggTotalPaidEur.add(
      new Decimal(Number(enrollment.totalPaidEur || 0).toFixed(2))
    )

    // Track worst payment status
    const eStatus = enrollment.paymentStatus as PaymentStatusType
    if ((statusPriority[eStatus] || 0) > (statusPriority[worstStatus] || 0)) {
      worstStatus = eStatus
    }
  }

  // Churn risk (same logic as existing updateStudentPaymentStatus)
  let churnRisk: "LOW" | "MEDIUM" | "HIGH" = student.churnRisk as "LOW" | "MEDIUM" | "HIGH"
  const attendanceRate = Number(student.attendanceRate)
  const status: PaymentStatusType = worstStatus

  if (attendanceRate < 50) {
    churnRisk = "HIGH"
  } else if (attendanceRate < 75 && status === "OVERDUE") {
    churnRisk = "MEDIUM"
  } else if (attendanceRate < 75 || status === "OVERDUE") {
    churnRisk = "MEDIUM"
  } else {
    churnRisk = "LOW"
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      originalPrice: aggOriginalPrice,
      discountApplied: aggDiscountApplied,
      finalPrice: aggFinalPrice,
      totalPaid: aggTotalPaid,
      totalPaidEur: aggTotalPaidEur,
      balance: aggBalance,
      paymentStatus: worstStatus,
      churnRisk,
    },
  })
}

/**
 * Return all enrollments for a student with batch info and financial summaries.
 * Used by payment form and student detail page.
 */
export async function getStudentEnrollmentsWithFinancials(studentId: string) {
  return prisma.batchEnrollment.findMany({
    where: { studentId },
    include: {
      batch: {
        select: {
          id: true,
          batchCode: true,
          level: true,
          status: true,
        },
      },
    },
    orderBy: { enrollmentDate: "desc" },
  })
}
