# Email Automation System Documentation

## Overview

The Plan Beta School Management System now includes a comprehensive email automation system using Resend for reliable email delivery. This document outlines all email features, templates, triggers, and configuration.

## Features Implemented

### 1. Email Service Integration ✓

- **Provider:** Resend (reliable, cost-effective email API)
- **Location:** `lib/email.ts`
- **Features:**
  - Template-based emails
  - Batch email support
  - Error handling and logging
  - HTML formatted emails

### 2. Email Templates ✓

All templates are professionally designed with responsive HTML and include the Plan Beta branding:

#### Welcome Email (`student-welcome`)
- **Trigger:** New student enrollment
- **Content:**
  - Welcome message
  - Student ID and enrollment details
  - Batch information
  - Portal access link
  - Support contact

#### Payment Received (`payment-received`)
- **Trigger:** Payment successfully recorded
- **Content:**
  - Payment confirmation
  - Amount and method
  - Transaction ID
  - Remaining balance
  - Payment history link

#### Payment Reminder (`payment-reminder`)
- **Trigger:** Overdue payment (automated cron job)
- **Content:**
  - Outstanding balance
  - Days overdue
  - Payment options (bank transfer, UPI, cash)
  - Urgency message

#### Batch Start Notification (`batch-start`)
- **Trigger:** Student assigned to new batch
- **Content:**
  - Batch details (code, level, schedule)
  - Start date
  - Instructor info
  - What to bring
  - Batch portal link

#### Attendance Alert (`attendance-alert`)
- **Trigger:** Attendance falls below 50% (automated cron job)
- **Content:**
  - Current attendance percentage
  - Classes attended/total
  - Importance of attendance
  - Support contact

#### Referral Payout (`referral-payout`)
- **Trigger:** Referral payout processed
- **Content:**
  - Payout amount
  - Referee name
  - Payment method
  - Referral program details
  - Tracking link

#### Month Completion (`month-complete`)
- **Trigger:** Student completes month with ≥50% attendance (automated cron job)
- **Content:**
  - Congratulations message
  - Progress summary
  - Attendance stats
  - What's next
  - Tips for success

### 3. Automated Email Triggers ✓

#### Immediate Triggers (Event-Based)

**Student Enrollment:**
- File: `app/api/students/route.ts`
- Sends: Welcome email
- Condition: Email provided

**Payment Recording:**
- File: `app/api/payments/route.ts`
- Sends: Payment received confirmation
- Condition: Payment status = COMPLETED

**Referral Payout:**
- File: `app/api/referrals/[id]/route.ts`
- Sends: Payout notification to referrer
- Condition: Payout status changed to PAID

#### Scheduled Triggers (Cron Jobs)

**Payment Reminders:**
- File: `app/api/cron/payment-reminders/route.ts`
- Frequency: Daily recommended
- Target: Students with `paymentStatus = OVERDUE`
- Condition: Balance > 0 AND email provided

**Attendance Alerts:**
- File: `app/api/cron/attendance-alerts/route.ts`
- Frequency: Weekly recommended
- Target: Active students with attendance < 50%
- Condition: Total classes ≥ 4

**Month Completion:**
- File: `app/api/cron/month-completion/route.ts`
- Frequency: Daily recommended
- Target: Students enrolled 30 days ago with ≥50% attendance
- Actions:
  - Send month completion email
  - Update referral status to month1Complete
  - Trigger referral payout eligibility

### 4. Email Preferences System ✓

#### Database Schema
Added to Student model in `prisma/schema.prisma`:
```prisma
emailNotifications Boolean @default(true)  // Master toggle
emailWelcome       Boolean @default(true)  // Welcome emails
emailPayment       Boolean @default(true)  // Payment confirmations/reminders
emailAttendance    Boolean @default(true)  // Attendance alerts
emailBatch         Boolean @default(true)  // Batch notifications
emailReferral      Boolean @default(true)  // Referral payouts
```

#### API Endpoints
- **GET** `/api/students/[id]/email-preferences` - Fetch preferences
- **PUT** `/api/students/[id]/email-preferences` - Update preferences

#### Logic
All email sending respects student preferences:
1. Check `emailNotifications` (master toggle)
2. Check specific preference (e.g., `emailPayment`)
3. Only send if both are true

## Configuration

### Environment Variables

Required in `.env`:
```bash
# Resend API
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="Plan Beta <noreply@planbeta.in>"
SUPPORT_EMAIL="support@planbeta.in"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
UPI_ID="planbeta@paytm"

# Cron Job Security
CRON_SECRET="your-cron-secret-key-here"
```

### Setting Up Resend

1. Sign up at https://resend.com
2. Verify your domain (planbeta.in)
3. Create API key
4. Add to `.env` as `RESEND_API_KEY`

### Setting Up Cron Jobs

For production, use a service like Vercel Cron, Railway Cron, or external cron service:

**Daily Payment Reminders:**
```bash
curl -X POST https://yourdomain.com/api/cron/payment-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

**Daily Month Completion Check:**
```bash
curl -X POST https://yourdomain.com/api/cron/month-completion \
  -H "Authorization: Bearer your-cron-secret"
```

**Weekly Attendance Alerts:**
```bash
curl -X POST https://yourdomain.com/api/cron/attendance-alerts \
  -H "Authorization: Bearer your-cron-secret"
```

## Email Flow Examples

### New Student Journey
1. **Day 0:** Welcome email (on enrollment)
2. **Day 0-30:** Payment confirmations (on each payment)
3. **Day 10:** Payment reminder (if balance > 0)
4. **Day 15:** Batch start notification (when assigned)
5. **Day 20:** Attendance alert (if < 50%)
6. **Day 30:** Month completion email (if ≥50% attendance)

### Referral Program Flow
1. **Referral Created:** No email
2. **Referee Enrolls:** Welcome email to referee
3. **Day 30:** Month completion check
   - If ≥50% attendance: Mark `month1Complete = true`
   - Set `payoutStatus = PENDING`
4. **Payout Processed:** Referral payout email to referrer

## Testing

### Manual Email Testing

Send test email:
```typescript
import { sendEmail } from '@/lib/email'

await sendEmail('student-welcome', {
  to: 'test@example.com',
  studentName: 'Test Student',
  studentId: '2024-01-001',
  level: 'A1',
  batchCode: 'A1-MON-WED',
  startDate: '2024-01-15'
})
```

### Cron Job Testing

Test locally with authorization header:
```bash
curl -X POST http://localhost:3000/api/cron/payment-reminders \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

## Email Analytics

Track email performance:
- **Delivery rate:** Monitor via Resend dashboard
- **Open rates:** Enable tracking in Resend settings
- **Click rates:** Track portal/payment link clicks
- **Bounce rate:** Monitor bounced emails

## Cost Estimate

**Resend Pricing:**
- Free tier: 3,000 emails/month
- Pro: $20/month for 50,000 emails
- Enterprise: Custom pricing

**Estimated Usage (100 students):**
- Welcome: 100/month
- Payment confirmations: 200/month (avg 2 payments/student)
- Payment reminders: 150/month
- Attendance alerts: 50/month
- Month completions: 80/month
- Referral payouts: 20/month
- **Total: ~600 emails/month** (well within free tier)

## Best Practices

1. **Always check email preferences** before sending
2. **Include unsubscribe option** in template footer
3. **Log all email sends** for debugging
4. **Handle failures gracefully** - don't block critical operations
5. **Batch emails** when sending to multiple recipients
6. **Rate limit** to avoid spam filters
7. **Use transaction emails** for immediate actions
8. **Use cron jobs** for scheduled notifications

## Troubleshooting

### Email not sending?
1. Check `RESEND_API_KEY` is set correctly
2. Verify student has email address
3. Check email preferences are enabled
4. Review console logs for errors
5. Check Resend dashboard for delivery status

### Cron job not triggering?
1. Verify `CRON_SECRET` matches
2. Check authorization header format
3. Review cron job logs
4. Test endpoint manually with curl

### Wrong email content?
1. Verify template data is correct
2. Check date formatting
3. Review template in `lib/email.ts`

## Future Enhancements

- [ ] Email queue system for reliability
- [ ] Email templates in admin panel (no-code editing)
- [ ] SMS integration for critical notifications
- [ ] Multi-language email support
- [ ] A/B testing for email content
- [ ] Email analytics dashboard
- [ ] Webhook for email events (opens, clicks)
- [ ] Email scheduling (send at specific time)

## Security Considerations

1. **API Key Protection:** Never expose `RESEND_API_KEY` in client code
2. **Cron Security:** Use `CRON_SECRET` to prevent unauthorized triggers
3. **Rate Limiting:** Implement to prevent abuse
4. **Email Validation:** Validate email addresses before sending
5. **Data Privacy:** Only include necessary information in emails
6. **Unsubscribe:** Provide easy opt-out mechanism

## Support

For issues or questions:
- Review Resend docs: https://resend.com/docs
- Check email logs in Resend dashboard
- Contact Resend support for delivery issues
- Review this documentation for troubleshooting

---

**Email Automation System Status:** ✅ Complete and Production Ready

**Last Updated:** 2024
**Version:** 1.0.0
