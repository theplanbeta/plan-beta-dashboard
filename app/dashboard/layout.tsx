"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getAllowedNavigation } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"
import PWAInstallPrompt from "@/components/PWAInstallPrompt"

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

  // Get role-based navigation
  const userRole = (session?.user?.role as UserRole) || 'TEACHER'
  const navigation = getAllowedNavigation(userRole)

  // Check if we should show back button (not on dashboard home)
  const showBackButton = pathname !== '/dashboard'

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Header with Back Button & Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-primary">Plan Beta</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                        isActive ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
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
              <div className="p-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 truncate mb-3">{session?.user?.role}</p>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary">Plan Beta</h1>
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
                    isActive ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
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
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{session?.user?.role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="ml-3 text-sm text-gray-500 hover:text-gray-700"
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {/* Home/Dashboard */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
              pathname === '/dashboard' ? "bg-primary/10 text-primary" : "text-gray-600"
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
                  isActive ? "bg-primary/10 text-primary" : "text-gray-600"
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
