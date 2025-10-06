-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FOUNDER', 'MARKETING', 'TEACHER');

-- CreateEnum
CREATE TYPE "EnrollmentType" AS ENUM ('A1_ONLY', 'FOUNDATION_A1_A2', 'CAREER_A1_A2_B1', 'COMPLETE_PATHWAY');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('NEW', 'A1', 'A2', 'B1', 'B2');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'PARTIAL', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'UPI', 'CASH', 'CARD');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('META_ADS', 'INSTAGRAM', 'GOOGLE', 'ORGANIC', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNING', 'FILLING', 'FULL', 'RUNNING', 'COMPLETED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChurnRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TEACHER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentLevel" "Level" NOT NULL DEFAULT 'NEW',
    "enrollmentType" "EnrollmentType" NOT NULL,
    "batchId" TEXT,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "discountApplied" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "totalPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "referralSource" "ReferralSource" NOT NULL,
    "referredById" TEXT,
    "trialAttended" BOOLEAN NOT NULL DEFAULT false,
    "trialDate" TIMESTAMP(3),
    "classesAttended" INTEGER NOT NULL DEFAULT 0,
    "totalClasses" INTEGER NOT NULL DEFAULT 0,
    "attendanceRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lastClassDate" TIMESTAMP(3),
    "avgQuizScore" DECIMAL(5,2),
    "completionStatus" "CompletionStatus" NOT NULL DEFAULT 'ACTIVE',
    "churnRisk" "ChurnRisk" NOT NULL DEFAULT 'LOW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "schedule" TEXT NOT NULL,
    "teacherId" TEXT,
    "totalSeats" INTEGER NOT NULL DEFAULT 10,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "fillRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'PLANNING',
    "revenueTarget" DECIMAL(10,2) NOT NULL,
    "revenueActual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "teacherCost" DECIMAL(10,2) NOT NULL,
    "profit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fillWarning" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT,
    "invoiceSent" BOOLEAN NOT NULL DEFAULT false,
    "studentId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3),
    "month1Complete" BOOLEAN NOT NULL DEFAULT false,
    "payoutAmount" DECIMAL(10,2) NOT NULL DEFAULT 2000,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payoutDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upsell" (
    "id" TEXT NOT NULL,
    "fromLevel" "Level" NOT NULL,
    "toLevel" "Level" NOT NULL,
    "studentId" TEXT NOT NULL,
    "currentProgress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "lastEmailDate" TIMESTAMP(3),
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionDate" TIMESTAMP(3),
    "additionalRevenue" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upsell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dailyRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monthlyRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "newEnrollments" INTEGER NOT NULL DEFAULT 0,
    "totalActiveStudents" INTEGER NOT NULL DEFAULT 0,
    "batchesFull" INTEGER NOT NULL DEFAULT 0,
    "batchesFilling" INTEGER NOT NULL DEFAULT 0,
    "batchesRunning" INTEGER NOT NULL DEFAULT 0,
    "studentsAtRisk" INTEGER NOT NULL DEFAULT 0,
    "studentsDropped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_whatsapp_key" ON "Student"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_studentId_idx" ON "Student"("studentId");

-- CreateIndex
CREATE INDEX "Student_whatsapp_idx" ON "Student"("whatsapp");

-- CreateIndex
CREATE INDEX "Student_email_idx" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_batchId_idx" ON "Student"("batchId");

-- CreateIndex
CREATE INDEX "Student_enrollmentDate_idx" ON "Student"("enrollmentDate");

-- CreateIndex
CREATE INDEX "Student_paymentStatus_idx" ON "Student"("paymentStatus");

-- CreateIndex
CREATE INDEX "Student_churnRisk_idx" ON "Student"("churnRisk");

-- CreateIndex
CREATE INDEX "Student_currentLevel_idx" ON "Student"("currentLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchCode_key" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_batchCode_idx" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_level_idx" ON "Batch"("level");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_startDate_idx" ON "Batch"("startDate");

-- CreateIndex
CREATE INDEX "Batch_teacherId_idx" ON "Batch"("teacherId");

-- CreateIndex
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");

-- CreateIndex
CREATE INDEX "Attendance_batchId_idx" ON "Attendance"("batchId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_present_idx" ON "Attendance"("present");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_batchId_date_key" ON "Attendance"("studentId", "batchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceNumber_key" ON "Payment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_invoiceNumber_idx" ON "Payment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_refereeId_idx" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_payoutStatus_idx" ON "Referral"("payoutStatus");

-- CreateIndex
CREATE INDEX "Referral_month1Complete_idx" ON "Referral"("month1Complete");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_refereeId_key" ON "Referral"("referrerId", "refereeId");

-- CreateIndex
CREATE INDEX "Upsell_studentId_idx" ON "Upsell"("studentId");

-- CreateIndex
CREATE INDEX "Upsell_converted_idx" ON "Upsell"("converted");

-- CreateIndex
CREATE INDEX "Upsell_currentProgress_idx" ON "Upsell"("currentProgress");

-- CreateIndex
CREATE INDEX "EmailQueue_status_idx" ON "EmailQueue"("status");

-- CreateIndex
CREATE INDEX "EmailQueue_scheduledFor_idx" ON "EmailQueue"("scheduledFor");

-- CreateIndex
CREATE INDEX "EmailQueue_to_idx" ON "EmailQueue"("to");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_date_key" ON "DailyMetrics"("date");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_idx" ON "DailyMetrics"("date");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upsell" ADD CONSTRAINT "Upsell_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
