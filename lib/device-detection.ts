// Device detection utilities for mobile optimization

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

  // Check for mobile-specific user agents (phones only, not tablets)
  const mobileRegex = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i

  // Exclude tablets
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook/i

  const isMobile = mobileRegex.test(userAgent)
  const isTablet = tabletRegex.test(userAgent)

  // Return true only for phones, not tablets
  return isMobile && !isTablet
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

  const mobileRegex = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook/i

  if (mobileRegex.test(userAgent) && !tabletRegex.test(userAgent)) {
    return 'mobile'
  } else if (tabletRegex.test(userAgent)) {
    return 'tablet'
  }

  return 'desktop'
}

export function getScreenSize(): 'small' | 'medium' | 'large' {
  if (typeof window === 'undefined') return 'large'

  const width = window.innerWidth

  if (width < 640) return 'small' // Mobile
  if (width < 1024) return 'medium' // Tablet
  return 'large' // Desktop
}
