# 📦 Backup System Documentation

## Overview

The Plan Beta Dashboard has a multi-layered automated backup system that ensures your data is regularly backed up via email.

---

## 🔄 Backup Triggers

### 1. **Login Trigger** (Original)
- **When**: User logs in with password
- **Limitation**: Doesn't trigger on PWA session restoration
- **Cooldown**: 30 minutes
- **Code**: `lib/auth.ts:42-70`

### 2. **Dashboard Load Trigger** (New - Solves PWA Issue)
- **When**: Founder loads any dashboard page
- **Works with**: PWA auto-login sessions
- **Cooldown**: 30 minutes (shared with login trigger)
- **Code**: `app/dashboard/layout.tsx:89-113`
- **Benefit**: Ensures backups even when users stay logged in for days

### 3. **Manual Trigger**
- **Who**: Founder only
- **Where**: "Backup Database" button in sidebar
- **Cooldown**: 30 minutes
- **UI**: Shows success/skip message

### 4. **Scheduled Trigger** (Recommended for Production)
- **When**: Daily at 2:00 AM UTC
- **Platform**: Vercel Cron
- **Config**: `vercel.json`
- **Benefit**: Guaranteed daily backup regardless of user activity

---

## 🛡️ Backup Contents

Each backup includes:
- ✅ Users (3 users)
- ✅ Students
- ✅ Leads
- ✅ Batches
- ✅ Payments
- ✅ Referrals
- ✅ Attendance records
- ✅ Invoices
- ✅ Audit logs (last 1000)

**Format**: JSON file with timestamp
**Delivery**: Email to `hello@planbeta.in` with attachment
**File naming**: `backup-YYYY-MM-DDTHH-mm-ss.json`

---

## ⚙️ Setup Instructions

### For Development (Local)
1. Backups trigger automatically on:
   - Login
   - Dashboard load (Founder only)
   - Manual button click
2. Check terminal for logs:
   - `🔄 Triggering backup on login...`
   - `✅ Auto-backup completed on dashboard load`
   - `⏭️ Backup skipped (recent backup exists)`

### For Production (Vercel)

#### Option 1: Vercel Cron (Recommended)
1. Deploy to Vercel
2. Vercel automatically detects `vercel.json`
3. Cron runs daily at 2 AM UTC
4. **No additional setup needed**

#### Option 2: External Cron Service (Alternative)
If Vercel Cron isn't available on your plan:

1. **Use cron-job.org or similar**:
   - URL: `https://your-domain.vercel.app/api/cron/backup`
   - Method: POST
   - Schedule: Daily at preferred time
   - Headers: None needed (cooldown prevents spam)

2. **Or use GitHub Actions**:
   ```yaml
   name: Daily Backup
   on:
     schedule:
       - cron: '0 2 * * *'  # 2 AM UTC daily
   jobs:
     backup:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger backup
           run: curl -X POST https://your-domain.vercel.app/api/cron/backup
   ```

---

## 🔍 Monitoring

### Check Backup Logs
```bash
# View recent backups in database
npx tsx -e "
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const logs = await prisma.auditLog.findMany({
    where: { description: { contains: 'backup' } },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log('Recent backups:')
  logs.forEach(log => console.log(\`- \${log.createdAt}: \${log.description}\`))
  await prisma.\$disconnect()
}
check()
"
```

### Email Verification
- Check `hello@planbeta.in` inbox
- Subject: "Database Backup - [timestamp]"
- Attachment: `backup-*.json`

### Vercel Logs
- Go to Vercel Dashboard → Your Project → Logs
- Filter for `/api/cron/backup`
- Check for 200 status codes

---

## 🚨 Troubleshooting

### Backup Not Triggering

**Problem**: No backup after login
- **Cause**: PWA session restoration (no password typed)
- **Solution**: Dashboard load trigger now handles this ✅

**Problem**: "Backup skipped" message
- **Cause**: Recent backup exists (within 30 minutes)
- **Solution**: Wait 30 minutes or check email for recent backup

**Problem**: No backup emails received
- **Check**:
  1. `RESEND_API_KEY` in environment variables
  2. `SUPPORT_EMAIL` is correct
  3. Resend dashboard for delivery status
  4. Spam/junk folder

### Vercel Cron Not Running

**Problem**: Cron not executing
- **Check**:
  1. `vercel.json` is in root directory
  2. File committed to git and pushed
  3. Vercel plan supports cron (Hobby tier: 1 cron, Pro: unlimited)
  4. View cron logs in Vercel Dashboard → Cron Jobs

---

## 🎯 Best Practices

1. **Keep cooldown at 30 minutes** - Prevents email spam
2. **Check email weekly** - Verify backups are being sent
3. **Store backups offline** - Download important backups from email
4. **Test restore process** - Use `scripts/restore-database.ts` periodically
5. **Monitor Resend quota** - Free tier: 100 emails/day

---

## 📊 Backup Strategy Summary

| Trigger | Frequency | Covers |
|---------|-----------|--------|
| Login | On password login | Active users who log out/in |
| Dashboard Load | Every dashboard visit | PWA users with persistent sessions |
| Manual Button | On-demand | Emergency/testing |
| Vercel Cron | Daily 2 AM UTC | Guaranteed daily backup |

**Result**: Multiple backup triggers ensure data is protected even if users stay logged in for extended periods.

---

## 🔐 Security Notes

- Backups contain sensitive data (encrypted passwords are bcrypt hashed)
- Email delivery is over TLS
- Store downloaded backups securely
- Backup endpoint has no authentication (relies on cooldown)
- Consider adding CRON_SECRET validation for production

---

## 📝 Next Steps

1. ✅ Deploy to Vercel (auto-enables cron)
2. ✅ Test backup received in email
3. ✅ Set calendar reminder to check backups weekly
4. 🔄 Consider adding CRON_SECRET for backup endpoint security
5. 🔄 Test restore process with a backup file

---

**Last Updated**: October 11, 2025
**Version**: 2.0 (PWA-compatible)
