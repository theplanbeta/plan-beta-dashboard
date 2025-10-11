"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getAllowedNavigation } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"
import PWAInstallPrompt from "@/components/PWAInstallPrompt"
import { useTheme } from "@/lib/ThemeContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [overdueCount, setOverdueCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [backingUp, setBackingUp] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch for theme-dependent UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get role-based navigation
  const userRole = (session?.user?.role as UserRole) || 'TEACHER'
  const navigation = getAllowedNavigation(userRole)

  // Check if we should show back button (not on dashboard home)
  const showBackButton = pathname !== '/dashboard'

  // Manual backup handler
  const handleBackup = async () => {
    setBackingUp(true)
    setBackupMessage('')
    try {
      const res = await fetch('/api/cron/backup', { method: 'POST' })
      const data = await res.json()

      if (data.skipped) {
        setBackupMessage('Backup created recently')
      } else if (data.success) {
        setBackupMessage('✓ Backup sent to email')
      } else {
        setBackupMessage('❌ Backup failed')
      }
    } catch (error) {
      setBackupMessage('❌ Backup failed')
    } finally {
      setBackingUp(false)
      setTimeout(() => setBackupMessage(''), 3000)
    }
  }

  // Fetch overdue leads count
  useEffect(() => {
    const fetchOverdueCount = async () => {
      try {
        const res = await fetch('/api/leads')
        const leads = await res.json()

        if (Array.isArray(leads)) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const overdue = leads.filter(lead => {
            if (lead.converted || !lead.followUpDate) return false

            const followUp = new Date(lead.followUpDate)
            followUp.setHours(0, 0, 0, 0)

            return followUp < today
          })

          setOverdueCount(overdue.length)
        }
      } catch (error) {
        console.error('Error fetching overdue count:', error)
      }
    }

    fetchOverdueCount()
    // Refresh every 5 minutes
    const interval = setInterval(fetchOverdueCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Trigger backup on dashboard load (with cooldown)
  useEffect(() => {
    // Only trigger for FOUNDER role
    if (userRole !== 'FOUNDER') return

    const triggerBackupOnLoad = async () => {
      try {
        console.log('🔄 Checking backup status on dashboard load...')
        await fetch('/api/cron/backup', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.skipped) {
              console.log('⏭️  Backup skipped (recent backup exists)')
            } else if (data.success) {
              console.log('✅ Auto-backup completed on dashboard load')
            }
          })
      } catch (error) {
        console.error('❌ Auto-backup failed:', error)
        // Silently fail - not critical
      }
    }

    triggerBackupOnLoad()
  }, [userRole])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1e1e1e]">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Header with Back Button & Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-primary dark:text-blue-400">Plan Beta</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
            {...(mounted && { title: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode` })}
          >
            {!mounted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col h-full pt-16">
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  const showBadge = item.name === "Leads" && overdueCount > 0
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                        isActive ? "bg-primary dark:bg-blue-600 text-white" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span>{item.name}</span>
                      {showBadge && (
                        <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full ${
                          isActive ? "bg-white text-red-600" : "bg-red-600 text-white"
                        }`}>
                          {overdueCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-3">{session?.user?.role}</p>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary dark:text-blue-400">Plan Beta</h1>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
              {...(mounted && { title: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode` })}
            >
              {!mounted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const showBadge = item.name === "Leads" && overdueCount > 0
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive ? "bg-primary dark:bg-blue-600 text-white" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>{item.name}</span>
                  {showBadge && (
                    <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full ${
                      isActive ? "bg-white text-red-600" : "bg-red-600 text-white"
                    }`}>
                      {overdueCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* Backup Button - Only for FOUNDER */}
            {userRole === 'FOUNDER' && (
              <button
                onClick={handleBackup}
                disabled={backingUp}
                className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {backingUp ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Backing up...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Backup Database
                  </>
                )}
              </button>
            )}
            {backupMessage && (
              <p className="text-xs text-center text-gray-600 dark:text-gray-400">{backupMessage}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session?.user?.role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="ml-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-14 lg:pt-0 pb-16 lg:pb-0">
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {/* Home/Dashboard */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
              pathname === '/dashboard' ? "bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium mt-1">Home</span>
          </Link>

          {/* First 4 navigation items */}
          {navigation.slice(0, 4).map((item) => {
            const isActive = pathname === item.href
            const showBadge = item.name === "Leads" && overdueCount > 0
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors relative ${
                  isActive ? "bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {showBadge && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {overdueCount}
                  </span>
                )}
                <span className="text-xs font-medium mt-1">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
