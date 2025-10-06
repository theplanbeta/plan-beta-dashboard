# Vercel Deployment Guide - Plan Beta Dashboard

## ✅ Repository Already Connected

The repository `https://github.com/theplanbeta/invoice` is already deployed on Vercel and will automatically redeploy with the latest dashboard code.

---

## 🔧 Required Environment Variables

Add these to your Vercel project settings at: https://vercel.com/theplanbeta/invoice/settings/environment-variables

### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### Authentication
```env
NEXTAUTH_URL="https://your-production-domain.vercel.app"
NEXTAUTH_SECRET="your-generated-secret-here"
```

To generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Email (Optional - for automated notifications)
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="Plan Beta <noreply@planbeta.in>"
```

---

## 📊 Database Setup

### Option 1: Vercel Postgres (Recommended)
1. Go to your Vercel project
2. Click "Storage" → "Create Database" → "Postgres"
3. Connect to project
4. Environment variable `DATABASE_URL` will be auto-added

### Option 2: External PostgreSQL (Neon, Supabase, etc.)
1. Create a PostgreSQL database
2. Copy the connection string
3. Add as `DATABASE_URL` in Vercel environment variables

### Initialize Database Schema
After deployment, run migrations:
```bash
# From your local machine
npx prisma migrate deploy

# Or from Vercel CLI
vercel env pull
npx prisma migrate deploy
```

---

## 🎯 Post-Deployment Steps

### 1. Run Database Seed (Optional - for test data)
```bash
npx tsx prisma/seed-test.ts
```

This creates:
- 1 Founder account: `admin@planbeta.in` / `admin123`
- 2 Teacher accounts
- 1 Marketing account: `marketing@planbeta.in` / `admin123` (Sree - Red Collage)

### 2. Or Create Admin User Manually
```bash
npx tsx scripts/create-admin.ts
```

### 3. Update NEXTAUTH_URL
After first deployment, update `NEXTAUTH_URL` with your actual Vercel URL:
```
https://invoice-abc123.vercel.app
```

---

## 🚀 Automatic Deployment

Vercel will automatically:
1. Detect the push to `main` branch
2. Install dependencies
3. Run `npm run build`
4. Deploy the application

---

## 🔍 Verify Deployment

After deployment:
1. Visit your Vercel URL
2. You should see the login page
3. Login with `admin@planbeta.in` / `admin123`
4. Check that all features work:
   - ✅ Dashboard loads
   - ✅ Students page accessible
   - ✅ Invoice generation works (PDF & JPG)
   - ✅ Leads management works
   - ✅ Marketing can generate invoices

---

## ⚠️ Important Notes

### Database Migrations
When you push schema changes:
```bash
# Create migration locally
npx prisma migrate dev --name your_migration_name

# Push to git
git add .
git commit -m "Add migration: your_migration_name"
git push

# After Vercel deploys, run:
npx prisma migrate deploy
```

### Environment Variables Changes
After updating environment variables in Vercel:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"

---

## 🔐 Security Checklist

- [ ] `NEXTAUTH_SECRET` is set and unique
- [ ] `DATABASE_URL` uses SSL connection (`?sslmode=require`)
- [ ] Production database has strong password
- [ ] Default admin password changed after first login
- [ ] Test user accounts removed or passwords changed

---

## 📱 What's Deployed

This dashboard includes:
- ✅ Complete student management system
- ✅ Batch management
- ✅ Payment tracking
- ✅ **Invoice generation (PDF & JPG)** - Replaces old invoice generator
- ✅ Lead management
- ✅ Attendance tracking
- ✅ Referral program
- ✅ Role-based access control
- ✅ Analytics & insights
- ✅ Email automation

The old invoice generator is now part of this complete dashboard system.

---

## 🆘 Troubleshooting

### Build Fails
Check Vercel build logs for errors. Common issues:
- Missing environment variables
- TypeScript errors
- Database connection issues

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Check if database allows connections from Vercel IPs
- Ensure SSL mode is set correctly

### Login Not Working
- Verify `NEXTAUTH_URL` matches your deployment URL
- Check `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again

---

## 📞 Support

For issues, check:
1. Vercel deployment logs
2. Browser console for errors
3. Database connection status
4. Environment variables are set correctly
