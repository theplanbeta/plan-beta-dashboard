import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ActivityClient from './ActivityClient'

/**
 * Activity Dashboard Page (Founder-only)
 *
 * Defense-in-depth security:
 * 1. Middleware: /dashboard/activity blocked for non-FOUNDER
 * 2. Server Component: This auth check (redundant protection)
 * 3. API: /api/system/audit-logs returns 403 for non-FOUNDER
 */
export default async function ActivityPage() {
  const session = await getServerSession(authOptions)

  // Redundant auth check - middleware already guards this route
  // but defense-in-depth is good practice
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'FOUNDER') {
    notFound() // 404 instead of 403 to avoid information disclosure
  }

  return <ActivityClient />
}
