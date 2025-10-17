#!/bin/bash

# Configuration script for new domain: planbeta.app
# This script will help you update environment variables for the new domain

echo "🌐 Configuring new domain: planbeta.app"
echo "========================================="
echo ""

NEW_DOMAIN="https://planbeta.app"

echo "Step 1: Updating environment variables in Vercel..."
echo ""
echo "You need to update the following environment variables in Vercel:"
echo "  - NEXTAUTH_URL: $NEW_DOMAIN"
echo "  - NEXT_PUBLIC_APP_URL: $NEW_DOMAIN"
echo ""

# Remove old variables
echo "Removing old NEXTAUTH_URL..."
echo "y" | vercel env rm NEXTAUTH_URL production

echo "Removing old NEXT_PUBLIC_APP_URL..."
echo "y" | vercel env rm NEXT_PUBLIC_APP_URL production

# Add new variables
echo ""
echo "Adding new environment variables..."

echo "$NEW_DOMAIN" | vercel env add NEXTAUTH_URL production

echo "$NEW_DOMAIN" | vercel env add NEXT_PUBLIC_APP_URL production

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "Step 2: Adding custom domain to Vercel..."
echo "Run: vercel domains add planbeta.app"
echo ""
echo "Step 3: Configure DNS records for planbeta.app"
echo "Add the following DNS records in your domain registrar:"
echo "  - Type: A"
echo "  - Name: @ (or planbeta.app)"
echo "  - Value: 76.76.21.21 (Vercel's IP)"
echo ""
echo "  OR"
echo ""
echo "  - Type: CNAME"
echo "  - Name: @ (or planbeta.app)"
echo "  - Value: cname.vercel-dns.com"
echo ""
echo "For www subdomain:"
echo "  - Type: CNAME"
echo "  - Name: www"
echo "  - Value: cname.vercel-dns.com"
echo ""
echo "Step 4: Redeploy your application"
echo "Run: vercel --prod"
echo ""
echo "✨ Done! Your new domain will be active once DNS propagates (usually 5-30 minutes)"
