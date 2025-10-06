# 🚀 Production Monitoring & Observability Guide

**Date:** October 6, 2025
**Version:** 1.0
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Audit Logging System](#audit-logging-system)
3. [Error Tracking (Sentry)](#error-tracking-sentry)
4. [System Health Monitoring](#system-health-monitoring)
5. [Activity Dashboard](#activity-dashboard)
6. [Critical Operations Tracked](#critical-operations-tracked)
7. [Alert Configuration](#alert-configuration)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Plan Beta Dashboard has comprehensive monitoring to ensure **zero data loss** and **complete observability** for all high-value operations including:

- Invoice generation
- Payment processing
- Lead-to-student conversions
- Database transactions

### Key Features:

✅ **Complete Audit Trail** - Every action logged with who, what, when, where
✅ **Real-time Monitoring** - Activity dashboard with auto-refresh
✅ **Error Tracking** - Sentry integration for production errors
✅ **System Health** - Automated health checks and metrics
✅ **IP Tracking** - Know exactly who performed each action
✅ **Transaction Logging** - Full visibility into financial operations

---

## 📝 Audit Logging System

### Database Schema

All audit logs are stored in the `AuditLog` table with the following information:

```prisma
model AuditLog {
  action        AuditAction       // What happened
  severity      AuditSeverity     // INFO, WARNING, ERROR, CRITICAL
  description   String            // Human-readable description

  // Who performed the action
  userId        String?
  userEmail     String?
  userName      String?
  ipAddress     String?
  userAgent     String?

  // What was affected
  entityType    String?           // "Lead", "Invoice", "Student", etc.
  entityId      String?

  // Additional context
  metadata      Json?             // Before/after values, transaction details

  // Error tracking
  errorMessage  String?
  errorStack    String?

  // Timestamps
  createdAt     DateTime
}
```

### Using Audit Logs

**In API endpoints:**

```typescript
import { logSuccess, logError, logCritical } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// Log successful action
await logSuccess(
  AuditAction.INVOICE_GENERATED,
  `Invoice ${invoiceNumber} generated for ${studentName}`,
  {
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      amount: totalAmount,
      currency: 'EUR',
    },
    request: req, // Captures IP, user agent, etc.
  }
)

// Log error
await logError(
  AuditAction.API_ERROR,
  `Failed to process payment`,
  error,
  {
    entityType: 'Payment',
    entityId: paymentId,
    request: req,
  }
)

// Log critical error (high-value transaction failure)
await logCritical(
  AuditAction.LEAD_TO_STUDENT_CONVERSION,
  `CRITICAL: Conversion failed mid-transaction`,
  error,
  {
    entityType: 'Lead',
    entityId: leadId,
    metadata: { paidAmount, invoiceNumber },
    request: req,
  }
)
```

### Audit Actions Tracked

#### Authentication
- `LOGIN` - User logged in
- `LOGOUT` - User logged out
- `LOGIN_FAILED` - Failed login attempt

#### Lead Management
- `LEAD_CREATED` - New lead added
- `LEAD_UPDATED` - Lead information changed
- `LEAD_DELETED` - Lead removed
- `LEAD_CONVERTED` - Lead converted to student

#### Invoice Management
- `INVOICE_GENERATED` - Invoice created for lead
- `INVOICE_SENT` - Invoice sent via email
- `INVOICE_UPDATED` - Invoice modified
- `INVOICE_CANCELLED` - Invoice cancelled

#### Payment & Conversion
- `PAYMENT_RECEIVED` - Payment recorded
- `STUDENT_CREATED` - Student account created
- `LEAD_TO_STUDENT_CONVERSION` - Full conversion process

#### System Events
- `SYSTEM_ERROR` - System-level error
- `DATABASE_ERROR` - Database operation failed
- `API_ERROR` - API endpoint error
- `EMAIL_SENT` - Email successfully sent
- `EMAIL_FAILED` - Email failed to send

---

## 🔍 Error Tracking (Sentry)

### Setup

1. **Get Sentry DSN** from sentry.io
2. **Add to `.env.local`:**

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

3. **Sentry is automatically configured** in:
   - `sentry.client.config.ts` - Frontend errors
   - `sentry.server.config.ts` - Backend errors

### Features

✅ **Automatic Error Capture** - All uncaught errors sent to Sentry
✅ **Source Maps** - See exact line of code that failed
✅ **User Context** - Know which user experienced the error
✅ **Session Replay** - Watch what user did before error
✅ **Performance Monitoring** - Track slow API calls

### Error Filtering

Sentry is configured to:
- ❌ **NOT send errors in development** (keeps logs clean)
- ✅ **Filter out cookies** (security)
- ✅ **Mask authorization headers** (security)
- ✅ **Include environment info** (production vs staging)

---

## ❤️ System Health Monitoring

### Health Check Endpoint

**URL:** `/api/system/health`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-06T12:00:00Z",
  "responseTime": "45ms",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "databasePerformance": {
      "status": "healthy",
      "queryTime": "12ms",
      "threshold": "1000ms"
    },
    "errorRate": {
      "status": "healthy",
      "errorRate": "0.5%",
      "errors": 2,
      "critical": 0,
      "total": 400,
      "period": "last 1 hour"
    },
    "systemMetrics": {
      "status": "healthy",
      "students": 125,
      "leads": 340,
      "invoices": 89,
      "payments": 156
    },
    "recentActivity": {
      "status": "healthy",
      "conversions": 12,
      "payments": 18,
      "period": "last 24 hours"
    }
  }
}
```

### Health Status Levels

- **`healthy`** - All systems operational
- **`degraded`** - System working but with warnings
- **`unhealthy`** - Critical issues detected

### Monitoring Checks

1. **Database Connection** - Can we connect to Postgres?
2. **Query Performance** - Are queries responding in <1s?
3. **Error Rate** - Are we seeing <5% errors?
4. **System Metrics** - Data counts across entities
5. **Recent Activity** - Conversions/payments in last 24h

---

## 📊 Activity Dashboard

**URL:** `/dashboard/activity` (Founders only)

### Features

✅ **Real-time Feed** - See every action as it happens
✅ **Auto-refresh** - Updates every 10 seconds
✅ **Error Filtering** - View only errors/critical issues
✅ **24h Statistics** - Summary of all actions
✅ **Top Actions** - Most frequent operations
✅ **User Tracking** - See who performed each action
✅ **IP Addresses** - Know where actions came from

### View Modes

1. **All Activity** - Every logged action
2. **Errors Only** - Only WARNING, ERROR, CRITICAL

### Statistics Panel

- **Total Events (24h)** - All logged actions
- **Errors** - Non-critical failures
- **Critical** - High-priority failures
- **Warnings** - Potential issues

---

## 🎯 Critical Operations Tracked

### 1. Invoice Generation

**Endpoint:** `POST /api/leads/[id]/invoice`

**Logged:**
- ✅ Invoice created successfully
- ❌ Invoice generation failed

**Metadata:**
- Lead name and ID
- Invoice number
- Currency and amounts
- Payable now vs remaining

### 2. Payment & Conversion

**Endpoint:** `POST /api/invoices/[id]/pay-and-convert`

**Logged:**
- ✅ Conversion started
- ✅ Payment received
- ✅ Student created
- ✅ Lead marked as converted
- ❌ Conversion failed (CRITICAL)

**Metadata:**
- All transaction details
- Before/after states
- Student ID generated
- Payment amounts

### 3. Lead Operations

**Endpoints:** `/api/leads/*`

**Logged:**
- Lead created
- Lead updated
- Lead deleted
- Lead converted

---

## 🚨 Alert Configuration

### Recommended Alerts

**1. Critical Errors**
- Trigger: Any `CRITICAL` severity log
- Action: Immediate email/SMS to founder
- Example: Failed payment or conversion

**2. High Error Rate**
- Trigger: >10% errors in last hour
- Action: Email notification
- Check: `/api/system/health` errorRate

**3. Database Performance**
- Trigger: Query time >2 seconds
- Action: Performance investigation
- Check: `/api/system/health` databasePerformance

**4. No Recent Activity**
- Trigger: 0 conversions/payments in 48h
- Action: Check system status
- Check: `/api/system/health` recentActivity

### Integration Options

**Email Alerts:**
- Use audit logs API to fetch recent CRITICAL logs
- Send daily digest of errors to founder

**Slack/Discord:**
- Webhook on CRITICAL errors
- POST to webhook with error details

**Uptime Monitoring:**
- Ping `/api/system/health` every 5 minutes
- Alert if response is not "healthy"

---

## 🔧 Troubleshooting

### How to investigate an error:

1. **Check Activity Dashboard** (`/dashboard/activity`)
   - Filter to "Errors Only"
   - Find the error event
   - Check IP address, user, entity affected

2. **Query Audit Logs via API**

```bash
# Get recent errors
GET /api/system/audit-logs?type=errors&limit=50

# Get stats
GET /api/system/audit-logs?type=stats
```

3. **Check System Health**

```bash
GET /api/system/health
```

4. **Check Sentry Dashboard**
   - Go to sentry.io
   - View error details, stack trace
   - Watch session replay

### Common Issues

**Error: "Audit logging failed"**
- Audit logging errors are logged to console but don't crash the app
- Check database connection
- Review `/lib/audit.ts` error handling

**Activity Dashboard shows no data**
- Check user role (only FOUNDER can access)
- Verify `/api/system/audit-logs` returns data
- Check browser console for errors

**Health check fails**
- Database connection issue
- Check `DATABASE_URL` env variable
- Test Prisma connection: `npx prisma db push`

---

## 📈 Production Deployment Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` in production environment
- [ ] Configure uptime monitoring for `/api/system/health`
- [ ] Set up email alerts for CRITICAL errors
- [ ] Test audit logging on staging environment
- [ ] Verify Activity Dashboard is accessible
- [ ] Review and adjust Sentry sample rates
- [ ] Set up daily error report email
- [ ] Document incident response process

---

## 🎉 Success! You now have:

✅ **Complete Audit Trail** - Never lose track of what happened
✅ **Real-time Monitoring** - See system activity as it happens
✅ **Error Tracking** - Catch and fix issues before users report them
✅ **System Health** - Know when something is wrong
✅ **Production Ready** - Robust, battle-tested monitoring

---

**Maintained by:** Plan Beta Development Team
**Last Updated:** October 6, 2025
**Questions?** Check `/app/dashboard/activity` or contact your development team
