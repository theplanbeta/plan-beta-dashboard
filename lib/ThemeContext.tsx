"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with 'light' to avoid hydration mismatch
  // The blocking script in layout.tsx handles the initial theme
  const [theme, setTheme] = useState<Theme>('light')
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    // Sync with actual DOM state after hydration
    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    // Derive from DOM to avoid stale state on first click
    const currentlyDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
    const newTheme = currentlyDark ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }

    // Announce theme change to screen readers
    setAnnouncement(`Switched to ${newTheme} mode`)
    setTimeout(() => setAnnouncement(''), 1000)
  }

  // Always provide context, even before mounted
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Return default values instead of throwing during SSR
    return {
      theme: 'light' as Theme,
      toggleTheme: () => {}
    }
  }
  return context
}
