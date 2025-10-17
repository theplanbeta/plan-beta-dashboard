# Domain Configuration Guide: planbeta.app

## Overview
This guide will help you configure your new domain `planbeta.app` to replace `plan-beta-dashboard.vercel.app`.

## Step 1: Update Environment Variables in Vercel Dashboard

### Method A: Using Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `plan-beta-dashboard`
3. Go to **Settings** → **Environment Variables**
4. Update the following variables:

   **NEXTAUTH_URL**
   - Environment: Production
   - Value: `https://planbeta.app`
   - Click **Save**

   **NEXT_PUBLIC_APP_URL**
   - Environment: Production
   - Value: `https://planbeta.app`
   - Click **Save**

### Method B: Using Vercel CLI (Alternative)
Run these commands in your terminal:

```bash
# Remove old values (confirm with 'y' when prompted)
vercel env rm NEXTAUTH_URL production
vercel env rm NEXT_PUBLIC_APP_URL production

# Add new values
vercel env add NEXTAUTH_URL production
# When prompted, enter: https://planbeta.app

vercel env add NEXT_PUBLIC_APP_URL production
# When prompted, enter: https://planbeta.app
```

## Step 2: Add Custom Domain in Vercel

### Using Vercel Dashboard (Recommended)
1. Go to your project in Vercel Dashboard
2. Click on **Settings** → **Domains**
3. Click **Add** button
4. Enter: `planbeta.app`
5. Click **Add**
6. Also add `www.planbeta.app` (recommended)

### Using Vercel CLI
```bash
vercel domains add planbeta.app
vercel domains add www.planbeta.app
```

## Step 3: Configure DNS Records

After adding the domain in Vercel, you'll be given DNS instructions. Typically you need to add:

### For apex domain (planbeta.app):

**Option A: A Record (Recommended)**
```
Type: A
Name: @ (or leave empty, or planbeta.app)
Value: 76.76.21.21
TTL: 3600 (or Auto)
```

**Option B: CNAME (if your registrar supports CNAME flattening)**
```
Type: CNAME
Name: @ (or leave empty)
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

### For www subdomain:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

## Step 4: Verify DNS Configuration

After adding DNS records, wait 5-30 minutes for propagation, then verify:

```bash
# Check A record
dig planbeta.app

# Check www CNAME
dig www.planbeta.app
```

You should see:
- `planbeta.app` → `76.76.21.21`
- `www.planbeta.app` → `cname.vercel-dns.com`

## Step 5: Redeploy Your Application

After environment variables are updated:

```bash
# Trigger a new production deployment
vercel --prod
```

Or push a new commit to trigger automatic deployment:

```bash
git commit --allow-empty -m "Trigger deployment for new domain"
git push
```

## Step 6: Test the New Domain

Once deployment is complete and DNS has propagated:

1. Visit `https://planbeta.app`
2. Test login functionality
3. Verify password reset emails use correct domain
4. Check that all links in emails point to new domain

## Step 7: Update Email Domain (Optional)

Consider updating your Resend email domain:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add and verify `planbeta.app` domain
3. Update `.env` variable:
   ```
   EMAIL_FROM="Plan Beta <noreply@planbeta.app>"
   ```
4. Update in Vercel environment variables

## Step 8: Redirect Old Domain (Optional)

To automatically redirect from old domain to new:

1. Keep `plan-beta-dashboard.vercel.app` as a domain
2. Vercel will automatically redirect if `planbeta.app` is set as primary

## Verification Checklist

- [ ] Environment variables updated in Vercel
- [ ] Domain added in Vercel
- [ ] DNS records configured at registrar
- [ ] DNS propagation complete (check with `dig`)
- [ ] Application redeployed
- [ ] Can access site at `https://planbeta.app`
- [ ] Login works correctly
- [ ] Password reset emails show correct domain
- [ ] All email links point to new domain

## Troubleshooting

### Issue: "Invalid Domain Configuration"
- Check DNS records are correct
- Wait for DNS propagation (up to 48 hours, usually 5-30 minutes)
- Verify domain ownership in registrar

### Issue: "NEXTAUTH_URL Mismatch"
- Ensure `NEXTAUTH_URL` exactly matches your domain: `https://planbeta.app` (no trailing slash)
- Redeploy after changing environment variables

### Issue: Email links still use old domain
- Check `NEXT_PUBLIC_APP_URL` in Vercel dashboard
- Ensure new deployment has been triggered after changing variables
- Clear any email template caches

## DNS Registrar-Specific Guides

### GoDaddy
1. Log in to GoDaddy
2. My Products → DNS
3. Add records as specified above

### Namecheap
1. Log in to Namecheap
2. Domain List → Manage → Advanced DNS
3. Add records as specified above

### Cloudflare
1. Log in to Cloudflare
2. Select domain → DNS
3. Add records (ensure proxy is OFF for initial setup)

## Questions?

If you encounter any issues, check:
1. Vercel deployment logs
2. DNS propagation: https://www.whatsmydns.net/#A/planbeta.app
3. Vercel docs: https://vercel.com/docs/concepts/projects/domains
