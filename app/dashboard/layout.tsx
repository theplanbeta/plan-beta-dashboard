"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { getAllowedNavigation } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [overdueCount, setOverdueCount] = useState(0)

  // Get role-based navigation
  const userRole = (session?.user?.role as UserRole) || 'TEACHER'
  const navigation = getAllowedNavigation(userRole)

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
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary">Plan Beta</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const showBadge = item.name === "Leads" && overdueCount > 0

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
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

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.role}
                </p>
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
      <div className="pl-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
