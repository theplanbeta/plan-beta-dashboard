# Plan Beta Dashboard - Marketing Team Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Lead Management](#lead-management)
3. [Student Enrollment](#student-enrollment)
4. [Invoice & Payment Tracking](#invoice--payment-tracking)
5. [Batch Management](#batch-management)
6. [Referral Tracking](#referral-tracking)
7. [Reports & Analytics](#reports--analytics)
8. [Quick Reference](#quick-reference)

---

## Getting Started

### Accessing the Dashboard

**Production URL:** https://plan-beta-dashboard-8a8rjxx0y-theplanbetas-projects.vercel.app

**Login Credentials:**
- Your email address (provided by admin)
- Your password

### Dashboard Overview

After logging in, you'll see:
- **Quick Stats**: Total students, pending payments, active batches
- **Recent Activity**: Latest student enrollments and payments
- **Navigation Menu**: Access all features from the left sidebar

---

## Lead Management

### Adding a New Lead

1. Click **"Leads"** in the sidebar
2. Click **"+ Add Lead"** button
3. Fill in the form:
   - **Name** (required)
   - **WhatsApp Number** (required) - Format: +919876543210
   - **Email** (optional but recommended)
   - **Source**: How they found us (Instagram, Facebook, Referral, etc.)
   - **Interested Level**: A1, A2, B1, or B2
   - **Interested Type**: A1 Only, A1 to B1, or A1 to B2
   - **Notes**: Any additional information
4. Click **"Add Lead"**

### Managing Leads

**View All Leads:**
- Go to **Leads** page
- See status: New, Contacted, Trial Scheduled, Trial Attended, Converted, or Lost
- Click on any lead to view detailed information

**Update Lead Status:**
1. Click on a lead name
2. Click **"Edit"** button
3. Update status and add notes
4. Click **"Save Changes"**

**Schedule Trial Class:**
1. Open lead details
2. Set **"Trial Attended Date"** to schedule
3. Update status to **"Trial Scheduled"**

### Converting Leads to Students

**Option 1: Generate Invoice First (Recommended)**
1. Open lead details
2. Click **"Generate Invoice"**
3. Fill in pricing details:
   - Course level and type
   - Original price
   - Discount (if any)
   - Currency (₹ or €)
4. Invoice will be generated with QR code for payment
5. Share invoice PDF with the lead via WhatsApp/Email

**Option 2: Direct Conversion**
1. Open lead details
2. Click **"Convert to Student"**
3. Select batch (if available)
4. Enter enrollment details
5. Click **"Convert"**

---

## Student Enrollment

### Adding a New Student Directly

1. Click **"Students"** in the sidebar
2. Click **"+ Add Student"** button
3. Fill in the form:
   - **Name** (required)
   - **WhatsApp** (required)
   - **Email** (optional)
   - **Enrollment Type**: A1 Only, A1 to B1, or A1 to B2
   - **Current Level**: NEW, A1, A2, B1, or B2
   - **Batch**: Assign to an existing batch (optional)
   - **Pricing**: Original price, discount, final price
   - **Currency**: ₹ (INR) or € (EUR)
   - **Referral Source**: How they found us
4. Click **"Add Student"**

### Managing Students

**View Student Details:**
1. Click **"Students"**
2. Click on student name
3. View:
   - Personal information
   - Payment status and history
   - Batch assignment
   - Attendance records

**Edit Student Information:**
1. Open student details
2. Click **"Edit"** button
3. Update information
4. Click **"Save Changes"**

**Payment Status Indicators:**
- 🟢 **PAID**: Fully paid
- 🟡 **PARTIAL**: Partially paid, balance remaining
- 🔴 **UNPAID**: No payment received yet

---

## Invoice & Payment Tracking

### Invoice Management

**View All Invoices:**
- Go to **Leads** → Click on lead → View invoices section
- Each invoice shows:
  - Invoice number
  - Amount
  - Status (Pending/Paid)
  - Download PDF button

**Generate Invoice for Lead:**
1. Open lead details
2. Click **"Generate Invoice"**
3. Fill in course and pricing details
4. Invoice PDF is automatically generated with:
   - Student details
   - Course information
   - Payment amount
   - UPI QR code
   - Bank details
5. Download and share with student

### Recording Payments

**Add Payment:**
1. Click **"Payments"** in sidebar
2. Click **"+ Record Payment"**
3. Select student from dropdown
4. Enter details:
   - **Amount**: Payment received
   - **Date**: When payment was received
   - **Method**: Cash, Bank Transfer, UPI, Card, or Other
   - **Transaction ID**: Reference number (optional)
   - **Status**: Completed, Pending, or Failed
   - **Notes**: Any additional information
5. Click **"Record Payment"**

**View Remaining Balance:**
- The form automatically shows remaining balance after payment
- Student's payment status updates automatically

**Payment History:**
- Go to **Payments** page to see all payments
- Filter by student, date, or status
- Click on payment to view details

---

## Batch Management

### Creating a New Batch

1. Click **"Batches"** in sidebar
2. Click **"+ Create Batch"**
3. Fill in details:
   - **Batch Code**: e.g., "A1-SEPT-2025-WE"
   - **Level**: A1, A2, B1, or B2
   - **Schedule**: Days and timings
   - **Teacher**: Assign instructor (optional)
   - **Start Date** & **End Date**
   - **Max Students**: Capacity limit
   - **Status**: Planned, Active, or Completed
4. Click **"Create Batch"**

### Managing Batches

**View Batch Details:**
1. Click **"Batches"**
2. Click on batch code
3. View:
   - Student list
   - Schedule
   - Attendance records
   - Teacher information

**Add Students to Batch:**
1. When adding/editing a student, select the batch from dropdown
2. Batch enrollment count updates automatically

---

## Referral Tracking

### Recording Referrals

1. Click **"Referrals"** in sidebar
2. Click **"+ Add Referral"**
3. Fill in:
   - **Referrer**: Existing student who referred
   - **Referred Student**: New student details
   - **Referral Bonus**: Reward amount (if any)
   - **Notes**: Additional information
4. Click **"Add Referral"**

### Managing Referrals

- View all referrals and their status
- Track referral bonuses
- Update referral status (Pending, Bonus Paid, etc.)

---

## Reports & Analytics

### Dashboard Analytics

**Main Dashboard Shows:**
- Total students enrolled
- Revenue (total and this month)
- Pending payments
- Active batches
- Conversion rate (leads to students)

### Insights Page

Access **Insights** from sidebar to see:

**Financial Metrics:**
- Total revenue
- Pending payments
- Collection rate
- Revenue by month

**Student Metrics:**
- Total students
- New enrollments this month
- Students by level (A1, A2, B1, B2)
- Students by enrollment type

**Lead Metrics:**
- Total leads
- Conversion rate
- Leads by source
- Leads by status

**Batch Metrics:**
- Active batches
- Average batch size
- Batches by level

### Activity Log

- Click **"Activity"** in sidebar
- View all system activities:
  - New leads added
  - Students enrolled
  - Payments received
  - Invoices generated
  - System changes
- Filter by date range

---

## Quick Reference

### Common Tasks Checklist

**Daily Tasks:**
- [ ] Check new leads
- [ ] Follow up with Trial Scheduled leads
- [ ] Record any payments received
- [ ] Update lead statuses

**Weekly Tasks:**
- [ ] Review pending payments
- [ ] Convert qualified leads to students
- [ ] Generate invoices for new enrollments
- [ ] Update batch information

**Monthly Tasks:**
- [ ] Review analytics and conversion rates
- [ ] Update batch schedules
- [ ] Plan new batch launches

### Status Definitions

**Lead Status:**
- **NEW**: Just added, not contacted yet
- **CONTACTED**: First contact made
- **TRIAL_SCHEDULED**: Trial class scheduled
- **TRIAL_ATTENDED**: Attended trial class
- **CONVERTED**: Became a paying student
- **LOST**: Did not convert

**Payment Status:**
- **PAID**: Fully paid
- **PARTIAL**: Partially paid
- **UNPAID**: No payment received

**Batch Status:**
- **PLANNED**: Scheduled but not started
- **ACTIVE**: Currently running
- **COMPLETED**: Finished

### Important Tips

1. **Always Use WhatsApp Format**: +919876543210 (include country code)
2. **Update Lead Status Regularly**: Keep pipeline accurate
3. **Generate Invoices Before Payment**: Proper documentation
4. **Record Payments Immediately**: Maintain accurate records
5. **Assign Students to Batches**: Better tracking and management
6. **Use Notes Field**: Document important details
7. **Check Insights Weekly**: Monitor business health

### Getting Help

**Need Assistance?**
- Contact admin/IT team
- Check activity log for recent changes
- Review this guide for step-by-step instructions

**Common Issues:**
- **Can't find a student?** Use search box at top
- **Payment not reflecting?** Check if recorded correctly
- **Invoice not generating?** Ensure all required fields filled
- **Batch full?** Increase max students or create new batch

---

## Best Practices

### Lead Management
✅ **DO:**
- Respond to new leads within 24 hours
- Schedule trial classes within 3-5 days
- Follow up after trial within 1 day
- Document all interactions in notes

❌ **DON'T:**
- Skip updating lead status
- Forget to record trial attendance
- Leave leads in "New" status too long

### Payment Management
✅ **DO:**
- Generate invoice before collecting payment
- Record payments on the same day
- Include transaction ID for bank transfers
- Document payment method accurately

❌ **DON'T:**
- Forget to update payment status
- Skip transaction reference numbers
- Delay payment recording

### Student Enrollment
✅ **DO:**
- Assign students to appropriate batches
- Keep contact information updated
- Track enrollment type accurately
- Monitor payment schedules

❌ **DON'T:**
- Forget to assign batches
- Skip WhatsApp numbers (critical for communication)
- Ignore payment due dates

---

## Keyboard Shortcuts

- **Ctrl/Cmd + K**: Quick search
- **Esc**: Close modals/dialogs
- **Tab**: Navigate form fields

---

## Support & Updates

**Dashboard Updates:**
The dashboard is regularly updated with new features. Check the activity log and announcements for updates.

**Technical Issues:**
Report any bugs or issues to the admin team immediately.

**Feature Requests:**
Have ideas for improvement? Share feedback with the admin team.

---

**Last Updated:** January 2025
**Version:** 1.0
