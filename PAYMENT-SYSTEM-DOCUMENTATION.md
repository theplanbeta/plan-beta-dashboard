# Payment System Documentation

## Overview
This document details all the ways payments can be recorded in the Plan Beta system and the critical data integrity rules that must be followed.

**CRITICAL RULE**: Student payment totals (`totalPaid`, `paymentStatus`, `balance`) must **ALWAYS** be calculated from Payment records. Never update these fields directly.

---

## ✅ CORRECT Payment Recording Paths

### 1. Direct Payment Recording (POST /api/payments)
**When to use:** Recording a new payment for an existing student

**Flow:**
1. User navigates to Dashboard → Payments → "Record New Payment"
2. Selects student, enters amount, method, transaction ID
3. Submits form → `POST /api/payments`
4. **Creates Payment record** (REQUIRED)
5. **Auto-updates student totals** via `updateStudentPaymentStatus()`

**Code location:** `/app/api/payments/route.ts` (lines 119-146)

**What it creates:**
- ✅ Payment record with COMPLETED status
- ✅ Auto-updates student.totalPaid, balance, paymentStatus
- ✅ Sends payment confirmation email (if enabled)
- ✅ Creates audit log

**Example:**
```typescript
POST /api/payments
{
  "studentId": "cmhhh7pey0003l404br8xj1pw",
  "amount": 134,
  "method": "UPI",
  "currency": "EUR",
  "status": "COMPLETED",
  "transactionId": "TXN123456"
}
```

---

### 2. Lead to Student Conversion with Payment (POST /api/invoices/[id]/pay-and-convert)
**When to use:** Converting a lead to student when they've paid the invoice

**Flow:**
1. User generates invoice for lead
2. Lead pays the invoice
3. User clicks "Mark Paid & Convert to Student"
4. Submits conversion form → `POST /api/invoices/[id]/pay-and-convert`
5. **Creates Student + Payment in transaction** (ATOMIC)

**Code location:** `/app/api/invoices/[id]/pay-and-convert/route.ts` (lines 175-289)

**What it creates (in transaction):**
- ✅ Student record with correct totalPaid, balance, paymentStatus (lines 216-238)
- ✅ Payment record (lines 259-270) **CRITICAL**
- ✅ Updates invoice status to PAID
- ✅ Links invoice to student
- ✅ Updates lead as CONVERTED
- ✅ Increments batch enrollment count
- ✅ Creates multiple audit logs
- ✅ Uses idempotency key to prevent duplicates

**Example:**
```typescript
POST /api/invoices/abc123/pay-and-convert
{
  "paidAmount": 134,
  "batchId": "cmhhh9yq50001kq04ehnks73y",
  "idempotencyKey": "unique-key-12345"
}
```

---

### 3. Direct Student Creation with Initial Payment (POST /api/students)
**When to use:** Creating a new student directly (not from lead) with an initial payment

**Flow:**
1. User navigates to Dashboard → Students → "Add Student"
2. Fills form including totalPaid field
3. Submits form → `POST /api/students`
4. **Creates Student + Payment in transaction** (if totalPaid > 0)

**Code location:** `/app/api/students/route.ts` (lines 173-236)

**What it creates (in transaction):**
- ✅ Student record (lines 175-211)
- ✅ Payment record IF totalPaid > 0 (lines 215-228) **CRITICAL**
- ✅ Sends welcome email (if enabled)
- ✅ Updates lead if converting from lead

**Example:**
```typescript
POST /api/students
{
  "name": "John Doe",
  "whatsapp": "1234567890",
  "email": "john@example.com",
  "originalPrice": 134,
  "totalPaid": 134,  // This will create a Payment record
  "batchId": "batch123",
  "currency": "EUR"
}
```

---

## ❌ INCORRECT Payment Recording Paths (NOW FIXED)

### 1. Lead Conversion without Payment (POST /api/leads/[id]/convert)
**When to use:** Converting a lead to student who HASN'T paid yet

**Code location:** `/app/api/leads/[id]/convert/route.ts`

**What it creates:**
- ✅ Student with totalPaid: 0, paymentStatus: PENDING
- ❌ **NO Payment record** (correct - student hasn't paid)

**Follow-up required:**
- Use `POST /api/payments` to record payment when student pays

---

### 2. ~~Student Edit Form (PUT /api/students/[id])~~ **[FIXED]**
**Previously:** Allowed manually editing totalPaid and paymentStatus
**Now:** These fields are READ-ONLY and preserved from database

**Code location:** `/app/api/students/[id]/route.ts` (lines 113-156)

**What was wrong:**
```typescript
// ❌ OLD CODE (BUGGY):
totalPaid: new Decimal(body.totalPaid)  // Allowed manual updates
paymentStatus: body.paymentStatus       // Allowed manual updates
```

**What is now fixed:**
```typescript
// ✅ NEW CODE (CORRECT):
const currentStudent = await prisma.student.findUnique({
  where: { id },
  select: { totalPaid: true, paymentStatus: true }
})
const totalPaid = new Decimal(currentStudent.totalPaid.toString())
// totalPaid and paymentStatus IGNORED from request body
```

**Frontend fix:** `/app/dashboard/students/[id]/edit/page.tsx`
- Total Paid field: `disabled` and `readOnly`
- Payment Status field: `disabled`
- Helpful text: "Calculated from payment records. Record new payment →"

---

## 🔒 Data Integrity Rules

### Rule 1: Single Source of Truth
**Payment records are the ONLY source of truth for payment totals.**

Student fields are DERIVED from payments:
- `totalPaid` = SUM of all Payment.amount where status = COMPLETED
- `balance` = finalPrice - totalPaid
- `paymentStatus` = Auto-calculated based on balance and due dates

### Rule 2: Atomic Operations
**Student creation with payment MUST use database transactions:**

```typescript
await prisma.$transaction(async (tx) => {
  const student = await tx.student.create({ /* ... */ })

  if (totalPaid > 0) {
    await tx.payment.create({
      studentId: student.id,
      amount: totalPaid,
      // ... other fields
    })
  }
})
```

### Rule 3: Never Skip Payment Records
**If totalPaid > 0, a Payment record MUST exist.**

Consequences of skipping:
- ❌ Receipt generation fails (requires Payment records)
- ❌ Payment history is lost
- ❌ Financial reports are incorrect
- ❌ Audit trail is incomplete

### Rule 4: Update Payment Totals via Helper Function
**Use `updateStudentPaymentStatus()` after creating/deleting payments:**

```typescript
// After creating payment
await updateStudentPaymentStatus(studentId)

// This function:
// 1. Sums all payments for student
// 2. Calculates balance
// 3. Determines payment status (PENDING/PARTIAL/PAID/OVERDUE)
// 4. Updates student record atomically
```

---

## 📊 Payment Status Calculation Logic

```typescript
function calculatePaymentStatus(finalPrice: Decimal, totalPaid: Decimal): PaymentStatus {
  const balance = finalPrice.minus(totalPaid)

  if (balance.lessThanOrEqualTo(0)) {
    return 'PAID'
  } else if (totalPaid.greaterThan(0)) {
    return 'PARTIAL'
  } else if (isOverdue(enrollmentDate, daysUntilOverdue)) {
    return 'OVERDUE'
  } else {
    return 'PENDING'
  }
}
```

---

## 🛠️ How the Bug Happened (Fixed)

### The Problem
Marketing team reported: "Dhanvin Vinod and Alet have no option to generate receipts"

### Root Cause Analysis
1. Leads were converted to students via `/api/leads/[id]/convert`
   - Created students with `totalPaid: 0`, `paymentStatus: PENDING`
   - Correctly did NOT create Payment records (students hadn't paid)

2. Marketing team edited students via edit form
   - Manually changed "Total Paid" from €0 to €134 (Dhanvin) and €16,000 (Alet)
   - Manually changed "Payment Status" from PENDING to PAID
   - Edit API allowed these updates **without creating Payment records**

3. Result:
   - ✅ Student shows as PAID with totalPaid > 0
   - ❌ NO Payment records exist
   - ❌ Receipt generation fails (requires Payment.id)

### The Fix (Implemented)
**Frontend (`/app/dashboard/students/[id]/edit/page.tsx`):**
- Total Paid: Made `disabled` and `readOnly`
- Payment Status: Made `disabled`
- Added help text: "Calculated from payment records"
- Added link: "Record new payment →"

**Backend (`/app/api/students/[id]/route.ts`):**
- Fetch current student data before update
- Preserve `totalPaid` from database (ignore request body)
- Preserve `paymentStatus` from database (ignore request body)
- Only allow updating: pricing (originalPrice, discountApplied), demographics, batch assignment

**Data Fix (`scripts/fix-missing-payments.ts`):**
- Created missing Payment records for 6 affected students
- Used enrollment date as payment date
- Added notes: "Initial payment - retroactively added to fix data integrity"
- All receipts can now be generated ✅

---

## 🔍 Monitoring & Prevention

### How to Detect This Issue
Run the diagnostic script:
```bash
# Dry-run (safe, no changes):
npx tsx scripts/fix-missing-payments.ts

# Look for output:
# "⚠️ X students need payment records created"
```

### Prevention Checklist
- ✅ Never update `totalPaid` or `paymentStatus` directly
- ✅ Always use `POST /api/payments` to record payments
- ✅ Use transactions when creating students with payments
- ✅ Run `fix-missing-payments` script monthly as a health check
- ✅ Educate marketing team on proper payment recording flow

---

## 📝 Common Scenarios & Solutions

### Scenario 1: "I need to correct a student's total paid amount"
**❌ Wrong:** Edit student form and change "Total Paid"
**✅ Correct:**
1. Check payment records in student detail page
2. If payment is wrong: Delete incorrect payment, create new one
3. If payment is missing: Use "Record New Payment"

### Scenario 2: "Lead converted but payment wasn't recorded"
**✅ Correct flow:**
1. Navigate to student detail page
2. Click "Record New Payment"
3. Enter payment details
4. System auto-updates totals and enables receipt generation

### Scenario 3: "Student shows wrong payment status"
**✅ Correct flow:**
1. Check payment records (Dashboard → Payments)
2. Verify all payments are recorded with COMPLETED status
3. If totals are wrong, use `scripts/fix-missing-payments.ts` to diagnose
4. System auto-calculates status based on payment records

---

## 🚀 Quick Reference

### Recording a Payment
```bash
Dashboard → Payments → "Record New Payment"
OR
Dashboard → Students → [Student] → "Record New Payment"
```

### Checking Payment Records
```bash
Dashboard → Payments → Filter by student
OR
Dashboard → Students → [Student] → "Payments" tab
```

### Generating a Receipt
```bash
Dashboard → Payments → [Payment] → "Generate Receipt"
```

### Running Diagnostics
```bash
# Check for data integrity issues:
npx tsx scripts/fix-missing-payments.ts

# Fix issues (after review):
npx tsx scripts/fix-missing-payments.ts --execute
```

---

## 📚 Related Files

### API Routes
- `/app/api/payments/route.ts` - Payment CRUD
- `/app/api/students/route.ts` - Student creation
- `/app/api/students/[id]/route.ts` - Student updates
- `/app/api/invoices/[id]/pay-and-convert/route.ts` - Lead conversion with payment
- `/app/api/leads/[id]/convert/route.ts` - Lead conversion without payment

### Scripts
- `/scripts/fix-missing-payments.ts` - Diagnose and fix missing payment records
- `/scripts/backfill-student-payments.ts` - Alternative backfill script

### Frontend
- `/app/dashboard/payments/new/page.tsx` - Record payment form
- `/app/dashboard/students/[id]/edit/page.tsx` - Student edit form (payment fields now read-only)
- `/app/dashboard/payments/[id]/page.tsx` - Payment detail + receipt generation

---

## 🎯 Key Takeaways

1. **Payment records are the source of truth** - Never bypass them
2. **Use proper APIs** - POST /api/payments for all payment recording
3. **Transactions are critical** - Always use them when creating students with payments
4. **Frontend validation is not enough** - Backend must enforce rules
5. **Receipts require payment records** - No payment record = no receipt
6. **Monitor regularly** - Run diagnostics monthly
7. **Educate users** - Marketing team needs to know proper flows

---

**Last Updated:** 2024-11-09
**Status:** ✅ All bugs fixed, prevention measures in place
**Affected Students:** 6 (all fixed via backfill script)
**Future Risk:** LOW (frontend + backend protections implemented)
