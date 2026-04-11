"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Briefcase, FileText, KanbanSquare, User } from "lucide-react"

const tabs = [
  { label: "Home", href: "/jobs-app", icon: Home },
  { label: "Jobs", href: "/jobs-app/jobs", icon: Briefcase },
  { label: "CVs", href: "/jobs-app/cvs", icon: FileText },
  { label: "Tracker", href: "/jobs-app/applications", icon: KanbanSquare },
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
    <nav
      className="amtlich-filetab-row fixed bottom-0 left-0 right-0 z-50 pb-safe"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-end pt-3 pb-2">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`amtlich-filetab flex flex-1 flex-col items-center justify-end py-1 ${
                active ? "amtlich-filetab--active" : ""
              }`}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.7}
                className="relative z-10 shrink-0"
                aria-hidden="true"
              />
              <span className="label relative z-10">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
