"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Briefcase, FileText, KanbanSquare, User } from "lucide-react"

const tabs = [
  { label: "Home", href: "/jobs-app", icon: Home },
  { label: "Jobs", href: "/jobs-app/jobs", icon: Briefcase },
  { label: "My CVs", href: "/jobs-app/cvs", icon: FileText },
  { label: "Applications", href: "/jobs-app/applications", icon: KanbanSquare },
  { label: "Profile", href: "/jobs-app/profile", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/jobs-app") {
      return pathname === "/jobs-app"
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="max-w-lg mx-auto flex items-stretch">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className="shrink-0"
              />
              <span className="leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
